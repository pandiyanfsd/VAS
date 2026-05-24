const mongoose = require('mongoose');

const fundSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  targetAmount: {
    type: Number,
    required: true // The default amount each member is expected to pay
  },
  dueDate: {
    type: Date
  },
  fundType: {
    type: String,
    enum: ['Monthly', 'Yearly', 'One-time', 'Death Fund', 'Festival', 'Donation', 'Others'],
    required: true
  },
  year: {
    type: Number // e.g., 2026
  },
  month: {
    type: Number // e.g., 1-12
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Fund = mongoose.model('Fund', fundSchema);

module.exports = { Fund };
