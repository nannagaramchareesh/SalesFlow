const mongoose = require('mongoose');

const collectionSchema = mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true },
    dealerName: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, required: true }, // Cash, Cheque, Bank Transfer
    referenceNumber: { type: String }, // Cheque number or transfer ref
  },
  { timestamps: true }
);

module.exports = mongoose.model('Collection', collectionSchema);
