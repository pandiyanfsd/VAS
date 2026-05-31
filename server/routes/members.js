const express = require('express');
const router = express.Router();
const { Member } = require('../models/member');
const { Fund } = require('../models/fund');
const { healDues } = require('../services/duesService');

// Create new member (Admin only usually)
router.post('/', async (req, res) => {
  try {
    const { memberId, familyId, name, phone, password, subFamilyMembers, age, gender, selectedFunds } = req.body;
    
    // Check if member already exists
    let member = await Member.findOne({ $or: [{ phone }, { memberId }, { familyId }] });
    if (member) return res.status(400).send({ error: 'Member with this ID or phone already exists.' });

    let exemptedFunds = [];
    if (selectedFunds && Array.isArray(selectedFunds)) {
      const allFunds = await Fund.find({});
      const selectedFundsSet = new Set(selectedFunds.map(id => id.toString()));
      exemptedFunds = allFunds
        .filter(f => !selectedFundsSet.has(f._id.toString()))
        .map(f => f._id);
    }

    // Robustly sanitize subFamilyMembers age to prevent casting errors
    const sanitizedSubMembers = (subFamilyMembers || []).map(sub => ({
      ...sub,
      age: (sub.age !== '' && sub.age !== null && sub.age !== undefined) ? Number(sub.age) : undefined
    }));

    member = new Member({
      memberId,
      familyId,
      name,
      phone,
      password: password || undefined, // avoid empty string failing minlength
      subFamilyMembers: sanitizedSubMembers,
      age: (age !== '' && age !== null && age !== undefined) ? Number(age) : undefined,
      gender,
      exemptedFunds
    });

    await member.save();
    await healDues(true); // Force run self-healing immediately for the new member
    res.status(201).send({ message: 'Member created successfully', member });
  } catch (error) {
    console.error('[POST /api/members] Error:', error.message);
    if (error.code === 11000) {
      return res.status(400).send({ error: 'Member with this ID, Family ID, or Phone already exists (duplicate key).' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).send({ error: error.message });
    }
    res.status(500).send({ error: error.message || 'Failed to create member', details: error.message });
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
    const { name, phone, subFamilyMembers, familyId, age, gender, password } = req.body;
    
    // Robustly sanitize subFamilyMembers age to prevent casting errors
    const sanitizedSubMembers = (subFamilyMembers || []).map(sub => ({
      ...sub,
      age: (sub.age !== '' && sub.age !== null && sub.age !== undefined) ? Number(sub.age) : undefined
    }));

    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).send({ error: 'Member not found' });
    member.name = name;
    member.phone = phone;
    member.subFamilyMembers = sanitizedSubMembers;
    member.familyId = familyId;
    member.age = (age !== '' && age !== null && age !== undefined) ? Number(age) : undefined;
    member.gender = gender;
    
    if (password) {
      member.password = password; // triggers pre('save') hook to hash it exactly once
    }

    await member.save();
    await healDues(true); // Force run self-healing immediately for member updates
    
    if (!member) return res.status(404).send({ error: 'Member not found' });
    res.send(member);
  } catch (error) {
    console.error('[PUT /api/members/:id] Error:', error.message);
    if (error.code === 11000) {
      return res.status(400).send({ error: 'Member with this ID, Family ID, or Phone already exists (duplicate key).' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).send({ error: error.message });
    }
    res.status(500).send({ error: error.message || 'Server error', details: error.message });
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
