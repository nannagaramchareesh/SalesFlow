import axios from 'axios';
import { getDealerDetails } from './dealers';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Fallback Mock Data
let mockInvoices = [
  { _id: '1', invoiceNumber: 'INV-1001', dealerName: 'Acme Corp', invoiceValueBeforeTax: 12711.86, invoiceValue: 15000, balance: 15000, brand: 'Nike', belt: 'Leather', salesTeam: 'North Sales Team', status: 'Unpaid', dateOfInvoice: '2026-05-10T10:00:00Z' },
  { _id: '2', invoiceNumber: 'INV-1002', dealerName: 'TechFlow Solutions', invoiceValueBeforeTax: 7203.39, invoiceValue: 8500, balance: 0, brand: 'Adidas', belt: 'Nylon', salesTeam: 'East Sales Team', status: 'Paid', dateOfInvoice: '2026-05-12T14:30:00Z' },
  { _id: '3', invoiceNumber: 'INV-1003', dealerName: 'Global Industries', invoiceValueBeforeTax: 20338.98, invoiceValue: 24000, balance: 12000, brand: 'Puma', belt: 'Canvas', salesTeam: 'South Sales Team', status: 'Partial', dateOfInvoice: '2026-05-14T09:15:00Z' },
];

let mockCollections = [
  { _id: '1', receiptNumber: 'REC-2001', dealerName: 'TechFlow Solutions', amount: 8500, paymentMethod: 'Bank Transfer', date: '2026-05-13T10:00:00Z' },
];

let mockReturns = [];

// API Functions with fallback
export const getInvoices = async () => {
  try {
    const res = await axios.get(`${API_URL}/invoices`);
    return res.data;
  } catch (error) {
    console.warn("Backend unavailable, using mock data");
    return mockInvoices;
  }
};

export const createInvoice = async (data) => {
  try {
    const res = await axios.post(`${API_URL}/invoices`, data);
    return res.data;
  } catch (error) {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const dateVal = data.dateOfInvoice || new Date().toISOString();
    const dateObj = new Date(dateVal);
    const month = !isNaN(dateObj.getTime()) ? months[dateObj.getMonth()] : '';
    const newInv = { 
      ...data, 
      _id: Date.now().toString(), 
      status: 'Unpaid', 
      dateOfInvoice: dateVal,
      month: data.month || month
    };
    mockInvoices.unshift(newInv);
    return newInv;
  }
};

export const createBulkInvoices = async (dataList) => {
  try {
    const res = await axios.post(`${API_URL}/invoices/bulk`, dataList);
    return res.data;
  } catch (error) {
    const newInvoices = dataList.map((inv, idx) => {
      const brand = inv.invoiceNumber && inv.invoiceNumber.includes('-') ? inv.invoiceNumber.split('-')[0].trim() : '';
      const invoiceVal = Number(inv.invoiceValue) || 0;
      const dealerDetail = getDealerDetails(inv.dealerName);
      const belt = inv.belt || (dealerDetail ? dealerDetail.belt : '');
      const salesTeam = inv.salesTeam || (dealerDetail ? dealerDetail.salesTeam : '');
      
      const dateVal = inv.dateOfInvoice || new Date().toISOString();
      const dateObj = new Date(dateVal);
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const month = !isNaN(dateObj.getTime()) ? months[dateObj.getMonth()] : '';

      return {
        ...inv,
        _id: (Date.now() + idx).toString(),
        brand,
        month,
        belt,
        salesTeam,
        invoiceValueBeforeTax: Number(inv.invoiceValueBeforeTax) || 0,
        invoiceValue: invoiceVal,
        balance: invoiceVal,
        status: 'Unpaid',
        dateOfInvoice: dateVal,
        partPayments: []
      };
    });
    const uniqueNew = newInvoices.filter(newInv => !mockInvoices.some(existing => existing.invoiceNumber === newInv.invoiceNumber));
    mockInvoices = [...uniqueNew, ...mockInvoices];
    if (uniqueNew.length < newInvoices.length) {
      return {
        message: 'Some invoices failed to insert (possibly duplicates).',
        insertedCount: uniqueNew.length,
        errors: ['Duplicate invoice numbers found in mock database.']
      };
    }
    return uniqueNew;
  }
};

export const updateInvoice = async (id, data) => {
  try {
    const res = await axios.put(`${API_URL}/invoices/${id}`, data);
    return res.data;
  } catch (error) {
    const index = mockInvoices.findIndex(inv => inv._id === id);
    if (index !== -1) {
      mockInvoices[index] = { ...mockInvoices[index], ...data };
      return mockInvoices[index];
    }
    throw new Error('Invoice not found');
  }
};

export const deleteInvoice = async (id) => {
  try {
    const res = await axios.delete(`${API_URL}/invoices/${id}`);
    return res.data;
  } catch (error) {
    mockInvoices = mockInvoices.filter(inv => inv._id !== id);
    return { message: 'Invoice deleted successfully' };
  }
};

export const addInvoicePayment = async (id, paymentData) => {
  try {
    const res = await axios.post(`${API_URL}/invoices/${id}/payments`, paymentData);
    return res.data;
  } catch (error) {
    const index = mockInvoices.findIndex(inv => inv._id === id);
    if (index !== -1) {
      const inv = mockInvoices[index];
      const newPayment = { ...paymentData, date: paymentData.date || new Date().toISOString() };
      inv.partPayments = inv.partPayments || [];
      inv.partPayments.push(newPayment);
      inv.balance = Math.max(0, inv.balance - paymentData.amount);
      if (inv.balance === 0) inv.status = 'Paid';
      else if (inv.balance < inv.invoiceValue) inv.status = 'Partial';
      mockInvoices[index] = { ...inv };
      return inv;
    }
    throw new Error('Invoice not found');
  }
};

export const getCollections = async () => {
  try {
    const res = await axios.get(`${API_URL}/collections`);
    return res.data;
  } catch (error) {
    return mockCollections;
  }
};

export const createCollection = async (data) => {
  try {
    const res = await axios.post(`${API_URL}/collections`, data);
    return res.data;
  } catch (error) {
    const newCol = { ...data, _id: Date.now().toString(), date: new Date().toISOString() };
    mockCollections.unshift(newCol);
    return newCol;
  }
};

export const getReturns = async () => {
  try {
    const res = await axios.get(`${API_URL}/returns`);
    return res.data;
  } catch (error) {
    return mockReturns;
  }
};

export const createReturn = async (data) => {
  try {
    const res = await axios.post(`${API_URL}/returns`, data);
    return res.data;
  } catch (error) {
    const newRet = { ...data, _id: Date.now().toString(), date: new Date().toISOString() };
    mockReturns.unshift(newRet);
    return newRet;
  }
};

export const updateInvoiceReturns = async (id, returnData) => {
  try {
    const res = await axios.post(`${API_URL}/invoices/${id}/returns`, returnData);
    return res.data;
  } catch (error) {
    const index = mockInvoices.findIndex(inv => inv._id === id);
    if (index !== -1) {
      const inv = mockInvoices[index];
      const bouncedChequeIds = returnData.bouncedChequeIds || (returnData.bouncedChequeId ? [returnData.bouncedChequeId] : []);
      const chequeReturnDate = returnData.chequeReturnDate;
      let chequeReturnAmount = 0;

      // If date is cleared, reset all bounced cheques
      if (!chequeReturnDate) {
        if (inv.partPayments && inv.partPayments.length > 0) {
          inv.partPayments.forEach(p => {
            p.isBounced = false;
            p.bouncedDate = null;
          });
        }
      } else {
        // Mark newly checked cheques as bounced
        if (inv.partPayments && inv.partPayments.length > 0) {
          inv.partPayments.forEach(p => {
            if (bouncedChequeIds.includes(p._id)) {
              p.isBounced = true;
              p.bouncedDate = chequeReturnDate || new Date().toISOString();
            }
          });
        }
      }

      // Sum all bounced cheques
      if (inv.partPayments && inv.partPayments.length > 0) {
        inv.partPayments.forEach(p => {
          if (p.isBounced) {
            chequeReturnAmount += p.amount;
          }
        });
      }

      // Add custom amount if specified
      if (bouncedChequeIds.includes('custom')) {
        chequeReturnAmount += Number(returnData.chequeReturnAmount) || 0;
      }

      inv.chequeReturnAmount = chequeReturnAmount;
      inv.chequeReturnDate = chequeReturnDate || null;
      inv.srCrValue = Number(returnData.srCrValue) || 0;
      if (returnData.srNumber) inv.srNumber = returnData.srNumber;
      if (returnData.srDate) inv.srDate = returnData.srDate;
      
      const totalReceived = (inv.partPayments || [])
        .filter(p => !p.isBounced)
        .reduce((sum, p) => sum + p.amount, 0);

      const bouncedReceived = (inv.partPayments || [])
        .filter(p => p.isBounced)
        .reduce((sum, p) => sum + p.amount, 0);

      const customReturn = Math.max(0, inv.chequeReturnAmount - bouncedReceived);

      let newBalance = inv.invoiceValue - totalReceived - inv.srCrValue + customReturn;
      if (newBalance < 0) newBalance = 0;
      inv.balance = newBalance;
      
      if (inv.balance === 0) inv.status = 'Paid';
      else if (totalReceived > 0 || inv.srCrValue > 0) inv.status = 'Partial';
      else inv.status = 'Unpaid';
      
      mockInvoices[index] = { ...inv };
      return inv;
    }
    throw new Error('Invoice not found');
  }
};

export const getDealers = async () => {
  try {
    const res = await axios.get(`${API_URL}/dealers`);
    return res.data;
  } catch (error) {
    console.warn("Backend unavailable, using static dealers list");
    return [];
  }
};

export const createDealer = async (data) => {
  try {
    const res = await axios.post(`${API_URL}/dealers`, data);
    return res.data;
  } catch (error) {
    console.error("Error creating dealer:", error);
    throw error;
  }
};

export const deleteDealer = async (id) => {
  try {
    const res = await axios.delete(`${API_URL}/dealers/${id}`);
    return res.data;
  } catch (error) {
    console.error("Error deleting dealer:", error);
    throw error;
  }
};

let mockCatalogues = [];

export const getCatalogues = async () => {
  try {
    const res = await axios.get(`${API_URL}/catalogues`);
    return res.data;
  } catch (error) {
    console.warn("Backend unavailable, using mock catalogues");
    return mockCatalogues.map(c => {
      const copy = { ...c };
      delete copy.fileData;
      return copy;
    });
  }
};

export const getCatalogueById = async (id) => {
  try {
    const res = await axios.get(`${API_URL}/catalogues/${id}`);
    return res.data;
  } catch (error) {
    const found = mockCatalogues.find(c => c._id === id);
    if (!found) throw new Error("Catalogue not found");
    return found;
  }
};

export const createCatalogue = async (data) => {
  try {
    const res = await axios.post(`${API_URL}/catalogues`, data);
    return res.data;
  } catch (error) {
    const newCat = {
      ...data,
      _id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    mockCatalogues.unshift(newCat);
    const responseData = { ...newCat };
    delete responseData.fileData;
    return responseData;
  }
};

export const deleteCatalogue = async (id) => {
  try {
    const res = await axios.delete(`${API_URL}/catalogues/${id}`);
    return res.data;
  } catch (error) {
    mockCatalogues = mockCatalogues.filter(c => c._id !== id);
    return { message: "Catalogue deleted successfully" };
  }
};

let mockPriceLists = [];

export const getPriceLists = async () => {
  try {
    const res = await axios.get(`${API_URL}/price-lists`);
    return res.data;
  } catch (error) {
    console.warn("Backend unavailable, using mock price lists");
    return mockPriceLists.map(c => {
      const copy = { ...c };
      delete copy.fileData;
      return copy;
    });
  }
};

export const getPriceListById = async (id) => {
  try {
    const res = await axios.get(`${API_URL}/price-lists/${id}`);
    return res.data;
  } catch (error) {
    const found = mockPriceLists.find(c => c._id === id);
    if (!found) throw new Error("Price list not found");
    return found;
  }
};

export const createPriceList = async (data) => {
  try {
    const res = await axios.post(`${API_URL}/price-lists`, data);
    return res.data;
  } catch (error) {
    const newPriceList = {
      ...data,
      _id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    mockPriceLists.unshift(newPriceList);
    const responseData = { ...newPriceList };
    delete responseData.fileData;
    return responseData;
  }
};

export const deletePriceList = async (id) => {
  try {
    const res = await axios.delete(`${API_URL}/price-lists/${id}`);
    return res.data;
  } catch (error) {
    mockPriceLists = mockPriceLists.filter(c => c._id !== id);
    return { message: "Price list deleted successfully" };
  }
};


