const path = require('path');
// Load local env if present
try {
  require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
} catch (e) {}

const app = require('../server/index');

module.exports = app;
