const mongoose = require('mongoose');

const stockSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileData: { type: String, required: true }, // base64 string
  },
  { timestamps: true }
);

module.exports = mongoose.model('Stock', stockSchema);
