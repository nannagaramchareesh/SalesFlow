/**
 * Calculates overdue days based on the invoice date and current date.
 */
export const calculateOverdueDays = (dateStr) => {
  if (!dateStr) return 0;
  const invoiceDate = new Date(dateStr);
  const today = new Date();
  // Reset time portion for accurate day calculation
  invoiceDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  if (invoiceDate > today) return 0;
  
  const diffTime = Math.abs(today - invoiceDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Calculates the total received amount for a single invoice.
 */
export const calculateTotalReceived = (invoice) => {
  if (!invoice || !invoice.partPayments) return 0;
  return invoice.partPayments.reduce((sum, p) => sum + p.amount, 0);
};

/**
 * Calculates total outstanding balance for a dealer, or all if no dealer provided.
 */
export const calculateDealerTotalOutstanding = (invoices, dealerName = null) => {
  if (!invoices) return 0;
  const filtered = dealerName ? invoices.filter(inv => inv.dealerName === dealerName) : invoices;
  return filtered.reduce((acc, curr) => acc + (curr.balance !== undefined ? curr.balance : (curr.invoiceValue || 0)), 0);
};

/**
 * Counts the number of overdue (unpaid) bills for a dealer, or all if no dealer provided.
 */
export const countOverdueBills = (invoices, dealerName = null) => {
  if (!invoices) return 0;
  const filtered = dealerName ? invoices.filter(inv => inv.dealerName === dealerName) : invoices;
  return filtered.filter(inv => inv.status !== 'Paid' && calculateOverdueDays(inv.dateOfInvoice || inv.date) > 0).length;
};
