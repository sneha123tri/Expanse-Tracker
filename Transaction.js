const mongoose = require("mongoose")

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for better query performance
transactionSchema.index({ userId: 1, createdAt: -1 })
transactionSchema.index({ userId: 1, type: 1 })
transactionSchema.index({ userId: 1, category: 1 })

module.exports = mongoose.model("Transaction", transactionSchema)
