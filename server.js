console.log(" Starting Expensy server...")

// Load environment variables first
require("dotenv").config()

const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

console.log(" All packages loaded successfully")

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

console.log(" Middleware configured")

// MongoDB connection with detailed logging
const connectDB = async () => {
  try {
    console.log(" Attempting to connect to MongoDB...")
    console.log(" MongoDB URI:", process.env.MONGODB_URI || "mongodb://localhost:27017/expensy")

    const conn = await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/expensy", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    console.log("Connected to MongoDB successfully")
    console.log("Database Name:", conn.connection.db.databaseName)
    console.log(" Connection Host:", conn.connection.host)
    console.log(" Connection State:", conn.connection.readyState) // 1 = connected

    // List existing collections
    const collections = await conn.connection.db.listCollections().toArray()
    console.log(
      "📋 Existing collections:",
      collections.map((c) => c.name),
    )
  } catch (error) {
    console.error(" MongoDB connection error:", error.message)
    console.log("💡 Make sure MongoDB is running on your system")
    process.exit(1) // Exit if can't connect to database
  }
}

// Connect to database
connectDB()

// MongoDB connection event listeners
mongoose.connection.on("connected", () => {
  console.log("Mongoose connected to MongoDB")
})

mongoose.connection.on("error", (err) => {
  console.log("Mongoose connection error:", err)
})

mongoose.connection.on("disconnected", () => {
  console.log("Mongoose disconnected")
})

// User Schema with logging
const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
  },
  { timestamps: true },
)

// Add pre-save middleware for logging
userSchema.pre("save", function (next) {
  console.log("About to save user:", this.email)
  next()
})

userSchema.post("save", (doc) => {
  console.log("User saved successfully:", doc.email, "ID:", doc._id)
})

// Transaction Schema with logging
const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
)

// Add pre-save middleware for transactions
transactionSchema.pre("save", function (next) {
  console.log("About to save transaction:", this.type, this.description, this.amount)
  next()
})

transactionSchema.post("save", (doc) => {
  console.log("Transaction saved successfully:", doc._id, doc.type, doc.amount)
})

// Budget Schema with logging
const budgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
)

budgetSchema.pre("save", function (next) {
  console.log("About to save budget:", this.amount, "for user:", this.userId)
  next()
})

budgetSchema.post("save", (doc) => {
  console.log("Budget saved successfully:", doc._id, doc.amount)
})

// Models
const User = mongoose.model("User", userSchema)
const Transaction = mongoose.model("Transaction", transactionSchema)
const Budget = mongoose.model("Budget", budgetSchema)

console.log("Database models created")

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here"

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    console.log("No token provided")
    return res.status(401).json({ message: "Access token required" })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log("Invalid token:", err.message)
      return res.status(403).json({ message: "Invalid or expired token" })
    }
    console.log(" Token verified for user:", user.email)
    req.user = user
    next()
  })
}

// Routes

// Health check with database status
app.get("/", (req, res) => {
  res.json({
    message: "Expensy API is running!",
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    database: mongoose.connection.db ? mongoose.connection.db.databaseName : "Not connected",
  })
})

app.get("/api/health", (req, res) => {
  res.json({
    message: " Server is running!",
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    database: mongoose.connection.db ? mongoose.connection.db.databaseName : "Not connected",
    env: process.env.NODE_ENV || "development",
  })
})

// Debug route to check collections
app.get("/api/debug/collections", async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray()
    const stats = {}

    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments()
      stats[collection.name] = count
    }

    res.json({
      collections: collections.map((c) => c.name),
      documentCounts: stats,
      connectionState: mongoose.connection.readyState,
      databaseName: mongoose.connection.db.databaseName,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Register with detailed logging
app.post("/api/auth/register", async (req, res) => {
  try {
    console.log(" Registration attempt started")
    console.log(" Email:", req.body.email)
    console.log("👤 Full Name:", req.body.fullName)
    console.log("Password length:", req.body.password ? req.body.password.length : 0)

    const { fullName, email, password } = req.body

    // Validation
    if (!fullName || !email || !password) {
      console.log("Missing required fields")
      return res.status(400).json({ message: "All fields are required" })
    }

    // Check if user exists
    console.log("🔍 Checking if user exists...")
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      console.log(" User already exists:", email)
      return res.status(400).json({ message: "User with this email already exists" })
    }
    console.log("User doesn't exist, proceeding with registration")

    // Hash password
    console.log("Hashing password...")
    const hashedPassword = await bcrypt.hash(password, 12)
    console.log("Password hashed successfully")

    // Create user
    console.log("Creating new user...")
    const user = new User({ fullName, email, password: hashedPassword })

    console.log("Attempting to save user to database...")
    const savedUser = await user.save()
    console.log("User saved with ID:", savedUser._id)

    // Generate token
    console.log("Generating JWT token...")
    const token = jwt.sign({ userId: savedUser._id, email: savedUser.email }, JWT_SECRET, { expiresIn: "7d" })

    console.log("Registration completed successfully for:", email)

    res.status(201).json({
      message: "User created successfully",
      token,
      user: { id: savedUser._id, fullName: savedUser.fullName, email: savedUser.email, createdAt: savedUser.createdAt },
    })
  } catch (error) {
    console.error("Registration error:", error)
    console.error("Error stack:", error.stack)
    res.status(500).json({ message: "Server error during registration", error: error.message })
  }
})

// Login with detailed logging
app.post("/api/auth/login", async (req, res) => {
  try {
    console.log("Login attempt started")
    console.log("Email:", req.body.email)

    const { email, password } = req.body

    // Find user
    console.log("🔍 Looking for user in database...")
    const user = await User.findOne({ email })
    if (!user) {
      console.log("User not found:", email)
      return res.status(400).json({ message: "Invalid email or password" })
    }
    console.log("User found:", user._id)

    // Check password
    console.log("🔐 Verifying password...")
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      console.log("Invalid password for:", email)
      return res.status(400).json({ message: "Invalid email or password" })
    }
    console.log("Password verified")

    // Generate token
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" })

    console.log("Login successful for:", email)

    res.json({
      message: "Login successful",
      token,
      user: { id: user._id, fullName: user.fullName, email: user.email, createdAt: user.createdAt },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Server error during login" })
  }
})

// Create transaction with detailed logging
app.post("/api/transactions", authenticateToken, async (req, res) => {
  try {
    console.log(" Transaction creation started")
    console.log("User ID:", req.user.userId)
    console.log("Transaction data:", req.body)

    const { type, description, category, amount } = req.body

    // Validation
    if (!type || !description || !category || !amount) {
      console.log(" Missing required fields for transaction")
      return res.status(400).json({ message: "All fields are required" })
    }

    if (!["income", "expense"].includes(type)) {
      console.log("Invalid transaction type:", type)
      return res.status(400).json({ message: "Type must be income or expense" })
    }

    if (amount <= 0) {
      console.log("Invalid amount:", amount)
      return res.status(400).json({ message: "Amount must be greater than 0" })
    }

    console.log("Transaction validation passed")

    const transaction = new Transaction({
      userId: req.user.userId,
      type,
      description: description.trim(),
      category: category.trim(),
      amount: Number.parseFloat(amount),
    })

    console.log(" Attempting to save transaction...")
    const savedTransaction = await transaction.save()
    console.log(" Transaction saved with ID:", savedTransaction._id)

    res.status(201).json({ message: "Transaction created successfully", transaction: savedTransaction })
  } catch (error) {
    console.error(" Transaction creation error:", error)
    console.error(" Error stack:", error.stack)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Get transactions with logging
app.get("/api/transactions", authenticateToken, async (req, res) => {
  try {
    console.log("Fetching transactions for user:", req.user.userId)

    const transactions = await Transaction.find({ userId: req.user.userId }).sort({ createdAt: -1 })
    console.log("Found", transactions.length, "transactions")

    res.json({ transactions })
  } catch (error) {
    console.error("Transactions fetch error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete transaction
app.delete("/api/transactions/:id", authenticateToken, async (req, res) => {
  try {
    console.log(" Deleting transaction:", req.params.id, "for user:", req.user.userId)

    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!transaction) {
      console.log(" Transaction not found for deletion")
      return res.status(404).json({ message: "Transaction not found" })
    }

    console.log("✅ Transaction deleted successfully")
    res.json({ message: "Transaction deleted successfully" })
  } catch (error) {
    console.error(" Transaction deletion error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get user profile
app.get("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password")
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    res.json(user)
  } catch (error) {
    console.error("Profile fetch error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update user profile
app.put("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const { fullName } = req.body
    const user = await User.findByIdAndUpdate(req.user.userId, { fullName }, { new: true }).select("-password")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({ message: "Profile updated successfully", user })
  } catch (error) {
    console.error("Profile update error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get budget
app.get("/api/budget", authenticateToken, async (req, res) => {
  try {
    const budget = await Budget.findOne({ userId: req.user.userId })
    res.json(budget || { amount: 0 })
  } catch (error) {
    console.error("Budget fetch error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Set budget
app.post("/api/budget", authenticateToken, async (req, res) => {
  try {
    console.log("💰 Setting budget for user:", req.user.userId, "Amount:", req.body.amount)

    const { amount } = req.body

    let budget = await Budget.findOne({ userId: req.user.userId })

    if (budget) {
      console.log("Updating existing budget")
      budget.amount = amount
      await budget.save()
    } else {
      console.log("Creating new budget")
      budget = new Budget({ userId: req.user.userId, amount })
      await budget.save()
    }

    console.log("Budget saved successfully")
    res.json({ message: "Budget updated successfully", budget })
  } catch (error) {
    console.error(" Budget update error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get analytics summary
app.get("/api/analytics/summary", authenticateToken, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.userId })

    const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)
    const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)
    const netBalance = totalIncome - totalExpenses

    // Category breakdown
    const incomeByCategory = {}
    const expensesByCategory = {}

    transactions.forEach((transaction) => {
      if (transaction.type === "income") {
        incomeByCategory[transaction.category] = (incomeByCategory[transaction.category] || 0) + transaction.amount
      } else {
        expensesByCategory[transaction.category] = (expensesByCategory[transaction.category] || 0) + transaction.amount
      }
    })

    res.json({
      totalIncome,
      totalExpenses,
      netBalance,
      totalTransactions: transactions.length,
      incomeByCategory,
      expensesByCategory,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
    })
  } catch (error) {
    console.error("Analytics error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🔍 Debug collections: http://localhost:${PORT}/api/debug/collections`)
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`)
})

console.log("✅ Server setup complete - waiting for connections...")
