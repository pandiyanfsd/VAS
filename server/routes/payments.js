const express = require('express');
const router = express.Router();
const { Payment } = require('../models/payment');
const { MemberFundDue } = require('../models/memberFundDue');

// Process a payment (Receipt generation)
router.post('/', async (req, res) => {
  try {
    const { memberId, cashierId, paymentSource, paymentMode, splitDetails, notes } = req.body;
    
    let totalAmountPaid = 0;
    for (const split of splitDetails) {
      totalAmountPaid += split.amountAllocated;
    }

    const payment = new Payment({
      memberId,
      cashierId,
      paymentSource,
      totalAmountPaid,
      paymentMode,
      splitDetails,
      notes
    });

    // Save triggers the auto-increment receipt number
    await payment.save();

    // Reconcile the ledger (Dues)
    for (const split of splitDetails) {
      const due = await MemberFundDue.findOne({ memberId, fundId: split.fundId });
      if (due) {
        due.amountPaid += split.amountAllocated;
        if (due.amountPaid >= due.totalDueAmount) {
          due.status = 'paid';
        } else if (due.amountPaid > 0) {
          due.status = 'partially_paid';
        }
        await due.save();
      }
    }

    // Fetch the populated receipt to return full member + fund details
    const populatedPayment = await Payment.findById(payment._id)
      .populate('memberId', 'name familyId memberId phone')
      .populate('splitDetails.fundId', 'name fundType year month');

    res.status(201).send({ message: 'Payment processed and receipt generated', receipt: populatedPayment });
  } catch (error) {
    console.error('[POST /api/payments] ERROR:', error.message);
    console.error('[POST /api/payments] FULL ERROR:', JSON.stringify(error, null, 2));
    res.status(500).send({ error: 'Payment processing failed', details: error.message });
  }
});

// Get all payments (Receipt History) with Advanced Filters
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, fundId, cashierId, memberId } = req.query;
    let query = {};

    // Filter by Custom Date Range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      query.paymentDate = { 
        $gte: start, 
        $lte: end 
      };
    }

    // Filter by specific Cashier (Cashier wise collection)
    if (cashierId) query.cashierId = cashierId;

    // Filter by specific Member (Member wise)
    if (memberId) query.memberId = memberId;

    // Filter by specific Fund (Fund wise)
    if (fundId) query['splitDetails.fundId'] = fundId;

    const payments = await Payment.find(query)
      .populate('memberId', 'name memberId familyId phone')
      .populate('cashierId', 'name cashierId')
      .populate('splitDetails.fundId', 'name fundType')
      .sort({ paymentDate: -1 });

    res.send(payments);
  } catch (error) {
    console.error('[GET /api/payments] ERROR:', error.message);
    res.status(500).send({ error: 'Server error fetching payments' });
  }
});

module.exports = router;
