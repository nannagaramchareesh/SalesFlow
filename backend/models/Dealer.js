const mongoose = require('mongoose');

const dealerSchema = mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    salesTeam: { type: String, required: true },
    belt: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Dealer', dealerSchema);
