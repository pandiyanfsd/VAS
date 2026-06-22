const express = require('express');
const router = express.Router();
const { Donation } = require('../models/donation');

// Create a new donation
router.post('/', async (req, res) => {
  try {
    const { name, date, amount, address, purpose, cashierId } = req.body;
    
    const donation = new Donation({
      name: name ? name.trim().toUpperCase() : '',
      date: date || Date.now(),
      amount: Number(amount),
      address: address ? address.trim().toUpperCase() : '',
      purpose: purpose ? purpose.trim().toUpperCase() : '',
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

// Update an existing donation
router.put('/:id', async (req, res) => {
  try {
    const { name, date, amount, address, purpose } = req.body;
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).send({ error: 'Donation record not found' });

    donation.name = name ? name.trim().toUpperCase() : donation.name;
    donation.amount = amount !== undefined ? Number(amount) : donation.amount;
    donation.address = address ? address.trim().toUpperCase() : donation.address;
    donation.purpose = purpose ? purpose.trim().toUpperCase() : donation.purpose;
    if (date) donation.date = new Date(date);

    await donation.save();
    res.send({ message: 'Donation updated successfully', donation });
  } catch (error) {
    res.status(500).send({ error: 'Failed to update donation', details: error.message });
  }
});

// Delete a donation
router.delete('/:id', async (req, res) => {
  try {
    const donation = await Donation.findByIdAndDelete(req.params.id);
    if (!donation) return res.status(404).send({ error: 'Donation record not found' });
    res.send({ message: 'Donation record deleted successfully' });
  } catch (error) {
    res.status(500).send({ error: 'Failed to delete donation', details: error.message });
  }
});

module.exports = router;
