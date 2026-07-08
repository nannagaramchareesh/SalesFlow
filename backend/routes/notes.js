const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const { saveFile, getFile, deleteFile } = require('../utils/fileStorage');

// Get all notes (excluding large fileData for performance)
router.get('/', async (req, res) => {
  try {
    const notes = await Note.find().select('-fileData').sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a specific note (including fileData for downloading/viewing)
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    const responseData = note.toObject();
    responseData.fileData = getFile(note.fileData, note.fileType);
    res.json(responseData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new note
router.post('/', async (req, res) => {
  try {
    const { name, fileName, fileType, fileData } = req.body;
    const savedPath = saveFile(fileData);
    
    const note = new Note({
      name,
      fileName,
      fileType,
      fileData: savedPath
    });
    
    const newNote = await note.save();
    // Return the new note without the fileData to save network bandwidth
    const responseData = newNote.toObject();
    delete responseData.fileData;
    res.status(201).json(responseData);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a note
router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    
    deleteFile(note.fileData);
    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
