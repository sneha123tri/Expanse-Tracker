// Authentication and user management
const API_BASE = 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token');

let transactions = JSON.parse(localStorage.getItem("transactions")) || []
let budget = Number.parseFloat(localStorage.getItem("budget")) || 0

// Chart instances
let incomeChart = null;
let expenseChart = null;
let overviewChart = null;

// Generate animated background spans
function generateAnimatedBackground() {
  const animatedBg = document.getElementById("animatedBg")
  if (animatedBg) {
    for (let i = 0; i < 300; i++) {
      const span = document.createElement("span")
      animatedBg.appendChild(span)
    }
  }
}

// Redirect to login if not authenticated
function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "index.html"; 
  }
}

// Login functionality
document.addEventListener("DOMContentLoaded", () => {
  generateAnimatedBackground()

  // Check if we're on the dashboard page
  if (window.location.pathname.includes("dashboard.html")) {
  checkAuth();       
  initDashboard();     
  initNavigation();
  initCharts();
}


  // Login form handler
  const loginForm = document.getElementById("loginForm")
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin)
  }

  // Signup form handler
  const signupForm = document.getElementById("signupForm")
  if (signupForm) {
    signupForm.addEventListener("submit", handleSignup)
  }

  // Logout button handler
  const logoutBtn = document.getElementById("logoutBtn")
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout)
  }
})
function handleLogout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}


async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      window.location.href = "dashboard.html";
    } else {
      alert(data.message || "Invalid email or password!");
    }
  } catch (err) {
    console.error("Login error:", err);
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) return alert("Passwords do not match!");

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      window.location.href = "dashboard.html";
    } else {
      alert(data.message || "Signup failed!");
    }
  } catch (err) {
    console.error("Signup error:", err);
  }
}


// Dashboard functionality
async function initDashboard() {
  try {
    const res = await fetch(`${API_BASE}/user/profile`, {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    const user = await res.json();

    // Set currentUser
    currentUser = user;

    document.getElementById("userName").textContent = `Welcome, ${user.fullName}!`;

    // Now call everything else
    loadBudget();
    loadTransactions();
    updateSummary();
    initProfile(); // moved here because it needs currentUser

    // Dashboard event listeners
    document.getElementById("setBudgetBtn").addEventListener("click", setBudget);
    document.getElementById("addIncomeBtn").addEventListener("click", addIncome);
    document.getElementById("addExpenseBtn").addEventListener("click", addExpense);
  } catch (err) {
    console.error("Failed to load profile:", err);
    localStorage.removeItem("token");
    window.location.href = "index.html";
  }
}


document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("themeToggle");
  const dashboard = document.querySelector(".dashboard");

  // Load saved theme
  const savedTheme = localStorage.getItem("dashboardTheme");
  if (savedTheme === "dark") {
    dashboard.classList.add("dark");
    themeToggle.checked = true;
  }

  // Toggle handler
  themeToggle.addEventListener("change", () => {
    if (themeToggle.checked) {
      dashboard.classList.add("dark");
      localStorage.setItem("dashboardTheme", "dark");
    } else {
      dashboard.classList.remove("dark");
      localStorage.setItem("dashboardTheme", "light");
    }
  });
});

// Navigation functionality
function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.main-section');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active class from all links and sections
      navLinks.forEach(l => l.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      
      // Add active class to clicked link
      link.classList.add('active');
      
      // Show corresponding section
      const sectionId = link.getAttribute('data-section') + '-section';
      const targetSection = document.getElementById(sectionId);
      if (targetSection) {
        targetSection.classList.add('active');
        
        // Update charts if analytics section is shown
        if (sectionId === 'analytics-section') {
          setTimeout(() => {
            updateCharts();
          }, 100);
        }
      }
    });
  });
}

// Profile initialization
function initProfile() {
  if (currentUser) {
    document.getElementById('profileName').value = currentUser.fullName;
    document.getElementById('profileEmail').value = currentUser.email;
    document.getElementById('profileJoined').value = new Date(currentUser.createdAt).toLocaleDateString();
    
    // Set avatar initials
    const initials = currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase();
    document.getElementById('avatarInitials').textContent = initials;
  }

  // Profile edit functionality
  document.getElementById('editProfileBtn').addEventListener('click', toggleProfileEdit);
  document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
  document.getElementById('cancelEditBtn').addEventListener('click', cancelProfileEdit);
  document.getElementById('changeAvatarBtn').addEventListener('click', changeAvatarColor);

  updateProfileStats();
}

function toggleProfileEdit() {
  const nameInput = document.getElementById('profileName');
  const editBtn = document.getElementById('editProfileBtn');
  const saveBtn = document.getElementById('saveProfileBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');

  nameInput.readOnly = false;
  nameInput.focus();
  
  editBtn.style.display = 'none';
  saveBtn.style.display = 'inline-block';
  cancelBtn.style.display = 'inline-block';
}

async function saveProfile() {
  const newName = document.getElementById('profileName').value;

  if (newName.trim()) {
    try {
      const res = await fetch(`${API_BASE}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ fullName: newName.trim() })
      });

      const data = await res.json();

      if (res.ok) {
        currentUser = data.user;
        document.getElementById('userName').textContent = `Welcome, ${currentUser.fullName}!`;

        const initials = currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase();
        document.getElementById('avatarInitials').textContent = initials;

        cancelProfileEdit();
        alert('Profile updated successfully!');
      } else {
        alert(data.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error("Profile update error:", err);
      alert("Something went wrong while updating profile.");
    }
  }
}


function cancelProfileEdit() {
  const nameInput = document.getElementById('profileName');
  const editBtn = document.getElementById('editProfileBtn');
  const saveBtn = document.getElementById('saveProfileBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');

  nameInput.value = currentUser.fullName;
  nameInput.readOnly = true;
  
  editBtn.style.display = 'inline-block';
  saveBtn.style.display = 'none';
  cancelBtn.style.display = 'none';
}

function changeAvatarColor() {
  const colors = [
    'linear-gradient(135deg, #3b82f6, #6366f1)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #ef4444, #dc2626)',
    'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    'linear-gradient(135deg, #06b6d4, #0891b2)'
  ];
  
  const avatar = document.getElementById('profileAvatar');
  const currentColor = avatar.style.background;
  let newColor;
  
  do {
    newColor = colors[Math.floor(Math.random() * colors.length)];
  } while (newColor === currentColor);
  
  avatar.style.background = newColor;
}

function updateProfileStats() {
  const totalTransactions = transactions.length;
  const totalIncome = getTotalIncome();
  const totalExpenses = getTotalExpenses();
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0;

  document.getElementById('totalTransactions').textContent = totalTransactions;
  document.getElementById('avgMonthlyIncome').textContent = `$${totalIncome.toFixed(2)}`;
  document.getElementById('avgMonthlyExpense').textContent = `$${totalExpenses.toFixed(2)}`;
  document.getElementById('savingsRate').textContent = `${savingsRate.toFixed(1)}%`;
}

// Budget management
async function setBudget() {
  const budgetAmount = Number.parseFloat(document.getElementById("budgetAmount").value);
  if (!budgetAmount || budgetAmount <= 0) {
    alert("Please enter a valid budget amount!");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/budget`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ amount: budgetAmount })
    });

    const data = await res.json();
    if (res.ok) {
      alert("Budget updated successfully!");

      document.getElementById("budgetAmount").value = ""; // optional: clear input

      // 👇 Ensure all updates are reflected
      await loadBudget();             // load latest budget amount
      await loadTransactions();       // refresh transactions (for updated expenses)
      updateSummary();                // update income/expense/net balance
      updateCharts();                 // update pie/doughnut charts
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error("Budget update error:", err);
    alert("Something went wrong while updating budget.");
  }
}



async function loadBudget() {
  try {
    const res = await fetch(`${API_BASE}/budget`, {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    const data = await res.json();
    const amount = data.amount || 0;
    document.getElementById("currentBudget").textContent = amount.toFixed(2);
    updateRemainingBudget(amount);
  } catch (err) {
    console.error("Error loading budget:", err);
    document.getElementById("currentBudget").textContent = "0.00";
    updateRemainingBudget(0);
  }
}

function updateRemainingBudget(budgetAmount) {
  const totalExpenses = getTotalExpenses(); // calculated from fetched transactions
  const remaining = budgetAmount - totalExpenses;
  document.getElementById("remainingBudget").textContent = remaining.toFixed(2);
  const progress = budgetAmount > 0 ? (totalExpenses / budgetAmount) * 100 : 0;
  document.getElementById("budgetProgressBar").style.width = `${Math.min(progress, 100)}%`;
}


function updateBudgetDisplay() {
  document.getElementById("currentBudget").textContent = budget.toFixed(2)
  const totalExpenses = getTotalExpenses()
  const remaining = budget - totalExpenses
  document.getElementById("remainingBudget").textContent = remaining.toFixed(2)

  // Update progress bar
  const progressPercentage = budget > 0 ? (totalExpenses / budget) * 100 : 0
  document.getElementById("budgetProgressBar").style.width = Math.min(progressPercentage, 100) + "%"
}

// Transaction management
function addIncome() {
  handleTransaction("income");
}

function addExpense() {
  handleTransaction("expense");
}

async function handleTransaction(type) {
  const description = document.getElementById(`${type}Description`).value.trim();
  const category = document.getElementById(`${type}Category`).value;
  const amount = Number.parseFloat(document.getElementById(`${type}Amount`).value);

  if (!description || !category || !amount || amount <= 0) {
    alert("Please fill in all fields with valid data!");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ type, description, category, amount })
    });
    if (type === "income") {
      clearIncomeForm();
    } else {
      clearExpenseForm();
    }

    const data = await res.json();
    if (res.ok) {
      alert("Transaction added successfully!");
      loadTransactions(); // reload from backend
    } else {
      alert(data.message || "Transaction failed");
    }
  } catch (err) {
    console.error("Transaction error:", err);
  }
}

async function deleteTransaction(id) {
  try {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    const data = await res.json();
    if (res.ok) {
      alert("Transaction deleted!");
      loadTransactions(); // reload UI
    } else {
      alert(data.message || "Could not delete transaction");
    }
  } catch (err) {
    console.error("Delete error:", err);
  }
}


function clearIncomeForm() {
  document.getElementById("incomeDescription").value = ""
  document.getElementById("incomeCategory").value = ""
  document.getElementById("incomeAmount").value = ""
}

function clearExpenseForm() {
  document.getElementById("expenseDescription").value = ""
  document.getElementById("expenseCategory").value = ""
  document.getElementById("expenseAmount").value = ""
}

async function loadTransactions() {
  const incomeList = document.getElementById("incomeList");
  const expenseList = document.getElementById("expenseList");

  incomeList.innerHTML = "";
  expenseList.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/transactions`, {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    const data = await res.json();

    // ✅ Update global transactions array
    transactions = data.transactions;

    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach((transaction) => {
      const element = createTransactionElement(transaction);
      if (transaction.type === "income") {
        incomeList.appendChild(element);
        totalIncome += transaction.amount;
      } else {
        expenseList.appendChild(element);
        totalExpenses += transaction.amount;
      }
    });

    // ✅ Update UI elements
    document.getElementById("totalIncome").textContent = totalIncome.toFixed(2);
    document.getElementById("totalExpenses").textContent = totalExpenses.toFixed(2);
    document.getElementById("monthlyIncome").textContent = totalIncome.toFixed(2);
    document.getElementById("monthlyExpenses").textContent = totalExpenses.toFixed(2);
    document.getElementById("netBalance").textContent = `$${(totalIncome - totalExpenses).toFixed(2)}`;

    // ✅ Update budget progress bar
    updateRemainingBudget(parseFloat(document.getElementById("currentBudget").textContent || 0));

    // ✅ Update charts
    updateCharts();

    // ✅ Update profile statistics
    updateProfileStats();

  } catch (err) {
    console.error("Failed to load transactions:", err);
  }
}


function createTransactionElement(transaction) {
  const div = document.createElement("div");
  div.className = "transaction-item";

  div.innerHTML = `
    <div class="transaction-details">
      <div class="description">${transaction.description}</div>
      <div class="category">${transaction.category} • ${new Date(transaction.createdAt).toLocaleDateString()}</div>
    </div>
    <div class="transaction-amount ${transaction.type === "income" ? "income-amount" : "expense-amount"}">
      ${transaction.type === "income" ? "+" : "-"}$${transaction.amount.toFixed(2)}
    </div>
    <button class="delete-btn" onclick="deleteTransaction('${transaction._id}')">Delete</button>
  `;

  return div;
}


// Summary calculations
function getTotalIncome() {
  return transactions.filter((t) => t.type === "income").reduce((total, t) => total + t.amount, 0)
}

function getTotalExpenses() {
  return transactions.filter((t) => t.type === "expense").reduce((total, t) => total + t.amount, 0)
}

function updateSummary() {
  const totalIncome = getTotalIncome()
  const totalExpenses = getTotalExpenses()
  const netBalance = totalIncome - totalExpenses

  const netBalanceElement = document.getElementById("netBalance")
  const monthlyIncomeElement = document.getElementById("monthlyIncome")
  const monthlyExpensesElement = document.getElementById("monthlyExpenses")

  if (netBalanceElement) {
    netBalanceElement.textContent = `$${netBalance.toFixed(2)}`
    netBalanceElement.style.color = netBalance >= 0 ? "#10b981" : "#ef4444"
  }

  if (monthlyIncomeElement) {
    monthlyIncomeElement.textContent = totalIncome.toFixed(2)
  }

  if (monthlyExpensesElement) {
    monthlyExpensesElement.textContent = totalExpenses.toFixed(2)
  }
}

// Charts initialization
function initCharts() {
  const incomeCtx = document.getElementById('incomeChart');
  const expenseCtx = document.getElementById('expenseChart');
  const overviewCtx = document.getElementById('overviewChart');

  if (incomeCtx) {
    incomeChart = new Chart(incomeCtx, {
      type: 'pie',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [
            '#3b82f6',
            '#10b981',
            '#f59e0b',
            '#ef4444',
            '#8b5cf6',
            '#06b6d4'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true
            }
          }
        }
      }
    });
  }

  if (expenseCtx) {
    expenseChart = new Chart(expenseCtx, {
      type: 'pie',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [
            '#ef4444',
            '#f59e0b',
            '#8b5cf6',
            '#06b6d4',
            '#10b981',
            '#3b82f6',
            '#ec4899',
            '#6366f1'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true
            }
          }
        }
      }
    });
  }

  if (overviewCtx) {
    overviewChart = new Chart(overviewCtx, {
      type: 'doughnut',
      data: {
        labels: ['Income', 'Expenses'],
        datasets: [{
          data: [0, 0],
          backgroundColor: ['#10b981', '#ef4444'],
          borderWidth: 3,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 14,
                weight: 'bold'
              }
            }
          }
        }
      }
    });
  }

  updateCharts();
}

function updateCharts() {
  updateIncomeChart();
  updateExpenseChart();
  updateOverviewChart();
}

function updateIncomeChart() {
  if (!incomeChart) return;

  const incomeByCategory = {};
  transactions.filter(t => t.type === 'income').forEach(t => {
    incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
  });

  const labels = Object.keys(incomeByCategory);
  const data = Object.values(incomeByCategory);

  incomeChart.data.labels = labels.map(label => label.charAt(0).toUpperCase() + label.slice(1));
  incomeChart.data.datasets[0].data = data;
  incomeChart.update();
}

function updateExpenseChart() {
  if (!expenseChart) return;

  const expenseByCategory = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
  });

  const labels = Object.keys(expenseByCategory);
  const data = Object.values(expenseByCategory);

  expenseChart.data.labels = labels.map(label => label.charAt(0).toUpperCase() + label.slice(1));
  expenseChart.data.datasets[0].data = data;
  expenseChart.update();
}

function updateOverviewChart() {
  if (!overviewChart) return;

  const totalIncome = getTotalIncome();
  const totalExpenses = getTotalExpenses();

  overviewChart.data.datasets[0].data = [totalIncome, totalExpenses];
  overviewChart.update();
}



require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/expensy", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err))

// User Schema
const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
  },
  { timestamps: true },
)

// Transaction Schema
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

// Budget Schema
const budgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
)

// Models
const User = mongoose.model("User", userSchema)
const Transaction = mongoose.model("Transaction", transactionSchema)
const Budget = mongoose.model("Budget", budgetSchema)

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here"

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ message: "Access token required" })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" })
    }
    req.user = user
    next()
  })
}

// Routes

// Health check
app.get("/api/health", (req, res) => {
  res.json({ message: "🚀 Server is running!", timestamp: new Date().toISOString() })
})

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body

    // Check if user exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = new User({ fullName, email, password: hashedPassword })
    await user.save()

    // Generate token
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" })

    res.status(201).json({
      message: "User created successfully",
      token,
      user: { id: user._id, fullName: user.fullName, email: user.email, createdAt: user.createdAt },
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ message: "Server error during registration" })
  }
})

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" })
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" })
    }

    // Generate token
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" })

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
    const { amount } = req.body

    let budget = await Budget.findOne({ userId: req.user.userId })

    if (budget) {
      budget.amount = amount
      await budget.save()
    } else {
      budget = new Budget({ userId: req.user.userId, amount })
      await budget.save()
    }

    res.json({ message: "Budget updated successfully", budget })
  } catch (error) {
    console.error("Budget update error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get transactions
app.get("/api/transactions", authenticateToken, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.userId }).sort({ createdAt: -1 })
    res.json({ transactions })
  } catch (error) {
    console.error("Transactions fetch error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create transaction
app.post("/api/transactions", authenticateToken, async (req, res) => {
  try {
    const { type, description, category, amount } = req.body

    // Validation
    if (!type || !description || !category || !amount) {
      return res.status(400).json({ message: "All fields are required" })
    }

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({ message: "Type must be income or expense" })
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" })
    }

    const transaction = new Transaction({
      userId: req.user.userId,
      type,
      description: description.trim(),
      category: category.trim(),
      amount: Number.parseFloat(amount),
    })

    await transaction.save()

    res.status(201).json({ message: "Transaction created successfully", transaction })
  } catch (error) {
    console.error("Transaction creation error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete transaction
app.delete("/api/transactions/:id", authenticateToken, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" })
    }

    res.json({ message: "Transaction deleted successfully" })
  } catch (error) {
    console.error("Transaction deletion error:", error)
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
  console.log(` Server running on port ${PORT}`)
})

module.exports = app



