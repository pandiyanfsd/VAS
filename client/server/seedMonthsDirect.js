const mongoose = require('mongoose');
const { Fund } = require('./models/fund');
const { Member } = require('./models/member');
const { MemberFundDue } = require('./models/memberFundDue');

const MONGO_URI = 'mongodb://localhost:27017/VAS_NEW';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Fetch all active members
    const members = await Member.find({ role: 'member' });
    console.log(`Found ${members.length} members to assign dues.`);

    const months = [1, 2, 3, 4, 5];
    const year = 2026;
    const targetAmount = 500;
    const name = 'MAINTENANCE FUND';

    for (const month of months) {
      // Set realistic created and due dates
      const createdAt = new Date(year, month - 1, 1, 9, 0, 0);
      const dueDate = new Date(year, month - 1, 15, 18, 30, 0);

      const fund = new Fund({
        name,
        description: 'Monthly maintenance charges',
        targetAmount,
        fundType: 'Monthly',
        year,
        month,
        createdAt,
        dueDate
      });

      await fund.save();
      console.log(`Created Monthly Fund: ${name} (${month}/${year})`);

      // Generate unpaid dues for each member
      const dues = members.map(member => ({
        memberId: member._id,
        fundId: fund._id,
        totalDueAmount: targetAmount,
        status: 'unpaid'
      }));

      if (dues.length > 0) {
        await MemberFundDue.insertMany(dues);
        console.log(`Assigned dues to ${dues.length} members for ${month}/${year}.`);
      }
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed.');
  }
}

seed();
