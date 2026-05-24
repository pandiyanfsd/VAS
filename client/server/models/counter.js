const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Identifier for the counter (e.g., 'receipt_number')
  seq: { type: Number, default: 1000 } // Start sequences from 1000
});

const Counter = mongoose.model('Counter', counterSchema);

module.exports = { Counter };
