const mongoose = require("mongoose")

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
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

// Index for faster user lookups
budgetSchema.index({ userId: 1 })

module.exports = mongoose.model("Budget", budgetSchema)
