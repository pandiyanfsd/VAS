const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const memberSchema = new mongoose.Schema({
  memberId: {
    type: String,
    unique: true,
    sparse: true
  },
  familyId: {
    type: String,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50
  },
  phone: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 10,
    unique: true
  },
  age: { type: Number },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  password: {
    type: String,
    minlength: 5,
    maxlength: 1024
  },
  role: {
    type: String,
    default: 'member',
    enum: ['member']
  },
  subFamilyMembers: [{
    memberId: { type: String },
    name: { type: String, required: true },
    relation: { type: String, required: true },
    age: { type: Number },
    gender: { type: String, enum: ['male', 'female', 'other'] }
  }],
  profile_img: String,
  cloudinary_id: String,
  exemptedFunds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Fund' }]
});

memberSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

memberSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { _id: this._id, role: this.role },
    process.env.SECRET_KEY || 'secretkey',
    { expiresIn: '1h' }
  );
  return token;
};

const Member = mongoose.model('Member', memberSchema);

module.exports = { Member };