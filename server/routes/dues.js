const express = require('express');
const router = express.Router();
const { MemberFundDue } = require('../models/memberFundDue');

// Get all due records with populated members and funds (for global dashboard & financial explorer audit)
router.get('/', async (req, res) => {
  try {
    // 1. Run dynamic database self-healing to verify no newly created members are missing due invoices
    const { Member } = require('../models/member');
    const { Fund } = require('../models/fund');

    const members = await Member.find({ role: 'member' });
    const funds = await Fund.find({});

    // Clean up orphaned dues where the member or fund no longer exists
    const validMemberIds = members.map(m => m._id);
    const validFundIds = funds.map(f => f._id);
    await MemberFundDue.deleteMany({
      $or: [
        { memberId: { $nin: validMemberIds } },
        { fundId: { $nin: validFundIds } }
      ]
    });

    // 1. Fetch all existing dues in ONE query to avoid N * M calls
    const existingDues = await MemberFundDue.find({}, 'memberId fundId');
    const existingSet = new Set(existingDues.map(d => `${d.memberId.toString()}_${d.fundId.toString()}`));

    const bulkOps = [];

    // 2. Compare in-memory (extremely fast!)
    for (const member of members) {
      const exemptedSet = new Set((member.exemptedFunds || []).map(id => id.toString()));
      const mIdStr = member._id.toString();
      for (const fund of funds) {
        if (exemptedSet.has(fund._id.toString())) continue;
        
        const fIdStr = fund._id.toString();
        if (!existingSet.has(`${mIdStr}_${fIdStr}`)) {
          bulkOps.push({
            memberId: member._id,
            fundId: fund._id,
            totalDueAmount: fund.targetAmount,
            status: 'unpaid',
            amountPaid: 0
          });
        }
      }
    }

    if (bulkOps.length > 0) {
      await MemberFundDue.insertMany(bulkOps);
      console.log(`[Self-Healing Dues] Auto-generated ${bulkOps.length} missing due invoices.`);
    }

    // 2. Fetch all dues with populated records
    const dues = await MemberFundDue.find({})
      .populate('memberId', 'name phone memberId familyId subFamilyMembers')
      .populate('fundId', 'name targetAmount fundType year month dueDate');
    res.send(dues);
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// Get all dues for a specific member
router.get('/member/:memberId', async (req, res) => {
  try {
    const dues = await MemberFundDue.find({ memberId: req.params.memberId })
      .populate('fundId')
      .sort({ createdAt: -1 });
    res.send(dues);
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// Get all dues filtered by status (unpaid, paid, etc.)
router.get('/status/:status', async (req, res) => {
  try {
    const dues = await MemberFundDue.find({ status: req.params.status })
      .populate('memberId', 'name phone memberId')
      .populate('fundId', 'name targetAmount fundType year month');
    res.send(dues);
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// Fetch pending dues using member's QR Code ID / Member ID directly (Cashier Use Case)
router.get('/search/:memberIdString', async (req, res) => {
  try {
    // 1. Find member by memberId string
    const { Member } = require('../models/member');
    const member = await Member.findOne({ memberId: req.params.memberIdString });

    if (!member) return res.status(404).send({ error: 'Member not found.' });

    // 2. Find all unpaid or partially paid dues for this member
    const dues = await MemberFundDue.find({
      memberId: member._id,
      status: { $ne: 'paid' }
    }).populate('fundId', 'name targetAmount');

    res.send({ member, dues });
  } catch (error) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
