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

// Database connection with caching for Vercel serverless
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/VAS_NEW';

let isConnected = false;

async function connectDB() {
  // Reuse existing connection if available (critical for serverless cold starts)
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }
  // Use global cache to survive across warm serverless invocations
  if (global._mongooseConnection) {
    await global._mongooseConnection;
    isConnected = true;
    return;
  }
  global._mongooseConnection = mongoose.connect(MONGO_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  await global._mongooseConnection;
  isConnected = true;
  console.log('✅ Connected to MongoDB');
  createSuperAdmin();
}

// Connect immediately when module loads
connectDB().catch(err => console.error('❌ Could not connect to MongoDB:', err));

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
if (process.env.NODE_ENV !== 'production') {
  require('./cron'); // Only run cron locally (not on Vercel serverless)
  app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}...`));
}

module.exports = app;
