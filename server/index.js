const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config({ path: __dirname + '/.env' });

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const { createSuperAdmin } = require('./services/superAdmin');

// Database connection with caching for Serverless environments (Vercel)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/VAS_NEW';

let cachedMongoose = global.mongoose;
if (!cachedMongoose) {
  cachedMongoose = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cachedMongoose.conn) {
    return cachedMongoose.conn;
  }
  if (!cachedMongoose.promise) {
    const opts = {
      bufferCommands: false,
    };
    cachedMongoose.promise = mongoose.connect(MONGO_URI, opts).then((mongooseInstance) => {
      console.log('✅ Connected to MongoDB');
      createSuperAdmin(); // Seed the initial admin user
      return mongooseInstance;
    });
  }
  try {
    cachedMongoose.conn = await cachedMongoose.promise;
  } catch (err) {
    cachedMongoose.promise = null;
    throw err;
  }
  return cachedMongoose.conn;
}

// Connect immediately in non-production/local environments
if (process.env.VERCEL !== '1') {
  connectDB().catch(err => console.error('❌ Could not connect to MongoDB:', err));
}

// Database Connection Middleware for Vercel Serverless Function lifecycle
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('❌ Database connection middleware error:', err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Route Imports
const authRoutes = require('./routes/auth');
const fundRoutes = require('./routes/funds');
const dueRoutes = require('./routes/dues');
const paymentRoutes = require('./routes/payments');
const expenseRoutes = require('./routes/expenses');
const memberRoutes = require('./routes/members');
const cashierRoutes = require('./routes/cashiers');
const reportRoutes = require('./routes/reports');
const surrenderRoutes = require('./routes/surrenders');
const settingRoutes = require('./routes/settings');

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/funds', fundRoutes);
app.use('/api/dues', dueRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/cashiers', cashierRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/surrenders', surrenderRoutes);
app.use('/api/settings', settingRoutes);

// Simple health check
app.get('/', (req, res) => {
  res.send('VAS API is running...');
});

const PORT = process.env.PORT || 5000;
require('./cron');
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}...`));

module.exports = app;
