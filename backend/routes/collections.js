const express = require('express');
const router = express.Router();
const Collection = require('../models/Collection');

// Get all collections
router.get('/', async (req, res) => {
  try {
    const collections = await Collection.find().sort({ createdAt: -1 });
    res.json(collections);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new collection
router.post('/', async (req, res) => {
  const collection = new Collection(req.body);
  try {
    const newCollection = await collection.save();
    res.status(201).json(newCollection);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
