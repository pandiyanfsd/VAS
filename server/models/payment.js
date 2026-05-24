const mongoose = require('mongoose');

const { Counter } = require('./counter');

const paymentSchema = new mongoose.Schema({
  memberId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Member', 
    required: true 
  },
  cashierId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Cashier' // Who collected it (if applicable)
  },
  paymentSource: {
    type: String,
    enum: ['cashier', 'cashier_portal', 'member_portal'],
    required: true
  },
  totalAmountPaid: { 
    type: Number, 
    required: true 
  },
  paymentMode: {
    type: String,
    enum: ['cash', 'online', 'qr', 'upi', 'card'],
    default: 'cash'
  },
  paymentDate: { 
    type: Date, 
    default: Date.now 
  },
  receiptNumber: { 
    type: String, 
    unique: true 
  },
  // Breakdown of how the total payment is distributed across different funds
  splitDetails: [{
    fundId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fund', required: true },
    amountAllocated: { type: Number, required: true }
  }],
  notes: {
    type: String
  }
});

// Auto-generate receipt number before saving
paymentSchema.pre('save', async function() {
  const doc = this;
  
  // Only generate receipt number if it doesn't already exist
  if (!doc.receiptNumber) {
    const counter = await Counter.findOneAndUpdate(
      { id: 'receipt_number' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    
    // Format: REC-YYYYMMDD-SEQ (e.g., REC-20260516-1001)
    const date = new Date();
    const dateStr = date.getFullYear().toString() + 
                    String(date.getMonth() + 1).padStart(2, '0') + 
                    String(date.getDate()).padStart(2, '0');
    
    doc.receiptNumber = `REC-${dateStr}-${counter.seq}`;
  }
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = { Payment };
