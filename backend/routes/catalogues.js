const express = require('express');
const router = express.Router();
const Catalogue = require('../models/Catalogue');
const { saveFile, getFile, deleteFile } = require('../utils/fileStorage');

// Get all catalogues (excluding large fileData for performance)
router.get('/', async (req, res) => {
  try {
    const catalogues = await Catalogue.find().select('-fileData').sort({ createdAt: -1 });
    res.json(catalogues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a specific catalogue (including fileData for viewing)
router.get('/:id', async (req, res) => {
  try {
    const catalogue = await Catalogue.findById(req.params.id);
    if (!catalogue) {
      return res.status(404).json({ message: 'Catalogue not found' });
    }
    const responseData = catalogue.toObject();
    responseData.fileData = getFile(catalogue.fileData, catalogue.fileType);
    res.json(responseData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new catalogue
router.post('/', async (req, res) => {
  try {
    const { name, fileName, fileType, fileData } = req.body;
    const savedPath = saveFile(fileData);
    
    const catalogue = new Catalogue({
      name,
      fileName,
      fileType,
      fileData: savedPath
    });
    
    const newCatalogue = await catalogue.save();
    // Return the new catalogue without the fileData to save network bandwidth
    const responseData = newCatalogue.toObject();
    delete responseData.fileData;
    res.status(201).json(responseData);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a catalogue
router.delete('/:id', async (req, res) => {
  try {
    const catalogue = await Catalogue.findById(req.params.id);
    if (!catalogue) {
      return res.status(404).json({ message: 'Catalogue not found' });
    }
    
    deleteFile(catalogue.fileData);
    await Catalogue.findByIdAndDelete(req.params.id);
    res.json({ message: 'Catalogue deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
