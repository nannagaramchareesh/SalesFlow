const mongoose = require('mongoose');

const invoiceSchema = mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    dealerName: { type: String, required: true },
    dateOfInvoice: { type: Date, required: true, default: Date.now },
    invoiceValueBeforeTax: { type: Number, required: false },
    invoiceValue: { type: Number, required: true },
    balance: { type: Number, required: true },
    brand: { type: String, required: false },
    month: { type: String, required: false },
    belt: { type: String, required: false },
    salesTeam: { type: String, required: false },
    invoiceImage: { type: String },
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

  // Auto-extract month from dateOfInvoice
  if (this.dateOfInvoice) {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const dateObj = new Date(this.dateOfInvoice);
    if (!isNaN(dateObj.getTime())) {
      this.month = months[dateObj.getMonth()];
    }
  }

  // Calculate Total Received (excluding bounced payments)
  const totalReceived = (this.partPayments || [])
    .filter(p => !p.isBounced)
    .reduce((sum, p) => sum + p.amount, 0);

  // Calculate sum of bounced payments
  const bouncedReceived = (this.partPayments || [])
    .filter(p => p.isBounced)
    .reduce((sum, p) => sum + p.amount, 0);

  // Custom returned amount (excluding bounced cheques)
  const customReturn = Math.max(0, (this.chequeReturnAmount || 0) - bouncedReceived);

  // Calculate Outstanding Balance (add back the customReturn charges/fees, subtract non-bounced payments and credits)
  let calculatedBalance = this.invoiceValue - totalReceived - (this.srCrValue || 0) + customReturn;
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
