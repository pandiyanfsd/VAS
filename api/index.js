const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
} catch (e) {}

const app = require('../server/index');

module.exports = (req, res) => {
  if (req.headers['x-matched-path']) {
    req.url = req.headers['x-matched-path'];
  }
  return app(req, res);
};
