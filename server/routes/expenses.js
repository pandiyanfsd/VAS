const express = require('express');
const router = express.Router();
const { Expense } = require('../models/expense');

// Create a new expense (Cashier or Admin can do this)
router.post('/', async (req, res) => {
  try {
    const { title, amount, date, category, subDetails, cashierId, status } = req.body;
    
    // If Admin explicitly provides status, use it; if cashier logs it, automatically default to 'pending'
    const initialStatus = status || (cashierId ? 'pending' : 'approved');

    const expense = new Expense({
      title,
      amount: Number(amount),
      date: date || Date.now(),
      category,
      subDetails,
      cashierId: cashierId || undefined,
      status: initialStatus
    });

    await expense.save();
    res.status(201).send({ message: 'Expense logged successfully', expense });
  } catch (error) {
    res.status(500).send({ error: 'Failed to log expense', details: error.message });
  }
});

// Get all expenses with advanced filters (custom date, etc.)
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, category, cashierId } = req.query;
    let query = {};

    // Custom Date wise / Monthly / Yearly (Client can just pass start and end of month/year)
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      query.date = { 
        $gte: start, 
        $lte: end 
      };
    }

    if (category) query.category = category;
    if (cashierId) query.cashierId = cashierId;

    const expenses = await Expense.find(query)
      .populate('cashierId', 'name')
      .sort({ date: -1 });
      
    res.send(expenses);
  } catch (error) {
    res.status(500).send('Server error fetching expenses');
  }
});

// Update an expense
router.put('/:id', async (req, res) => {
  try {
    const { title, amount, date, category, subDetails, cashierId, status } = req.body;
    let updateData = { title, amount, category, subDetails, status };
    if (date) updateData.date = new Date(date);
    if (cashierId) updateData.cashierId = cashierId;

    const expense = await Expense.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    ).populate('cashierId', 'name cashierId');

    if (!expense) return res.status(404).send({ error: 'Expense not found' });
    res.send(expense);
  } catch (error) {
    res.status(500).send({ error: 'Failed to update expense', details: error.message });
  }
});

// Delete an expense
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).send({ error: 'Expense not found' });
    res.send({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).send({ error: 'Failed to delete expense', details: error.message });
  }
});

module.exports = router;
