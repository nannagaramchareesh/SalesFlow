const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');
const { saveFile, getFile, deleteFile } = require('../utils/fileStorage');

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
    const responseData = stock.toObject();
    responseData.fileData = getFile(stock.fileData, stock.fileType);
    res.json(responseData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new stock
router.post('/', async (req, res) => {
  try {
    const { name, fileName, fileType, fileData } = req.body;
    const savedPath = saveFile(fileData);
    
    const stock = new Stock({
      name,
      fileName,
      fileType,
      fileData: savedPath
    });
    
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
    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }
    
    deleteFile(stock.fileData);
    await Stock.findByIdAndDelete(req.params.id);
    res.json({ message: 'Stock deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
