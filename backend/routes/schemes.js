const express = require('express');
const router = express.Router();
const Scheme = require('../models/Scheme');
const { saveFile, getFile, deleteFile } = require('../utils/fileStorage');

// Get all schemes (excluding large fileData for performance)
router.get('/', async (req, res) => {
  try {
    const schemes = await Scheme.find().select('-fileData').sort({ createdAt: -1 });
    res.json(schemes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a specific scheme (including fileData for downloading/viewing)
router.get('/:id', async (req, res) => {
  try {
    const scheme = await Scheme.findById(req.params.id);
    if (!scheme) {
      return res.status(404).json({ message: 'Scheme not found' });
    }
    const responseData = scheme.toObject();
    responseData.fileData = getFile(scheme.fileData, scheme.fileType);
    res.json(responseData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new scheme
router.post('/', async (req, res) => {
  try {
    const { name, fileName, fileType, fileData } = req.body;
    const savedPath = saveFile(fileData);
    
    const scheme = new Scheme({
      name,
      fileName,
      fileType,
      fileData: savedPath
    });
    
    const newScheme = await scheme.save();
    // Return the new scheme without the fileData to save network bandwidth
    const responseData = newScheme.toObject();
    delete responseData.fileData;
    res.status(201).json(responseData);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a scheme
router.delete('/:id', async (req, res) => {
  try {
    const scheme = await Scheme.findById(req.params.id);
    if (!scheme) {
      return res.status(404).json({ message: 'Scheme not found' });
    }
    
    deleteFile(scheme.fileData);
    await Scheme.findByIdAndDelete(req.params.id);
    res.json({ message: 'Scheme deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
