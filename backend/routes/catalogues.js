const express = require('express');
const router = express.Router();
const Catalogue = require('../models/Catalogue');

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
    res.json(catalogue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new catalogue
router.post('/', async (req, res) => {
  const catalogue = new Catalogue(req.body);
  try {
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
    const catalogue = await Catalogue.findByIdAndDelete(req.params.id);
    if (!catalogue) {
      return res.status(404).json({ message: 'Catalogue not found' });
    }
    res.json({ message: 'Catalogue deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
