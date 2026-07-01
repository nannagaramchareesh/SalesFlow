const mongoose = require('mongoose');

const invoiceSchema = mongoose.Schema(
  {
    invoiceNumber: { type: String, required: false, unique: true, sparse: true },
    dealerName: { type: String, required: false },
    dateOfInvoice: { type: Date, required: false, default: Date.now },
    invoiceValueBeforeTax: { type: Number, required: false },
    invoiceValue: { type: Number, required: false, default: 0 },
    balance: { type: Number, required: false, default: 0 },
    brand: { type: String, required: false },
    month: { type: String, required: false },
    belt: { type: String, required: false },
    salesTeam: { type: String, required: false },
    invoiceImage: { type: String },
    status: { type: String, required: false, default: 'Unpaid' }, // Unpaid, Partial, Paid
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
      chequeImage: { type: String },
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
  const invoiceValue = this.invoiceValue || 0;
  let calculatedBalance = invoiceValue - totalReceived - (this.srCrValue || 0) + customReturn;
  if (isNaN(calculatedBalance) || calculatedBalance < 0) {
    calculatedBalance = 0;
  }
  
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
