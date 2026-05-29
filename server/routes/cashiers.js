const express = require('express');
const router = express.Router();
const { Cashier } = require('../models/cashier');

// Create Cashier (Admin Use Case)
router.post('/', async (req, res) => {
  try {
    const { cashierId, name, phone, password } = req.body;
    let cashier = await Cashier.findOne({ $or: [{ phone }, { cashierId }] });
    if (cashier) return res.status(400).send({ error: 'Cashier with this ID or phone already exists.' });

    cashier = new Cashier({ cashierId, name, phone, password });
    await cashier.save();
    
    res.status(201).send({ message: 'Cashier created successfully', cashier });
  } catch (error) {
    res.status(500).send({ error: 'Failed to create cashier', details: error.message });
  }
});

// Update Cashier details
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    
    const cashier = await Cashier.findById(req.params.id);
    if (!cashier) return res.status(404).send('Cashier not found');

    cashier.name = name;
    cashier.phone = phone;
    if (password) {
      cashier.password = password; // triggers pre('save') hook to hash it exactly once
    }

    await cashier.save();
    res.send(cashier);
  } catch (error) {
    console.error('[PUT /api/cashiers/:id] Error:', error);
    res.status(500).send('Server error');
  }
});

// Delete Cashier
router.delete('/:id', async (req, res) => {
  try {
    const cashier = await Cashier.findByIdAndDelete(req.params.id);
    if (!cashier) return res.status(404).send('Cashier not found');
    res.send({ message: 'Cashier deleted successfully' });
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// Get all cashiers
router.get('/', async (req, res) => {
  try {
    const cashiers = await Cashier.find().sort('name');
    res.send(cashiers);
  } catch (error) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
