const mongoose = require('mongoose');

const cashSurrenderSchema = new mongoose.Schema({
  cashierId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Cashier', 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true,
    min: 1
  },
  surrenderDate: { 
    type: Date, 
    default: Date.now 
  },
  notes: { 
    type: String,
    default: 'Regular settlement'
  },
  receivedByAdmin: { 
    type: String, 
    default: 'Admin Treasury' 
  }
});

const CashSurrender = mongoose.model('CashSurrender', cashSurrenderSchema);

module.exports = { CashSurrender };
