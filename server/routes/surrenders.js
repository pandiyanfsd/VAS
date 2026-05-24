const express = require('express');
const router = express.Router();
const { Cashier } = require('../models/cashier');
const { Payment } = require('../models/payment');
const { CashSurrender } = require('../models/cashSurrender');

// GET /api/surrenders/summary - Get financial handover summary for all cashiers
router.get('/summary', async (req, res) => {
  try {
    const cashiers = await Cashier.find().sort('name');
    const summary = [];

    for (const cashier of cashiers) {
      // 1. Calculate total collected by this cashier from Payments
      const payments = await Payment.find({ cashierId: cashier._id });
      const totalCollected = payments.reduce((sum, p) => sum + (p.totalAmountPaid || 0), 0);

      // 2. Calculate total surrendered by this cashier
      const surrenders = await CashSurrender.find({ cashierId: cashier._id });
      const totalSurrendered = surrenders.reduce((sum, s) => sum + (s.amount || 0), 0);

      const cashInHand = Math.max(0, totalCollected - totalSurrendered);

      summary.push({
        _id: cashier._id,
        cashierId: cashier.cashierId,
        name: cashier.name,
        phone: cashier.phone,
        totalCollected,
        totalSurrendered,
        cashInHand
      });
    }

    res.send(summary);
  } catch (error) {
    console.error('Error fetching cashier handover summary:', error);
    res.status(500).send({ error: 'Failed to fetch treasury handover summary' });
  }
});

// GET /api/surrenders - Get history of all surrender transactions
router.get('/', async (req, res) => {
  try {
    const surrenders = await CashSurrender.find()
      .populate('cashierId', 'name cashierId phone')
      .sort({ surrenderDate: -1 });
    res.send(surrenders);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch surrender history' });
  }
});

// POST /api/surrenders - Record a new cash surrender handover
router.post('/', async (req, res) => {
  try {
    const { cashierId, amount, notes, receivedByAdmin, surrenderDate } = req.body;

    if (!cashierId || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).send({ error: 'Valid Cashier and positive amount are required.' });
    }

    // Validate surrender amount does not exceed cash in hand
    const payments = await Payment.find({ cashierId });
    const totalCollected = payments.reduce((sum, p) => sum + (p.totalAmountPaid || 0), 0);
    const surrenders = await CashSurrender.find({ cashierId });
    const totalSurrendered = surrenders.reduce((sum, s) => sum + (s.amount || 0), 0);
    const cashInHand = Math.max(0, totalCollected - totalSurrendered);

    if (Number(amount) > cashInHand) {
      return res.status(400).send({ 
        error: `Surrender amount (₹${Number(amount).toLocaleString()}) exceeds current Cash in Hand (₹${cashInHand.toLocaleString()}). Maximum allowed: ₹${cashInHand.toLocaleString()}.` 
      });
    }

    const surrender = new CashSurrender({
      cashierId,
      amount: Number(amount),
      notes: notes || 'Regular cash settlement',
      receivedByAdmin: receivedByAdmin || 'Admin Treasury',
      surrenderDate: surrenderDate ? new Date(surrenderDate) : new Date()
    });

    await surrender.save();
    
    // Populate cashier info for immediate return
    const populated = await CashSurrender.findById(surrender._id).populate('cashierId', 'name cashierId');

    res.status(201).send({ message: 'Cash surrender recorded successfully', surrender: populated });
  } catch (error) {
    res.status(500).send({ error: 'Failed to record cash surrender', details: error.message });
  }
});

module.exports = router;
