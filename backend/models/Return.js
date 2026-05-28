const mongoose = require('mongoose');

const returnSchema = mongoose.Schema(
  {
    returnNumber: { type: String, required: true, unique: true },
    dealerName: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    type: { type: String, required: true }, // CR (Credit Note), SR (Sales Return), Cheque Return
    amount: { type: Number, required: true },
    reason: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Return', returnSchema);
