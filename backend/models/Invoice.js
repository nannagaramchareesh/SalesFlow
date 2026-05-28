const mongoose = require('mongoose');

const invoiceSchema = mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    dealerName: { type: String, required: true },
    dateOfInvoice: { type: Date, required: true, default: Date.now },
    invoiceValue: { type: Number, required: true },
    balance: { type: Number, required: true },
    brand: { type: String, required: false },
    belt: { type: String, required: false },
    status: { type: String, required: true, default: 'Unpaid' }, // Unpaid, Partial, Paid
    chequeReturnAmount: { type: Number, default: 0 },
    chequeReturnDate: { type: Date },
    srCrValue: { type: Number, default: 0 },
    srNumber: { type: String },
    srDate: { type: Date },
    partPayments: [{
      amount: { type: Number, required: true },
      date: { type: Date, required: true, default: Date.now },
      paymentMode: { type: String }, // Cash, Online
      instrument: { type: String }, // RTGS, Cash, Cheque
      chequeNumber: { type: String },
      chequeDate: { type: Date },
      isBounced: { type: Boolean, default: false },
      bouncedDate: { type: Date }
    }]
  },
  { timestamps: true }
);

invoiceSchema.pre('validate', function() {
  // Auto-extract brand
  if (this.invoiceNumber && this.invoiceNumber.includes('-')) {
    this.brand = this.invoiceNumber.split('-')[0].trim();
  }

  // Calculate Total Received
  const totalReceived = (this.partPayments || []).reduce((sum, p) => sum + p.amount, 0);

  // Calculate Outstanding Balance
  let calculatedBalance = this.invoiceValue - totalReceived + (this.chequeReturnAmount || 0) - (this.srCrValue || 0);
  if (calculatedBalance < 0) calculatedBalance = 0;
  
  this.balance = calculatedBalance;

  // Set Status logically
  if (this.balance === 0) {
    this.status = 'Paid';
  } else if (totalReceived > 0 || (this.srCrValue || 0) > 0) {
    this.status = 'Partial';
  } else {
    this.status = 'Unpaid';
  }

});

module.exports = mongoose.model('Invoice', invoiceSchema);
