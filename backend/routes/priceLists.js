const express = require('express');
const router = express.Router();
const PriceList = require('../models/PriceList');
const { saveFile, getFile, deleteFile } = require('../utils/fileStorage');

// Get all price lists (excluding large fileData for performance)
router.get('/', async (req, res) => {
  try {
    const priceLists = await PriceList.find().select('-fileData').sort({ createdAt: -1 });
    res.json(priceLists);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a specific price list (including fileData for downloading)
router.get('/:id', async (req, res) => {
  try {
    const priceList = await PriceList.findById(req.params.id);
    if (!priceList) {
      return res.status(404).json({ message: 'Price list not found' });
    }
    const responseData = priceList.toObject();
    responseData.fileData = getFile(priceList.fileData, priceList.fileType);
    res.json(responseData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new price list
router.post('/', async (req, res) => {
  try {
    const { name, fileName, fileType, fileData } = req.body;
    const savedPath = saveFile(fileData);
    
    const priceList = new PriceList({
      name,
      fileName,
      fileType,
      fileData: savedPath
    });
    
    const newPriceList = await priceList.save();
    // Return the new price list without the fileData to save network bandwidth
    const responseData = newPriceList.toObject();
    delete responseData.fileData;
    res.status(201).json(responseData);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a price list
router.delete('/:id', async (req, res) => {
  try {
    const priceList = await PriceList.findById(req.params.id);
    if (!priceList) {
      return res.status(404).json({ message: 'Price list not found' });
    }
    
    deleteFile(priceList.fileData);
    await PriceList.findByIdAndDelete(req.params.id);
    res.json({ message: 'Price list deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
