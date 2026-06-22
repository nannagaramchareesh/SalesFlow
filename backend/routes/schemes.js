const express = require('express');
const router = express.Router();
const Scheme = require('../models/Scheme');

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
    res.json(scheme);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new scheme
router.post('/', async (req, res) => {
  const scheme = new Scheme(req.body);
  try {
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
    const scheme = await Scheme.findByIdAndDelete(req.params.id);
    if (!scheme) {
      return res.status(404).json({ message: 'Scheme not found' });
    }
    res.json({ message: 'Scheme deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
