const cron = require('node-cron');
const { Fund } = require('./models/fund');
const { Member } = require('./models/member');
const { MemberFundDue } = require('./models/memberFundDue');

// Run on the 1st day of every month at 00:01 AM
cron.schedule('1 0 1 * *', async () => {
  try {
    console.log('Running monthly fund generation cron job...');
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // Find the most recent Monthly fund to use as a template (name and amount)
    const lastMonthlyFund = await Fund.findOne({ fundType: 'Monthly' }).sort({ createdAt: -1 });

    if (!lastMonthlyFund) {
      console.log('No previous Monthly fund found to act as template. Skipping auto-generation.');
      return;
    }

    // Check if the fund for this month already exists
    const existingFund = await Fund.findOne({ 
      fundType: 'Monthly', 
      year: currentYear, 
      month: currentMonth,
      name: lastMonthlyFund.name
    });

    if (existingFund) {
      console.log(`Monthly fund for ${currentMonth}/${currentYear} already exists. Skipping.`);
      return;
    }

    // Create the new fund
    const newFund = new Fund({
      name: lastMonthlyFund.name,
      description: `Auto-generated monthly fund for ${currentMonth}/${currentYear}`,
      targetAmount: lastMonthlyFund.targetAmount,
      fundType: 'Monthly',
      year: currentYear,
      month: currentMonth
    });
    
    await newFund.save();

    // Assign dues to all active members
    const members = await Member.find({ role: 'member' });
    const dues = members.map(member => ({
      memberId: member._id,
      fundId: newFund._id,
      totalDueAmount: newFund.targetAmount,
      status: 'unpaid'
    }));

    if (dues.length > 0) {
      await MemberFundDue.insertMany(dues);
    }
    console.log(`Successfully auto-generated monthly fund and dues for ${currentMonth}/${currentYear}.`);
  } catch (error) {
    console.error('Error in monthly fund cron job:', error);
  }
});
