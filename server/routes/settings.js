const express = require('express');
const router = express.Router();
const { Setting } = require('../models/setting');

// GET a setting by key (returns null value if not set yet)
router.get('/:key', async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: req.params.key });
    res.send({ key: req.params.key, value: setting ? setting.value : null });
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// PUT (upsert) a setting value by key
router.put('/:key', async (req, res) => {
  try {
    const { value } = req.body;
    const setting = await Setting.findOneAndUpdate(
      { key: req.params.key },
      { value },
      { upsert: true, new: true }
    );
    res.send(setting);
  } catch (error) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
