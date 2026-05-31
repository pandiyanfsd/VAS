const express = require('express');
const router = express.Router();
const { Fund } = require('../models/fund');
const { Member } = require('../models/member');
const { MemberFundDue } = require('../models/memberFundDue');
const { healDues } = require('../services/duesService');

// Create a new fund and auto-generate dues for all members
router.post('/', async (req, res) => {
  try {
    const { name, description, targetAmount, dueDate, fundType, year, month } = req.body;
    
    const fund = new Fund({
      name, description, targetAmount, dueDate, fundType, year, month
    });
    await fund.save();

    // Generate dues for members (respecting exemptions)
    await healDues(true);
    
    res.status(201).send({ message: 'Fund created successfully and dues assigned.', fund });
  } catch (error) {
    res.status(500).send({ error: 'Failed to create fund.', details: error.message });
  }
});

// Get all funds
router.get('/', async (req, res) => {
  try {
    const funds = await Fund.find().sort({ createdAt: -1 });
    res.send(funds);
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// Update a fund
router.put('/:id', async (req, res) => {
  try {
    const { name, description, targetAmount, dueDate, fundType, year, month } = req.body;
    
    const fund = await Fund.findByIdAndUpdate(
      req.params.id, 
      { name, description, targetAmount, dueDate, fundType, year, month }, 
      { new: true }
    );
    
    if (!fund) return res.status(404).send('Fund not found');

    // If targetAmount has changed, update all unpaid dues for this fund to match
    if (targetAmount) {
      await MemberFundDue.updateMany(
        { fundId: fund._id, status: 'unpaid' },
        { totalDueAmount: targetAmount }
      );
    }

    res.send(fund);
  } catch (error) {
    res.status(500).send('Server error: ' + error.message);
  }
});

// Delete a fund (Admin Use Case)
router.delete('/:id', async (req, res) => {
  try {
    const fund = await Fund.findByIdAndDelete(req.params.id);
    if (!fund) return res.status(404).send('Fund not found');
    
    // Also remove all associated Dues so the ledger is clean
    await MemberFundDue.deleteMany({ fundId: req.params.id });
    await healDues(true);
    
    res.send({ message: 'Fund and all its associated dues deleted successfully' });
  } catch (error) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
