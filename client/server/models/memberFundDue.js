const mongoose = require('mongoose');

const memberFundDueSchema = new mongoose.Schema({
  memberId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Member', 
    required: true 
  },
  fundId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Fund', 
    required: true 
  },
  totalDueAmount: { 
    type: Number, 
    required: true // Usually copied from Fund's targetAmount, but allows individual overrides
  },
  amountPaid: { 
    type: Number, 
    default: 0 
  },
  status: { 
    type: String, 
    enum: ['unpaid', 'partially_paid', 'paid', 'exempted'], 
    default: 'unpaid' 
  },
  dueDate: {
    type: Date
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Compound index to ensure a member only has one due record per fund
memberFundDueSchema.index({ memberId: 1, fundId: 1 }, { unique: true });

const MemberFundDue = mongoose.model('MemberFundDue', memberFundDueSchema);

module.exports = { MemberFundDue };
