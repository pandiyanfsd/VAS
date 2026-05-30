// Run this ONCE to reset superadmin password in Atlas
// Usage: node reset_admin.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MONGO_URI = 'mongodb+srv://pandiyanfsd_db_user:iUNlgXbES6WfKGlg@cluster0.pzkddpr.mongodb.net/?appName=Cluster0';

async function resetAdmin() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to Atlas');

  const db = mongoose.connection.db;
  const admins = await db.collection('admins').find({}).toArray();
  console.log('Current admins in DB:', admins.map(a => ({ name: a.name, id: a._id })));

  if (admins.length === 0) {
    console.log('No admin found! Creating superadmin...');
    const hash = await bcrypt.hash('password123', 10);
    await db.collection('admins').insertOne({
      name: 'superadmin',
      password: hash,
      role: 'admin'
    });
    console.log('✅ Created superadmin with password: password123');
  } else {
    // Reset first admin's password
    const hash = await bcrypt.hash('password123', 10);
    await db.collection('admins').updateOne(
      { _id: admins[0]._id },
      { $set: { password: hash } }
    );
    console.log(`✅ Reset password for admin "${admins[0].name}" to: password123`);
  }

  await mongoose.disconnect();
  console.log('Done!');
}

resetAdmin().catch(console.error);
