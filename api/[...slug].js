const path = require('path');
// Load env from server/.env for local testing (Vercel uses its own env vars)
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const app = require('../server/index');

module.exports = app;
