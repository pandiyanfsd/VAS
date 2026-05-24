const express = require('express');
const router = express.Router();
const { Payment } = require('../models/payment');
const { Expense } = require('../models/expense');
const { MemberFundDue } = require('../models/memberFundDue');
const { Member } = require('../models/member');
const { Fund } = require('../models/fund');

// Database self-healing for missing dues invoices
const healDues = async () => {
  try {
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

    const bulkOps = [];

    for (const member of members) {
      for (const fund of funds) {
        const exists = await MemberFundDue.findOne({ memberId: member._id, fundId: fund._id });
        if (!exists) {
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
      console.log(`[Self-Healing] Generated ${bulkOps.length} missing due invoices.`);
    }
  } catch (err) {
    console.error("[Self-Healing] Error auto-generating missing dues:", err);
  }
};

// Get overall Financial summary (Overall funds and expense details)
router.get('/summary', async (req, res) => {
  try {
    // Run self-healing to verify database sync
    await healDues();

    // 1. Total Collections (Payments)
    const payments = await Payment.aggregate([
      { $group: { _id: null, totalCollected: { $sum: "$totalAmountPaid" } } }
    ]);
    const totalCollected = payments.length > 0 ? payments[0].totalCollected : 0;

    // 2. Total Expenses
    const expenses = await Expense.aggregate([
      { $match: { status: 'approved' } }, // Assuming we only count valid expenses
      { $group: { _id: null, totalSpent: { $sum: "$amount" } } }
    ]);
    const totalSpent = expenses.length > 0 ? expenses[0].totalSpent : 0;

    // 3. Total Outstanding Dues (Expected but unpaid)
    const dues = await MemberFundDue.aggregate([
      { $project: { pendingAmount: { $subtract: ["$totalDueAmount", "$amountPaid"] } } },
      { $group: { _id: null, totalPending: { $sum: "$pendingAmount" } } }
    ]);
    const totalPending = dues.length > 0 ? dues[0].totalPending : 0;

    // 4. Detailed Breakdown of Outstanding Dues grouped by Individual Fund & Fund Type
    const duesBreakdown = await MemberFundDue.aggregate([
      {
        $lookup: {
          from: "funds",
          localField: "fundId",
          foreignField: "_id",
          as: "fundDetails"
        }
      },
      { $unwind: "$fundDetails" },
      {
        $project: {
          fundName: "$fundDetails.name",
          fundType: "$fundDetails.fundType",
          pendingAmount: { $subtract: ["$totalDueAmount", "$amountPaid"] }
        }
      },
      {
        $group: {
          _id: { fundName: "$fundName", fundType: "$fundType" },
          pendingDues: { $sum: "$pendingAmount" }
        }
      },
      { $sort: { pendingDues: -1 } }
    ]);

    res.send({
      totalCollected,
      totalSpent,
      currentBalance: totalCollected - totalSpent,
      totalPendingDues: totalPending,
      duesBreakdown: duesBreakdown.map(db => ({
        fundName: db._id.fundName,
        fundType: db._id.fundType,
        pendingDues: db.pendingDues
      }))
    });
  } catch (error) {
    res.status(500).send({ error: 'Server error fetching reports' });
  }
});

module.exports = router;
