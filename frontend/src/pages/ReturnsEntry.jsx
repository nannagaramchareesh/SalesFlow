import React, { useState, useEffect } from 'react';
import { getInvoices, updateInvoiceReturns } from '../utils/api';
import { calculateDealerTotalOutstanding, countOverdueBills, calculateTotalReceived } from '../utils/formulas';

const ReturnsEntry = () => {
  const [invoices, setInvoices] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [selectedDealer, setSelectedDealer] = useState('');
  const [loading, setLoading] = useState(true);

  // We need to keep track of edit states for each invoice
  // editState format: { [invoiceId]: { chequeReturnAmount, chequeReturnDate, srCrValue, srNumber, srDate, isSaving } }
  const [editStates, setEditStates] = useState({});
  const [activeChequesInvoice, setActiveChequesInvoice] = useState(null);
  const [chequeModalInvoice, setChequeModalInvoice] = useState(null);
  const [modalBouncedChequeIds, setModalBouncedChequeIds] = useState([]);
  const [modalCustomAmount, setModalCustomAmount] = useState('');
  const [expandedReturns, setExpandedReturns] = useState({});

  const toggleExpandReturns = (invoiceId) => {
    setExpandedReturns(prev => ({
      ...prev,
      [invoiceId]: !prev[invoiceId]
    }));
  };


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getInvoices();
    setInvoices(data);
    
    // Extract unique dealers
    const uniqueDealers = [...new Set(data.map(inv => inv.dealerName))].filter(Boolean);
    setDealers(uniqueDealers);
    
    // Initialize edit states
    const initialEditStates = {};
    data.forEach(inv => {
      const bouncedPayments = (inv.partPayments || []).filter(p => p.isBounced);
      const bouncedChequeIds = bouncedPayments.map(p => p._id);
      if (inv.chequeReturnAmount > 0 && bouncedChequeIds.length === 0) {
        bouncedChequeIds.push('custom');
      }
      initialEditStates[inv._id] = {
        bouncedChequeIds: bouncedChequeIds,
        chequeReturnAmount: inv.chequeReturnAmount || '',
        chequeReturnDate: inv.chequeReturnDate ? inv.chequeReturnDate.split('T')[0] : '',
        srCrValue: inv.srCrValue || '',
        srNumber: inv.srNumber || '',
        srDate: inv.srDate ? inv.srDate.split('T')[0] : '',
        isSaving: false
      };
    });
    setEditStates(initialEditStates);
    setLoading(false);
  };

  const handleEditChange = (id, field, value) => {
    setEditStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleOpenChequeModal = (invoice) => {
    const editState = editStates[invoice._id] || {};
    setChequeModalInvoice(invoice);
    setModalBouncedChequeIds(editState.bouncedChequeIds || []);
    setModalCustomAmount(editState.bouncedChequeIds?.includes('custom') ? (editState.chequeReturnAmount || '') : '');
  };

  const handleApplyChequeModal = () => {
    const invoiceId = chequeModalInvoice._id;
    const chequePayments = (chequeModalInvoice.partPayments || []).filter(p => p.instrument === 'Cheque' || p.chequeNumber);
    
    let chequeSum = 0;
    modalBouncedChequeIds.forEach(x => {
      if (x !== 'custom') {
        const found = chequePayments.find(pay => pay._id === x);
        if (found) chequeSum += found.amount;
      } else {
        chequeSum += Number(modalCustomAmount) || 0;
      }
    });

    setEditStates(prev => ({
      ...prev,
      [invoiceId]: {
        ...prev[invoiceId],
        bouncedChequeIds: modalBouncedChequeIds,
        chequeReturnAmount: chequeSum || ''
      }
    }));

    setChequeModalInvoice(null);
  };

  const handleSaveReturns = async (invoiceId) => {
    const currentState = editStates[invoiceId];
    
    const bouncedChequeIds = currentState.bouncedChequeIds || [];
    const chqAmt = Number(currentState.chequeReturnAmount) || 0;
    const chqDate = currentState.chequeReturnDate;
    const srValue = Number(currentState.srCrValue) || 0;
    const srNum = currentState.srNumber ? currentState.srNumber.trim() : '';
    const srDate = currentState.srDate;

    // Validation 1: Cheque Return Date without Cheque selection or custom amount
    if (chqDate && bouncedChequeIds.length === 0) {
      alert('Please select at least one Cheque or choose Custom Amount when entering a Cheque Return Date.');
      return;
    }

    // Validation 2: Cheque Return selection without Date
    if (bouncedChequeIds.length > 0 && !chqDate) {
      alert('Please enter a Cheque Return Date when a Cheque Return is specified.');
      return;
    }

    // Validation 3: Custom Cheque Return Amount without value
    if (bouncedChequeIds.includes('custom') && chqAmt <= 0) {
      alert('Please enter a valid Cheque Return Amount for Custom Cheque Return.');
      return;
    }

    // Validation 4: SR/CR Value without Number or Date
    if (srValue > 0 && (!srNum || !srDate)) {
      alert('Please enter both the SR/CR Number and CR/SR Date when an SR/CR Value is specified.');
      return;
    }

    // Validation 5: SR/CR Number or Date without Value
    if ((srNum || srDate) && srValue <= 0) {
      alert('Please enter a valid SR/CR Value when an SR/CR Number or Date is specified.');
      return;
    }

    setEditStates(prev => ({ ...prev, [invoiceId]: { ...prev[invoiceId], isSaving: true } }));
    
    try {
      const returnData = {
        bouncedChequeIds: bouncedChequeIds,
        chequeReturnAmount: chqAmt, // Backend uses this if custom is selected
        chequeReturnDate: chqDate || null,
        srCrValue: srValue,
        srNumber: srNum,
        srDate: srDate || null
      };
      
      const updatedInvoice = await updateInvoiceReturns(invoiceId, returnData);
      
      // Update local invoices array
      setInvoices(prev => prev.map(inv => inv._id === invoiceId ? updatedInvoice : inv));
      
      // Update local edit state for this invoice
      const updatedBouncedPayments = (updatedInvoice.partPayments || []).filter(p => p.isBounced);
      const updatedBouncedChequeIds = updatedBouncedPayments.map(p => p._id);
      if (updatedInvoice.chequeReturnAmount > 0 && updatedBouncedChequeIds.length === 0) {
        updatedBouncedChequeIds.push('custom');
      }
      setEditStates(prev => ({
        ...prev,
        [invoiceId]: {
          ...prev[invoiceId],
          bouncedChequeIds: updatedBouncedChequeIds,
          chequeReturnAmount: updatedInvoice.chequeReturnAmount || '',
          chequeReturnDate: updatedInvoice.chequeReturnDate ? updatedInvoice.chequeReturnDate.split('T')[0] : '',
          srCrValue: updatedInvoice.srCrValue || '',
          srNumber: updatedInvoice.srNumber || '',
          srDate: updatedInvoice.srDate ? updatedInvoice.srDate.split('T')[0] : ''
        }
      }));
      
      // Show success
      alert(`Returns updated successfully for ${updatedInvoice.invoiceNumber}`);
    } catch (error) {
      console.error("Failed to update returns:", error);
      alert("Failed to update returns");
    } finally {
      setEditStates(prev => ({ ...prev, [invoiceId]: { ...prev[invoiceId], isSaving: false } }));
    }
  };

  const filteredInvoices = invoices.filter(inv => inv.dealerName === selectedDealer);

  if (loading) {
    return <div className="page-container"><p>Loading...</p></div>;
  }

  return (
    <div className="page-container" style={{maxWidth: '100%', overflowX: 'hidden'}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title" style={{marginBottom: 0}}>CR/SR & Cheque Returns</h1>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', background: 'white', padding: '0.5rem 1rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          Current Date: <strong style={{color: 'var(--primary-color)'}}>{new Date().toLocaleDateString()}</strong>
        </div>
      </div>

      {!selectedDealer ? (
        /* Dealers List Rows View with Headers */
        <div>
          <div style={{ marginBottom: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Select a dealer below to view and manage their returns & adjustments.
          </div>
          {dealers.length === 0 ? (
            <div className="card" style={{textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)'}}>
              <div style={{fontSize: '2rem', marginBottom: '1rem'}}>📄</div>
              <div>No dealers found.</div>
            </div>
          ) : (
            <div>
              {/* Desktop View of Dealer Rows */}
              <div className="desktop-view">
                <div className="dealer-header-row" style={{ display: 'flex', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ flex: '2', minWidth: '240px' }}>Dealer Name</div>
                  <div style={{ flex: '1', minWidth: '100px' }}>Total Bills</div>
                  <div style={{ flex: '1', minWidth: '120px' }}>Overdue Bills</div>
                  <div style={{ flex: '1.5', minWidth: '150px', textAlign: 'right' }}>Total Balance</div>
                  <div style={{ width: '30px' }}></div>
                </div>

                <div className="dealers-rows-list">
                  {dealers.map(dealer => {
                    const dealerInvoices = invoices.filter(inv => inv.dealerName === dealer);
                    const totalOutstanding = calculateDealerTotalOutstanding(invoices, dealer);
                    const overdueCount = countOverdueBills(invoices, dealer);

                    return (
                      <div 
                        key={dealer} 
                        className="dealer-row" 
                        onClick={() => setSelectedDealer(dealer)}
                      >
                        <div style={{ flex: '2', minWidth: '240px', fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.95rem' }}>
                          {dealer}
                        </div>
                        
                        <div style={{ flex: '1', minWidth: '100px' }}>
                          <span className="badge badge-neutral" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                            {dealerInvoices.length} Bills
                          </span>
                        </div>
                        
                        <div style={{ flex: '1', minWidth: '120px' }}>
                          {overdueCount > 0 ? (
                            <span className="badge badge-danger" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                              {overdueCount} Overdue
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>0 Overdue</span>
                          )}
                        </div>

                        <div style={{ flex: '1.5', minWidth: '150px', textAlign: 'right', fontWeight: 700, color: totalOutstanding > 0 ? '#b91c1c' : '#15803d', fontSize: '1rem' }}>
                          ₹{totalOutstanding.toLocaleString()}
                        </div>
                        
                        <div style={{ width: '30px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '1rem' }} className="dealer-row-chevron">
                          →
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile View of Dealer Cards */}
              <div className="mobile-view">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {dealers.map(dealer => {
                    const dealerInvoices = invoices.filter(inv => inv.dealerName === dealer);
                    const totalOutstanding = calculateDealerTotalOutstanding(invoices, dealer);
                    const overdueCount = countOverdueBills(invoices, dealer);

                    return (
                      <div 
                        key={dealer} 
                        className="mobile-card"
                        onClick={() => setSelectedDealer(dealer)}
                        style={{ cursor: 'pointer', marginBottom: 0 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)' }}>{dealer}</h3>
                          <div className="dealer-row-chevron" style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>→</div>
                        </div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <span className="badge badge-neutral" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>{dealerInvoices.length} Bills</span>
                          {overdueCount > 0 ? (
                            <span className="badge badge-danger" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>{overdueCount} Overdue</span>
                          ) : (
                            <span className="badge" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#f1f5f9', color: '#64748b' }}>0 Overdue</span>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Balance:</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: totalOutstanding > 0 ? '#b91c1c' : '#15803d' }}>
                            ₹{totalOutstanding.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Selected Dealer Invoice Details View */
        (() => {
          const totalOutstanding = calculateDealerTotalOutstanding(invoices, selectedDealer);
          const overdueCount = countOverdueBills(invoices, selectedDealer);

          return (
            <div>
              {/* Back Navigation & Summary Header */}
              <div style={{ marginBottom: '1.5rem' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setSelectedDealer('')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '1.25rem', padding: '0.5rem 1rem' }}
                >
                  ← Back to Dealers List
                </button>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#f8fafc', padding: '1.25rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>{selectedDealer}</h2>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Viewing {filteredInvoices.length} Invoices
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Balance</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: totalOutstanding > 0 ? '#b91c1c' : '#15803d' }}>
                        ₹{totalOutstanding.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Overdue Bills</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: overdueCount > 0 ? '#b91c1c' : '#64748b' }}>
                        {overdueCount}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoices Returns Table Card Container */}
              <div className="card" style={{ padding: '1rem', background: 'white' }}>
                {/* Desktop View Table */}
                <div className="desktop-view" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1500px', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Invoice Number</th>
                        <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Invoice Value</th>
                        <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Received Amount</th>
                        <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Balance</th>
                        
                        {/* Reference Cheque Details */}
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Cheque Number & Date</th>
                        
                        {/* Cheque Return Fields (Light Green) */}
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, background: '#f0fdfa' }}>Cheque Return Amount</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, background: '#f0fdfa' }}>Cheque Return Date</th>
                        
                        {/* SR/CR Fields (Light Blue) */}
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, background: '#ecfeff' }}>SR or CR Value</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, background: '#ecfeff' }}>SR or CR Number</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, background: '#ecfeff' }}>CR/SR Date</th>
                        
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, background: '#f8fafc' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map(invoice => {
                        const editState = editStates[invoice._id] || {};
                        const value = invoice.invoiceValue || 0;
                        const balance = invoice.balance !== undefined ? invoice.balance : value;
                        const totalReceived = calculateTotalReceived(invoice);
                        
                        // Find all cheque details
                        const chequePayments = (invoice.partPayments || []).filter(p => p.instrument === 'Cheque' || p.chequeNumber);

                        return (
                          <tr key={invoice._id} style={{ borderBottom: '1px solid #f1f5f9', background: invoice.status === 'Paid' ? '#f0fdf4' : 'white', transition: 'background-color 0.2s', ':hover': { backgroundColor: '#f8fafc' } }}>
                            {/* 1. Invoice Number */}
                            <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                               <div>{invoice.invoiceNumber}</div>
                              <div style={{ marginTop: '0.25rem' }}>
                                <span className={`badge badge-${invoice.status === 'Paid' ? 'success' : invoice.status === 'Partial' ? 'warning' : 'danger'}`} style={{ fontSize: '0.65rem' }}>
                                  {invoice.status}
                                </span>
                              </div>
                            </td>

                            {/* 2. Invoice Value */}
                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 500 }}>
                              ₹{value.toLocaleString()}
                            </td>

                            {/* 3. Received Amount */}
                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#0369a1' }}>
                              ₹{totalReceived.toLocaleString()}
                            </td>

                            {/* 4. Balance */}
                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: balance > 0 ? '#b91c1c' : '#15803d' }}>
                              ₹{balance.toLocaleString()}
                            </td>

                            {/* 5. Cheque Number & Date */}
                            <td style={{ padding: '1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                              {chequePayments.length > 0 ? (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => setActiveChequesInvoice(invoice)}
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
                                >
                                  View Cheques ({chequePayments.length})
                                </button>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>N/A</span>
                              )}
                            </td>

                            {/* 6. Cheque Return Amount (Button to open Modal) */}
                            <td style={{ padding: '0.5rem', background: '#f8fafc', textAlign: 'center', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'center', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => handleOpenChequeModal(invoice)}
                                  style={{
                                    padding: '0.4rem 0.75rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    background: '#f1f5f9',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <span>Select Cheques</span>
                                  <span className="badge badge-primary" style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem' }}>
                                    {((editState.bouncedChequeIds || []).filter(id => id !== 'custom').length)}
                                  </span>
                                </button>
                                
                                {editState.bouncedChequeIds?.includes('custom') && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                    Custom: ₹{Number(editState.chequeReturnAmount || 0).toLocaleString()}
                                  </div>
                                )}
                                {editState.bouncedChequeIds?.length > 0 && !editState.bouncedChequeIds.includes('custom') && (
                                  <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>
                                    Total: ₹{Number(editState.chequeReturnAmount || 0).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* 7. Cheque Return Date (Input) */}
                            <td style={{ padding: '0.5rem', background: '#f8fafc' }}>
                              <input 
                                type="date" 
                                className="form-input" 
                                style={{ padding: '0.4rem', fontSize: '0.8rem', minWidth: '130px' }}
                                value={editState.chequeReturnDate}
                                onChange={(e) => handleEditChange(invoice._id, 'chequeReturnDate', e.target.value)}
                              />
                            </td>

                            {/* 8. SR or CR Value (Input) */}
                            <td style={{ padding: '0.5rem', background: '#f9fafb' }}>
                              <input 
                                type="number" 
                                className="form-input" 
                                style={{ padding: '0.4rem', fontSize: '0.8rem', minWidth: '100px' }}
                                value={editState.srCrValue}
                                onChange={(e) => handleEditChange(invoice._id, 'srCrValue', e.target.value)}
                                placeholder="0"
                              />
                            </td>

                            {/* 9. SR or CR Number (Input) */}
                            <td style={{ padding: '0.5rem', background: '#f9fafb' }}>
                              <input 
                                type="text" 
                                className="form-input" 
                                style={{ padding: '0.4rem', fontSize: '0.8rem', minWidth: '100px' }}
                                value={editState.srNumber}
                                onChange={(e) => handleEditChange(invoice._id, 'srNumber', e.target.value)}
                                placeholder="SR-123"
                              />
                            </td>

                            {/* 10. CR/SR Date (Input) */}
                            <td style={{ padding: '0.5rem', background: '#f9fafb' }}>
                              <input 
                                type="date" 
                                className="form-input" 
                                style={{ padding: '0.4rem', fontSize: '0.8rem', minWidth: '130px' }}
                                value={editState.srDate}
                                onChange={(e) => handleEditChange(invoice._id, 'srDate', e.target.value)}
                              />
                            </td>

                            {/* 11. Action */}
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                              <button 
                                className="btn btn-primary" 
                                onClick={() => handleSaveReturns(invoice._id)}
                                disabled={editState.isSaving}
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                              >
                                {editState.isSaving ? 'Saving...' : 'Update Returns'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Card List */}
                <div className="mobile-view">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredInvoices.map(invoice => {
                      const editState = editStates[invoice._id] || {};
                      const value = invoice.invoiceValue || 0;
                      const balance = invoice.balance !== undefined ? invoice.balance : value;
                      const totalReceived = calculateTotalReceived(invoice);
                      
                      // Find all cheque details
                      const chequePayments = (invoice.partPayments || []).filter(p => p.instrument === 'Cheque' || p.chequeNumber);
                      const isExpanded = !!expandedReturns[invoice._id];

                      return (
                        <div 
                          key={invoice._id} 
                          className="mobile-card" 
                          style={{ 
                            borderLeft: `4px solid ${invoice.status === 'Paid' ? '#10b981' : invoice.status === 'Partial' ? '#f59e0b' : '#ef4444'}`,
                            background: invoice.status === 'Paid' ? '#f0fdf4' : 'white',
                            padding: '1rem',
                            marginBottom: 0
                          }}
                        >
                          {/* Card Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-color)' }}>{invoice.invoiceNumber}</span>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                {new Date(invoice.dateOfInvoice || invoice.date).toLocaleDateString()}
                              </div>
                            </div>
                            <span className={`badge badge-${invoice.status === 'Paid' ? 'success' : invoice.status === 'Partial' ? 'warning' : 'danger'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                              {invoice.status}
                            </span>
                          </div>

                          {/* Stats Grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                            <div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Bill Value</div>
                              <div style={{ fontWeight: 600, color: 'var(--primary-color)', fontSize: '0.9rem', marginTop: '0.1rem' }}>₹{value.toLocaleString()}</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Balance</div>
                              <div style={{ fontWeight: 700, color: balance > 0 ? '#b91c1c' : '#15803d', fontSize: '0.9rem', marginTop: '0.1rem' }}>₹{balance.toLocaleString()}</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Received</div>
                              <div style={{ fontWeight: 600, color: '#0369a1', fontSize: '0.9rem', marginTop: '0.1rem' }}>₹{totalReceived.toLocaleString()}</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Cheques</div>
                              <div style={{ marginTop: '0.1rem' }}>
                                {chequePayments.length > 0 ? (
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setActiveChequesInvoice(invoice)}
                                    style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', fontWeight: 600 }}
                                  >
                                    View ({chequePayments.length})
                                  </button>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>N/A</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Row */}
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button 
                              onClick={() => toggleExpandReturns(invoice._id)}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              {isExpanded ? 'Hide Fields ▲' : 'Manage Returns ▼'}
                            </button>
                          </div>

                          {/* Collapsible Fields Form */}
                          <div className={`mobile-card-form ${isExpanded ? 'open' : ''}`} style={{ fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}>
                              
                              {/* Cheque Return Section */}
                              <div style={{ background: '#f0fdfa', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccfbf1' }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#0f766e', fontWeight: 700 }}>CHEQUE RETURN</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Bounced Cheques</label>
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      onClick={() => handleOpenChequeModal(invoice)}
                                      style={{
                                        width: '100%',
                                        padding: '0.45rem',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: 'white',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px'
                                      }}
                                    >
                                      <span>Select Cheques</span>
                                      <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                                        {((editState.bouncedChequeIds || []).filter(id => id !== 'custom').length)}
                                      </span>
                                    </button>
                                  </div>
                                  
                                  {editState.bouncedChequeIds?.includes('custom') && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                      Custom Amount: ₹{Number(editState.chequeReturnAmount || 0).toLocaleString()}
                                    </div>
                                  )}
                                  {editState.bouncedChequeIds?.length > 0 && !editState.bouncedChequeIds.includes('custom') && (
                                    <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>
                                      Total Cheque Return: ₹{Number(editState.chequeReturnAmount || 0).toLocaleString()}
                                    </div>
                                  )}

                                  <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Cheque Return Date</label>
                                    <input 
                                      type="date" 
                                      className="form-input" 
                                      style={{ width: '100%', padding: '0.45rem' }}
                                      value={editState.chequeReturnDate || ''}
                                      onChange={(e) => handleEditChange(invoice._id, 'chequeReturnDate', e.target.value)}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* SR/CR Adjustment Section */}
                              <div style={{ background: '#ecfeff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cffafe' }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#0891b2', fontWeight: 700 }}>SR / CR ADJUSTMENT</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <div>
                                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Value (₹)</label>
                                      <input 
                                        type="number" 
                                        className="form-input" 
                                        style={{ width: '100%', padding: '0.45rem' }}
                                        value={editState.srCrValue || ''}
                                        onChange={(e) => handleEditChange(invoice._id, 'srCrValue', e.target.value)}
                                        placeholder="0"
                                      />
                                    </div>
                                    <div>
                                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>SR/CR Number</label>
                                      <input 
                                        type="text" 
                                        className="form-input" 
                                        style={{ width: '100%', padding: '0.45rem' }}
                                        value={editState.srNumber || ''}
                                        onChange={(e) => handleEditChange(invoice._id, 'srNumber', e.target.value)}
                                        placeholder="SR-123"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Date</label>
                                    <input 
                                      type="date" 
                                      className="form-input" 
                                      style={{ width: '100%', padding: '0.45rem' }}
                                      value={editState.srDate || ''}
                                      onChange={(e) => handleEditChange(invoice._id, 'srDate', e.target.value)}
                                    />
                                  </div>
                                </div>
                              </div>

                              <button 
                                className="btn btn-primary" 
                                onClick={() => handleSaveReturns(invoice._id)}
                                disabled={editState.isSaving}
                                style={{ width: '100%', padding: '0.5rem', fontWeight: 600 }}
                              >
                                {editState.isSaving ? 'Saving...' : 'Update Returns'}
                              </button>

                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          );
        })()
      )}

      {/* Cheque Payments timeline modal view */}
      {activeChequesInvoice && (
        <div className="modal-overlay" onClick={() => setActiveChequesInvoice(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 style={{margin: 0, color: 'var(--primary-color)'}}>Cheques List</h3>
                <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem'}}>
                  Invoice: <strong style={{color: 'var(--primary-color)'}}>{activeChequesInvoice.invoiceNumber}</strong> | Dealer: <strong>{activeChequesInvoice.dealerName}</strong>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveChequesInvoice(null)} aria-label="Close modal">
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              {/* Timeline of Cheque payments */}
              {(() => {
                const chequePayments = (activeChequesInvoice.partPayments || []).filter(p => p.instrument === 'Cheque' || p.chequeNumber);
                return chequePayments.length > 0 ? (
                  <div className="timeline-container">
                    {chequePayments.map((p, idx) => (
                      <div key={idx} className="timeline-item">
                        <div className="timeline-marker"></div>
                        <div className="timeline-content-card" style={p.isBounced ? { border: '1px solid #fee2e2', background: '#fef2f2' } : {}}>
                          <div className="timeline-item-meta">
                            <span className="timeline-item-date">
                              {new Date(p.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                              {p.isBounced && (
                                <span className="badge badge-danger" style={{ marginLeft: '0.5rem', fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                                  Bounced
                                </span>
                              )}
                            </span>
                            <span className="timeline-item-amount" style={p.isBounced ? { textDecoration: 'line-through', color: '#ef4444' } : {}}>
                              ₹{p.amount.toLocaleString()}
                            </span>
                          </div>
                          <div className="timeline-item-details">
                            <div className="timeline-detail-col">
                              <span className="timeline-detail-label">Instrument</span>
                              <span className="timeline-detail-value" style={p.isBounced ? { textDecoration: 'line-through', color: '#94a3b8' } : {}}>{p.instrument || 'Cheque'}</span>
                            </div>
                            <div className="timeline-detail-col">
                              <span className="timeline-detail-label">Cheque No.</span>
                              <span className="timeline-detail-value" style={p.isBounced ? { textDecoration: 'line-through', color: '#94a3b8' } : {}}>{p.chequeNumber || 'N/A'}</span>
                            </div>
                            <div className="timeline-detail-col">
                              <span className="timeline-detail-label">Cheque Date</span>
                              <span className="timeline-detail-value" style={p.isBounced ? { textDecoration: 'line-through', color: '#94a3b8' } : {}}>
                                {p.chequeDate ? new Date(p.chequeDate).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)'}}>
                    No cheque payments recorded for this invoice.
                  </div>
                );
              })()}
            </div>
            
            <div className="modal-footer" style={{background: '#f8fafc', borderTop: '1px solid var(--border-color)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end'}}>
              <button className="btn btn-secondary" onClick={() => setActiveChequesInvoice(null)} style={{fontWeight: 600}}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cheque Selection modal view */}
      {chequeModalInvoice && (
        <div className="modal-overlay" onClick={() => setChequeModalInvoice(null)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 style={{margin: 0, color: 'var(--primary-color)'}}>Select Cheques to Return</h3>
                <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem'}}>
                  Invoice: <strong style={{color: 'var(--primary-color)'}}>{chequeModalInvoice.invoiceNumber}</strong> | Dealer: <strong>{chequeModalInvoice.dealerName}</strong>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setChequeModalInvoice(null)} aria-label="Close modal">
                &times;
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Select the cheques that were returned (bounced) for this invoice. Already returned cheques are marked as locked.
              </div>
              
              {/* Cheque Checklist */}
              {(() => {
                const chequePayments = (chequeModalInvoice.partPayments || []).filter(p => p.instrument === 'Cheque' || p.chequeNumber);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {chequePayments.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>
                          Invoice Cheques
                        </div>
                        {chequePayments.map((p) => {
                          const isChecked = modalBouncedChequeIds.includes(p._id);
                          return (
                            <label key={p._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: p.isBounced ? 'not-allowed' : 'pointer', margin: 0, fontWeight: isChecked ? 600 : 400, color: p.isBounced ? '#94a3b8' : (isChecked ? '#ef4444' : 'var(--text-primary)') }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={p.isBounced}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  if (checked) {
                                    setModalBouncedChequeIds(prev => [...prev, p._id]);
                                  } else {
                                    setModalBouncedChequeIds(prev => prev.filter(x => x !== p._id));
                                  }
                                }}
                                style={{ width: '16px', height: '16px', cursor: p.isBounced ? 'not-allowed' : 'pointer' }}
                              />
                              <span style={{ textDecoration: p.isBounced ? 'line-through' : 'none' }}>
                                Chq #{p.chequeNumber} (₹{p.amount.toLocaleString()}) - {p.chequeDate ? new Date(p.chequeDate).toLocaleDateString() : 'N/A'}
                                {p.isBounced && <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.7rem', marginLeft: '0.5rem' }}>(Returned)</span>}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        No cheques found on this invoice.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Custom Amount Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#ecfeff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #c5f2f7' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', margin: 0, fontWeight: modalBouncedChequeIds.includes('custom') ? 600 : 400 }}>
                  <input
                    type="checkbox"
                    checked={modalBouncedChequeIds.includes('custom')}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (checked) {
                        setModalBouncedChequeIds(prev => [...prev, 'custom']);
                      } else {
                        setModalBouncedChequeIds(prev => prev.filter(x => x !== 'custom'));
                      }
                    }}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>Custom Cheque Return Amount</span>
                </label>

                {modalBouncedChequeIds.includes('custom') && (
                  <div style={{ marginTop: '0.25rem' }}>
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                      value={modalCustomAmount}
                      onChange={(e) => setModalCustomAmount(e.target.value)}
                      placeholder="Enter custom return amount"
                    />
                  </div>
                )}
              </div>

              {/* Summary of selection */}
              {(() => {
                const chequePayments = (chequeModalInvoice.partPayments || []).filter(p => p.instrument === 'Cheque' || p.chequeNumber);
                let totalSum = 0;
                modalBouncedChequeIds.forEach(x => {
                  if (x !== 'custom') {
                    const found = chequePayments.find(pay => pay._id === x);
                    if (found) totalSum += found.amount;
                  } else {
                    totalSum += Number(modalCustomAmount) || 0;
                  }
                });
                return (
                  <div style={{ marginTop: '1.25rem', background: '#f0fdf4', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>Total Return Amount:</span>
                    <strong style={{ fontSize: '1.05rem', color: '#15803d' }}>₹{totalSum.toLocaleString()}</strong>
                  </div>
                );
              })()}
            </div>
            
            <div className="modal-footer" style={{background: '#f8fafc', borderTop: '1px solid var(--border-color)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem'}}>
              <button className="btn btn-secondary" onClick={() => setChequeModalInvoice(null)} style={{fontWeight: 600}}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleApplyChequeModal} style={{fontWeight: 600}}>
                Apply Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnsEntry;
