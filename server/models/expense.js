const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  category: { 
    type: String 
  },
  subDetails: { 
    type: String // Detailed explanation of the expense
  },
  cashierId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Cashier',
    required: false // To track which cashier logged the expense (optional for Admin direct expenses)
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  }
});

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = { Expense };
