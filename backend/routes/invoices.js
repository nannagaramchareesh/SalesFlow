const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new invoice
router.post('/', async (req, res) => {
  const invoice = new Invoice(req.body);
  try {
    const newInvoice = await invoice.save();
    res.status(201).json(newInvoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Bulk create invoices
router.post('/bulk', async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ message: 'Request body must be an array' });
    }
    
    // Using ordered: false so that if some invoices fail (e.g. duplicates), the rest are still saved.
    const newInvoices = await Invoice.insertMany(req.body, { ordered: false });
    res.status(201).json(newInvoices);
  } catch (err) {
    if (err.name === 'BulkWriteError' || err.writeErrors) {
      const insertedCount = err.result ? err.result.nInserted : 0;
      res.status(207).json({
        message: 'Some invoices failed to insert (possibly duplicates).',
        insertedCount,
        errors: (err.writeErrors || []).map(e => e.errmsg)
      });
    } else {
      res.status(400).json({ message: err.message });
    }
  }
});

// Update an invoice
router.put('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    Object.assign(invoice, req.body);
    const updatedInvoice = await invoice.save();
    res.json(updatedInvoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete an invoice
router.delete('/:id', async (req, res) => {
  try {
    const deletedInvoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!deletedInvoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a payment to an invoice
router.post('/:id/payments', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const paymentAmount = Number(req.body.amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    // Add payment to array
    invoice.partPayments.push({
      amount: paymentAmount,
      date: req.body.date || new Date(),
      paymentMode: req.body.paymentMode,
      instrument: req.body.instrument,
      chequeNumber: req.body.chequeNumber,
      chequeDate: req.body.chequeDate,
      chequeImage: req.body.chequeImage
    });

    const updatedInvoice = await invoice.save();
    res.json(updatedInvoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update returns on an invoice
router.post('/:id/returns', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const bouncedChequeIds = req.body.bouncedChequeIds || (req.body.bouncedChequeId ? [req.body.bouncedChequeId] : []);
    const chequeReturnDate = req.body.chequeReturnDate || null;
    let chequeReturnAmount = 0;

    // If date is cleared, reset all bounced cheques
    if (!chequeReturnDate) {
      if (invoice.partPayments && invoice.partPayments.length > 0) {
        invoice.partPayments.forEach(p => {
          p.isBounced = false;
          p.bouncedDate = null;
        });
      }
    } else {
      // Mark newly checked cheques as bounced (existing ones remain bounced)
      if (invoice.partPayments && invoice.partPayments.length > 0) {
        invoice.partPayments.forEach(p => {
          if (bouncedChequeIds.includes(p._id.toString())) {
            p.isBounced = true;
            p.bouncedDate = chequeReturnDate || new Date();
          }
        });
      }
    }

    // Sum all bounced cheques
    if (invoice.partPayments && invoice.partPayments.length > 0) {
      invoice.partPayments.forEach(p => {
        if (p.isBounced) {
          chequeReturnAmount += p.amount;
        }
      });
    }

    // Add custom amount if specified
    if (bouncedChequeIds.includes('custom')) {
      chequeReturnAmount += Number(req.body.chequeReturnAmount) || 0;
    }

    invoice.chequeReturnAmount = chequeReturnAmount;
    invoice.chequeReturnDate = chequeReturnDate;
    
    invoice.srCrValue = Number(req.body.srCrValue) || 0;
    invoice.srNumber = req.body.srNumber || '';
    invoice.srDate = req.body.srDate || null;

    const updatedInvoice = await invoice.save();
    res.json(updatedInvoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
