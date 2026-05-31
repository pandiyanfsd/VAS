const { Member } = require('../models/member');
const { Fund } = require('../models/fund');
const { MemberFundDue } = require('../models/memberFundDue');

let lastHealTime = 0;

/**
 * Dynamic database self-healing for missing dues invoices.
 * If force is false, it uses a 60-second cache/throttle to avoid overloading the DB on read queries.
 */
const healDues = async (force = false) => {
  try {
    const now = Date.now();
    if (!force && now - lastHealTime < 60000) {
      return; // Skip execution if throttled
    }
    lastHealTime = now;

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

    // 2. Compare in-memory (extremely fast)
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
      console.log(`[Self-Healing] Generated ${bulkOps.length} missing due invoices.`);
    }
  } catch (err) {
    console.error("[Self-Healing] Error auto-generating missing dues:", err);
  }
};

module.exports = { healDues };
