const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const cashierSchema = new mongoose.Schema({
  cashierId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: 'cashier',
    enum: ['cashier']
  }
});

cashierSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { _id: this._id, role: this.role },
    process.env.SECRET_KEY || 'secretkey',
    { expiresIn: '1h' }
  );
  return token;
};

const Cashier = mongoose.model('Cashier', cashierSchema);

module.exports = { Cashier };
