// hash_existing_passwords.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const { Admin } = require('./models/admin');

const { Cashier } = require('./models/cashier');
const { Member } = require('./models/member');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/VAS_NEW';

async function hashIfPlain(doc) {
  if (doc.password && !doc.password.startsWith('$2')) {
    const salt = await bcrypt.genSalt(10);
    doc.password = await bcrypt.hash(doc.password, salt);
    await doc.save();
    console.log(`✔️ Updated ${doc.constructor.modelName} ${doc._id}`);
  }
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('🔗 Connected to DB');

  const admins = await Admin.find();
  const cashiers = await Cashier.find();
  const members = await Member.find();

  for (const a of admins) await hashIfPlain(a);
  for (const c of cashiers) await hashIfPlain(c);
  for (const m of members) await hashIfPlain(m);

  console.log('✅ All passwords processed');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
