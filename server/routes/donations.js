const express = require('express');
const router = express.Router();
const { Donation } = require('../models/donation');

// Create a new donation
router.post('/', async (req, res) => {
  try {
    const { name, date, amount, address, purpose, cashierId } = req.body;
    
    const donation = new Donation({
      name,
      date: date || Date.now(),
      amount: Number(amount),
      address,
      purpose,
      cashierId
    });

    await donation.save();
    res.status(201).send({ message: 'Donation recorded successfully', donation });
  } catch (error) {
    res.status(500).send({ error: 'Failed to record donation', details: error.message });
  }
});

// Get all donations (optionally filtered by cashierId and/or purpose)
router.get('/', async (req, res) => {
  try {
    const { cashierId, purpose } = req.query;
    let query = {};

    if (cashierId) query.cashierId = cashierId;
    if (purpose) query.purpose = purpose;

    const donations = await Donation.find(query)
      .populate('cashierId', 'name')
      .sort({ date: -1 });

    res.send(donations);
  } catch (error) {
    res.status(500).send({ error: 'Server error fetching donations', details: error.message });
  }
});

module.exports = router;
