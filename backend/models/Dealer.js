const mongoose = require('mongoose');

const dealerSchema = mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    salesTeam: { type: String, required: true },
    belt: { type: String, required: true },
    contactNumber: { type: String, required: false, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Dealer', dealerSchema);
