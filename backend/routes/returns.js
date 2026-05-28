const express = require('express');
const router = express.Router();
const Return = require('../models/Return');

// Get all returns
router.get('/', async (req, res) => {
  try {
    const returns = await Return.find().sort({ createdAt: -1 });
    res.json(returns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new return
router.post('/', async (req, res) => {
  const returnItem = new Return(req.body);
  try {
    const newReturn = await returnItem.save();
    res.status(201).json(newReturn);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
