const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 255
  },
  password: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 1024 // hashed password length
  },
  role: {
    type: String,
    default: 'admin',
    enum: ['admin'] // useful for future extension if needed
  }
});
adminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Generate JWT with _id and role
adminSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { _id: this._id, role: this.role },
    process.env.SECRET_KEY || 'secretkey',
    { expiresIn: '1h' }
  );
  return token;
};

const Admin = mongoose.model('Admin', adminSchema);

module.exports = { Admin };
