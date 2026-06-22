const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');

// Get all stocks (excluding large fileData for performance)
router.get('/', async (req, res) => {
  try {
    const stocks = await Stock.find().select('-fileData').sort({ createdAt: -1 });
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a specific stock (including fileData for downloading/viewing)
router.get('/:id', async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }
    res.json(stock);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new stock
router.post('/', async (req, res) => {
  const stock = new Stock(req.body);
  try {
    const newStock = await stock.save();
    // Return the new stock without the fileData to save network bandwidth
    const responseData = newStock.toObject();
    delete responseData.fileData;
    res.status(201).json(responseData);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a stock
router.delete('/:id', async (req, res) => {
  try {
    const stock = await Stock.findByIdAndDelete(req.params.id);
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }
    res.json({ message: 'Stock deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
