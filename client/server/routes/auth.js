const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); // Make sure you have bcrypt installed!
const { Admin } = require('../models/admin');
const { Cashier } = require('../models/cashier');
const { Member } = require('../models/member');

// ADMIN LOGIN
router.post('/admin/login', async (req, res) => {
  try {
    const { name, password } = req.body;
    const admin = await Admin.findOne({ name });
    if (!admin) return res.status(400).send({ error: 'Invalid username or password.' });

    // Assuming plain text for now, but usually it's bcrypt
    // const validPassword = await bcrypt.compare(password, admin.password);
    const validPassword = (password === admin.password); 
    if (!validPassword) return res.status(400).send({ error: 'Invalid username or password.' });

    const token = admin.generateAuthToken();
    res.send({ token, role: 'admin', user: { _id: admin._id, name: admin.name } });
  } catch (error) {
    res.status(500).send('Server Error');
  }
});

// CASHIER LOGIN
router.post('/cashier/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const cashier = await Cashier.findOne({ phone });
    if (!cashier) return res.status(400).send({ error: 'Invalid phone or password.' });

    const validPassword = (password === cashier.password); 
    if (!validPassword) return res.status(400).send({ error: 'Invalid phone or password.' });

    const token = cashier.generateAuthToken();
    res.send({ token, role: 'cashier', user: { _id: cashier._id, name: cashier.name, cashierId: cashier.cashierId } });
  } catch (error) {
    res.status(500).send('Server Error');
  }
});

// MEMBER LOGIN
router.post('/member/login', async (req, res) => {
  try {
    // Can login with phone or memberId
    const { identifier, password } = req.body; 
    const member = await Member.findOne({
      $or: [{ phone: identifier }, { memberId: identifier }]
    });
    
    if (!member) return res.status(400).send({ error: 'Invalid ID/phone or password.' });

    const validPassword = (password === member.password); 
    if (!validPassword) return res.status(400).send({ error: 'Invalid ID/phone or password.' });

    const token = member.generateAuthToken();
    res.send({ token, role: 'member', user: { _id: member._id, name: member.name, memberId: member.memberId } });
  } catch (error) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
