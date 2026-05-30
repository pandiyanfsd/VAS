const path = require('path');
// Load env from server/.env for local testing (Vercel uses its own env vars)
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const mongoose = require('mongoose');
const app = require('../server/index');

// Ensure DB is connected before handling request (avoids cold start query failures)
module.exports = async (req, res) => {
  // Wait for connection if still pending
  if (mongoose.connection.readyState === 0) {
    await new Promise((resolve, reject) => {
      mongoose.connection.once('connected', resolve);
      mongoose.connection.once('error', reject);
      setTimeout(reject, 8000); // 8s timeout safety net
    });
  }
  return app(req, res);
};
