const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); // Make sure you have bcrypt installed!
const { Admin } = require('../models/admin');
const { Member } = require('../models/member');
const { Cashier } = require('../models/cashier');
const verifyToken = require('../middleware/auth').verifyToken;
const authorizeRoles = require('../middleware/auth').authorizeRoles;

// ADMIN LOGIN
router.post('/admin/login', async (req, res) => {
  try {
    const { name, password } = req.body;
    const admin = await Admin.findOne({ name });
    if (!admin) return res.status(400).send({ error: 'Invalid username or password.' });

    // Use bcrypt to compare hashed password
    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) return res.status(400).send({ error: 'Invalid username or password.' });

    const token = admin.generateAuthToken();
    res.send({ token, role: 'admin', user: { _id: admin._id, name: admin.name } });
  } catch (error) {
    res.status(500).send('Server Error');
  }
});
// ADMIN RESET PASSWORD (no current password required)
router.post('/admin/resetPassword/:type/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { type, id } = req.params; // type: 'member' or 'cashier'
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).send({ error: 'New password is required.' });

    let Model;
    if (type === 'member') Model = require('../models/member').Member;
    else if (type === 'cashier') Model = require('../models/cashier').Cashier;
    else return res.status(400).send({ error: 'Invalid type. Must be member or cashier.' });

    const entity = await Model.findById(id);
    if (!entity) return res.status(404).send({ error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found.` });

    entity.password = newPassword; // pre('save') hook will hash it
    await entity.save();
    res.send({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} password reset successfully.` });
  } catch (error) {
    console.error('[ADMIN RESET PASSWORD] error:', error);
    res.status(500).send({ error: 'Server error while resetting password.' });
  }
});
// CASHIER LOGIN
router.post('/cashier/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const cashier = await Cashier.findOne({ phone });
    if (!cashier) return res.status(400).send({ error: 'Invalid phone or password.' });

    const validPassword = await bcrypt.compare(password, cashier.password);
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

    const validPassword = await bcrypt.compare(password, member.password);
    if (!validPassword) return res.status(400).send({ error: 'Invalid ID/phone or password.' });

    const token = member.generateAuthToken();
    res.send({ token, role: 'member', user: { _id: member._id, name: member.name, memberId: member.memberId } });
  } catch (error) {
    res.status(500).send('Server Error');
  }
});

// MEMBER CHANGE PASSWORD
router.post('/member/change-password', verifyToken, authorizeRoles('member'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).send({ error: 'Current password and new password are required.' });
    }
    if (newPassword.length < 5) {
      return res.status(400).send({ error: 'New password must be at least 5 characters long.' });
    }

    const member = await Member.findById(req.user._id);
    if (!member) return res.status(404).send({ error: 'Member not found.' });

    const validPassword = await bcrypt.compare(currentPassword, member.password);
    if (!validPassword) return res.status(400).send({ error: 'Invalid current password.' });

    member.password = newPassword; // pre('save') hook hashes it
    await member.save();

    res.send({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('[MEMBER CHANGE PASSWORD] Error:', error);
    res.status(500).send({ error: 'Server error.' });
  }
});

// CASHIER CHANGE PASSWORD
router.post('/cashier/change-password', verifyToken, authorizeRoles('cashier'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).send({ error: 'Current password and new password are required.' });
    }
    if (newPassword.length < 5) {
      return res.status(400).send({ error: 'New password must be at least 5 characters long.' });
    }

    const cashier = await Cashier.findById(req.user._id);
    if (!cashier) return res.status(404).send({ error: 'Cashier not found.' });

    const validPassword = await bcrypt.compare(currentPassword, cashier.password);
    if (!validPassword) return res.status(400).send({ error: 'Invalid current password.' });

    cashier.password = newPassword; // pre('save') hook hashes it
    await cashier.save();

    res.send({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('[CASHIER CHANGE PASSWORD] Error:', error);
    res.status(500).send({ error: 'Server error.' });
  }
});

module.exports = router;

