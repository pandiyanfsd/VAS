const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  address: { 
    type: String, 
    required: true 
  },
  purpose: { 
    type: String, 
    required: true 
  },
  cashierId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Cashier',
    required: true
  }
}, { timestamps: true });

const Donation = mongoose.model('Donation', donationSchema);

module.exports = { Donation };
