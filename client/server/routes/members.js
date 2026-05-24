const express = require('express');
const router = express.Router();
const { Member } = require('../models/member');

// Create new member (Admin only usually)
router.post('/', async (req, res) => {
  try {
    const { memberId, familyId, name, phone, password, subFamilyMembers, age, gender } = req.body;
    
    // Check if member already exists
    let member = await Member.findOne({ $or: [{ phone }, { memberId }, { familyId }] });
    if (member) return res.status(400).send({ error: 'Member with this ID or phone already exists.' });

    member = new Member({
      memberId,
      familyId,
      name,
      phone,
      password, // Note: In production, hash this with bcrypt before saving!
      subFamilyMembers,
      age,
      gender
    });

    await member.save();
    res.status(201).send({ message: 'Member created successfully', member });
  } catch (error) {
    res.status(500).send({ error: 'Failed to create member', details: error.message });
  }
});

// Get all members
router.get('/', async (req, res) => {
  try {
    const members = await Member.find().sort('name');
    res.send(members);
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// Get a single member by ID (used by Member Dashboard to load own profile only)
router.get('/:id', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).send({ error: 'Member not found.' });
    res.send(member);
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// Update a member
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, subFamilyMembers, familyId, age, gender } = req.body;
    const member = await Member.findByIdAndUpdate(
      req.params.id, 
      { name, phone, subFamilyMembers, familyId, age, gender }, 
      { new: true }
    );
    
    if (!member) return res.status(404).send('Member not found');
    res.send(member);
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// Delete a member
router.delete('/:id', async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) return res.status(404).send('Member not found');
    
    // Remove orphaned dues
    const { MemberFundDue } = require('../models/memberFundDue');
    await MemberFundDue.deleteMany({ memberId: req.params.id });
    
    res.send({ message: 'Member and associated dues deleted successfully' });
  } catch (error) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
