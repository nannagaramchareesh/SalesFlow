import React, { useState, useEffect } from 'react';
import { getInvoices, addInvoicePayment } from '../utils/api';
import { calculateOverdueDays, calculateTotalReceived, calculateDealerTotalOutstanding, countOverdueBills } from '../utils/formulas';

const CollectionEntry = () => {
  const [invoices, setInvoices] = useState([]);
  const [selectedDealer, setSelectedDealer] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState({});
  const [activeHistoryInvoice, setActiveHistoryInvoice] = useState(null);

  // Form states per invoice row
  const [paymentForms, setPaymentForms] = useState({});
  const [zoomedImageUrl, setZoomedImageUrl] = useState(null);

  // Dealer view filters
  const [dealerSearch, setDealerSearch] = useState('');
  const [dealerBalanceFilter, setDealerBalanceFilter] = useState('all'); // all, outstanding, zero
  const [dealerOverdueFilter, setDealerOverdueFilter] = useState('all'); // all, has_overdue, no_overdue

  // Invoice view filters
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all'); // all, Unpaid, Partial, Paid
  const [invoiceOverdueFilter, setInvoiceOverdueFilter] = useState('all'); // all, overdue, overdue_30, overdue_60, overdue_90, not_overdue
  const [invoiceBrandFilter, setInvoiceBrandFilter] = useState('all'); // all, or specific brand
  const [expandedPayments, setExpandedPayments] = useState({});


  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    const data = await getInvoices();
    setInvoices(data);
    
    // Keep active modal invoice in sync if open
    setActiveHistoryInvoice(prev => {
      if (!prev) return null;
      return data.find(inv => inv._id === prev._id) || null;
    });
  };

  const uniqueDealers = [...new Set(invoices.map(inv => inv.dealerName))].filter(Boolean);

  const filteredDealers = uniqueDealers.filter(dealer => {
    if (dealerSearch && !dealer.toLowerCase().includes(dealerSearch.toLowerCase())) {
      return false;
    }
    
    const totalOutstanding = calculateDealerTotalOutstanding(invoices, dealer);
    const overdueCount = countOverdueBills(invoices, dealer);

    if (dealerBalanceFilter === 'outstanding' && totalOutstanding <= 0) {
      return false;
    }
    if (dealerBalanceFilter === 'zero' && totalOutstanding > 0) {
      return false;
    }

    if (dealerOverdueFilter === 'has_overdue' && overdueCount <= 0) {
      return false;
    }
    if (dealerOverdueFilter === 'no_overdue' && overdueCount > 0) {
      return false;
    }

    return true;
  });

  const handlePaymentChange = (invoiceId, field, value) => {
    setPaymentForms(prev => ({
      ...prev,
      [invoiceId]: {
        ...prev[invoiceId] || {},
        [field]: value
      }
    }));
  };

  const handleSavePayment = async (invoiceId) => {
    const form = paymentForms[invoiceId];
    if (!form || !form.amount || Number(form.amount) <= 0) {
      alert('Please enter a valid received amount.');
      return;
    }

    const paymentData = {
      amount: Number(form.amount),
      date: form.date || new Date().toISOString(),
      paymentMode: form.paymentMode || 'Online',
      instrument: form.instrument || 'RTGS',
      chequeNumber: form.chequeNumber || '',
      chequeDate: form.chequeDate || ''
    };

    try {
      await addInvoicePayment(invoiceId, paymentData);
      
      // Clear form
      setPaymentForms(prev => {
        const newForms = { ...prev };
        delete newForms[invoiceId];
        return newForms;
      });
      
      // Reload invoices from backend
      loadInvoices();
      alert('Payment added successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save payment');
    }
  };

  const toggleInvoiceSelection = (invoiceId) => {
    setSelectedInvoices(prev => ({
      ...prev,
      [invoiceId]: !prev[invoiceId]
    }));
  };

  const toggleExpandPayment = (invoiceId) => {
    setExpandedPayments(prev => ({
      ...prev,
      [invoiceId]: !prev[invoiceId]
    }));
  };

  const currentDateStr = new Date().toISOString().split('T')[0];

  return (
    <div className="page-container" style={{maxWidth: '100%', overflowX: 'hidden'}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title" style={{marginBottom: 0}}>Collection Entry</h1>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', background: 'white', padding: '0.5rem 1rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          Current Date: <strong style={{color: 'var(--primary-color)'}}>{new Date().toLocaleDateString()}</strong>
        </div>
      </div>

      {!selectedDealer ? (
        /* Dealers List Rows View with Headers */
        <div>
          <div style={{ marginBottom: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Select a dealer below to view and manage their bills.
          </div>

          {/* Dealer Filters Bar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem',
            background: '#f8fafc',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            alignItems: 'center'
          }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Search Dealer</label>
              <input
                type="text"
                className="form-input"
                style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                value={dealerSearch}
                onChange={e => setDealerSearch(e.target.value)}
                placeholder="Search by dealer name..."
              />
            </div>
            <div style={{ minWidth: '180px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Outstanding Balance</label>
              <select
                className="form-input"
                style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                value={dealerBalanceFilter}
                onChange={e => setDealerBalanceFilter(e.target.value)}
              >
                <option value="all">All Dealers</option>
                <option value="outstanding">With Outstanding (&gt; ₹0)</option>
                <option value="zero">No Outstanding (₹0)</option>
              </select>
            </div>
            <div style={{ minWidth: '180px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Overdue Status</label>
              <select
                className="form-input"
                style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                value={dealerOverdueFilter}
                onChange={e => setDealerOverdueFilter(e.target.value)}
              >
                <option value="all">All Dealers</option>
                <option value="has_overdue">With Overdue Bills</option>
                <option value="no_overdue">No Overdue Bills</option>
              </select>
            </div>
            {(dealerSearch || dealerBalanceFilter !== 'all' || dealerOverdueFilter !== 'all') && (
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', alignSelf: 'flex-end', height: '36px', padding: '0 1rem', display: 'inline-flex', alignItems: 'center' }}
                onClick={() => {
                  setDealerSearch('');
                  setDealerBalanceFilter('all');
                  setDealerOverdueFilter('all');
                }}
              >
                Reset
              </button>
            )}
          </div>

          {uniqueDealers.length === 0 ? (
            <div className="card" style={{textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)'}}>
              <div style={{fontSize: '2rem', marginBottom: '1rem'}}>📄</div>
              <div>No dealers found.</div>
            </div>
          ) : filteredDealers.length === 0 ? (
            <div className="card" style={{textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)'}}>
              <div style={{fontSize: '2rem', marginBottom: '1rem'}}>🔍</div>
              <div>No dealers match your filter criteria.</div>
            </div>
          ) : (
            <div>
              {/* Desktop View of Dealer Rows */}
              <div className="desktop-view">
                <div className="dealer-header-row" style={{ display: 'flex', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ flex: '2', minWidth: '240px' }}>Dealer Name</div>
                  <div style={{ flex: '1', minWidth: '100px' }}>Total Bills</div>
                  <div style={{ flex: '1', minWidth: '120px' }}>Overdue Bills</div>
                  <div style={{ flex: '1.5', minWidth: '150px' }}>Active Selection</div>
                  <div style={{ flex: '1.5', minWidth: '150px', textAlign: 'right' }}>Total Balance</div>
                  <div style={{ width: '30px' }}></div>
                </div>

                <div className="dealers-rows-list">
                  {filteredDealers.map(dealer => {
                    const dealerInvoices = invoices.filter(inv => inv.dealerName === dealer);
                    const totalOutstanding = calculateDealerTotalOutstanding(invoices, dealer);
                    const overdueCount = countOverdueBills(invoices, dealer);
                    const selectedDealerInvoices = dealerInvoices.filter(inv => selectedInvoices[inv._id]);
                    const selectedBalance = selectedDealerInvoices.reduce((sum, inv) => sum + (inv.balance !== undefined ? inv.balance : inv.invoiceValue), 0);

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
                        
                        <div style={{ flex: '1.5', minWidth: '150px' }}>
                          {selectedDealerInvoices.length > 0 ? (
                            <span className="badge badge-warning" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                              ₹{selectedBalance.toLocaleString()}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>-</span>
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
                  {filteredDealers.map(dealer => {
                    const dealerInvoices = invoices.filter(inv => inv.dealerName === dealer);
                    const totalOutstanding = calculateDealerTotalOutstanding(invoices, dealer);
                    const overdueCount = countOverdueBills(invoices, dealer);
                    const selectedDealerInvoices = dealerInvoices.filter(inv => selectedInvoices[inv._id]);
                    const selectedBalance = selectedDealerInvoices.reduce((sum, inv) => sum + (inv.balance !== undefined ? inv.balance : inv.invoiceValue), 0);

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
                          {selectedDealerInvoices.length > 0 && (
                            <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                              Selected: ₹{selectedBalance.toLocaleString()}
                            </span>
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
          const dealerInvoices = invoices.filter(inv => inv.dealerName === selectedDealer);
          
          // Dynamic unique brands for the current dealer's invoices
          const uniqueBrands = [...new Set(dealerInvoices.map(inv => inv.brand).filter(Boolean))];

          const filteredInvoices = dealerInvoices.filter(inv => {
            if (invoiceSearch && !inv.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase())) {
              return false;
            }

            if (invoiceStatusFilter !== 'all' && inv.status !== invoiceStatusFilter) {
              return false;
            }

            if (invoiceBrandFilter !== 'all' && inv.brand !== invoiceBrandFilter) {
              return false;
            }

            const overdueDays = calculateOverdueDays(inv.dateOfInvoice || inv.date);
            if (invoiceOverdueFilter === 'overdue' && (overdueDays <= 0 || inv.status === 'Paid')) {
              return false;
            }
            if (invoiceOverdueFilter === 'overdue_30' && (overdueDays <= 30 || inv.status === 'Paid')) {
              return false;
            }
            if (invoiceOverdueFilter === 'overdue_60' && (overdueDays <= 60 || inv.status === 'Paid')) {
              return false;
            }
            if (invoiceOverdueFilter === 'overdue_90' && (overdueDays <= 90 || inv.status === 'Paid')) {
              return false;
            }
            if (invoiceOverdueFilter === 'not_overdue' && (overdueDays > 0 && inv.status !== 'Paid')) {
              return false;
            }

            return true;
          });

          const totalOutstanding = calculateDealerTotalOutstanding(invoices, selectedDealer);
          const overdueCount = countOverdueBills(invoices, selectedDealer);

          // Selection Calculation
          const selectedDealerInvoices = dealerInvoices.filter(inv => selectedInvoices[inv._id]);
          const selectedBalance = selectedDealerInvoices.reduce((sum, inv) => sum + (inv.balance !== undefined ? inv.balance : inv.invoiceValue), 0);
          const selectedInvoiceValue = selectedDealerInvoices.reduce((sum, inv) => sum + (inv.invoiceValue || 0), 0);
          const selectedTotalReceived = selectedDealerInvoices.reduce((sum, inv) => sum + calculateTotalReceived(inv), 0);
          
          const allDealerInvoicesSelected = filteredInvoices.length > 0 && filteredInvoices.every(inv => selectedInvoices[inv._id]);

          const handleSelectAllToggle = () => {
            if (allDealerInvoicesSelected) {
              setSelectedInvoices(prev => {
                const copy = { ...prev };
                filteredInvoices.forEach(inv => {
                  delete copy[inv._id];
                });
                return copy;
              });
            } else {
              setSelectedInvoices(prev => {
                const copy = { ...prev };
                filteredInvoices.forEach(inv => {
                  copy[inv._id] = true;
                });
                return copy;
              });
            }
          };

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
                      Viewing {filteredInvoices.length === dealerInvoices.length ? dealerInvoices.length : `${filteredInvoices.length} of ${dealerInvoices.length}`} Invoices
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

              {/* Invoices Table Card Container */}
              <div className="card" style={{ padding: '1rem', background: 'white' }}>
                {/* Invoices Filters Bar */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  marginBottom: '1.25rem',
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: '1', minWidth: '180px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Search Bill No.</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                      value={invoiceSearch}
                      onChange={e => setInvoiceSearch(e.target.value)}
                      placeholder="Search by bill number..."
                    />
                  </div>
                  <div style={{ minWidth: '130px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Status</label>
                    <select
                      className="form-input"
                      style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                      value={invoiceStatusFilter}
                      onChange={e => setInvoiceStatusFilter(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="Unpaid">Unpaid</option>
                      <option value="Partial">Partial</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                  <div style={{ minWidth: '150px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Overdue Days</label>
                    <select
                      className="form-input"
                      style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                      value={invoiceOverdueFilter}
                      onChange={e => setInvoiceOverdueFilter(e.target.value)}
                    >
                      <option value="all">All Bills</option>
                      <option value="overdue">Overdue (&gt; 0 Days)</option>
                      <option value="overdue_30">Overdue &gt; 30 Days</option>
                      <option value="overdue_60">Overdue &gt; 60 Days</option>
                      <option value="overdue_90">Overdue &gt; 90 Days</option>
                      <option value="not_overdue">Not Overdue</option>
                    </select>
                  </div>
                  <div style={{ minWidth: '130px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Brand</label>
                    <select
                      className="form-input"
                      style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                      value={invoiceBrandFilter}
                      onChange={e => setInvoiceBrandFilter(e.target.value)}
                    >
                      <option value="all">All Brands</option>
                      {uniqueBrands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>
                  {(invoiceSearch || invoiceStatusFilter !== 'all' || invoiceOverdueFilter !== 'all' || invoiceBrandFilter !== 'all') && (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', alignSelf: 'flex-end', height: '36px', padding: '0 1rem', display: 'inline-flex', alignItems: 'center' }}
                      onClick={() => {
                        setInvoiceSearch('');
                        setInvoiceStatusFilter('all');
                        setInvoiceOverdueFilter('all');
                        setInvoiceBrandFilter('all');
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>
                {/* Selection Summary Bar */}
                {selectedDealerInvoices.length > 0 && (
                  <div className="selection-summary-bar">
                    <div className="selection-summary-stats">
                      <div className="selection-stat-item">
                        <span className="selection-stat-label">Selected Invoices</span>
                        <span className="selection-stat-value highlight-blue">
                          {selectedDealerInvoices.length} of {dealerInvoices.length}
                        </span>
                      </div>
                      <div className="selection-stat-item">
                        <span className="selection-stat-label">Selected Invoice Value</span>
                        <span className="selection-stat-value">
                          ₹{selectedInvoiceValue.toLocaleString()}
                        </span>
                      </div>
                      <div className="selection-stat-item">
                        <span className="selection-stat-label">Selected Paid</span>
                        <span className="selection-stat-value highlight-green">
                          ₹{selectedTotalReceived.toLocaleString()}
                        </span>
                      </div>
                      <div className="selection-stat-item">
                        <span className="selection-stat-label">Selected Balance</span>
                        <span className="selection-stat-value highlight-red">
                          ₹{selectedBalance.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <button 
                        className="btn btn-secondary" 
                        style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', fontWeight: 600 }}
                        onClick={() => {
                          setSelectedInvoices(prev => {
                            const copy = { ...prev };
                            dealerInvoices.forEach(inv => {
                              delete copy[inv._id];
                            });
                            return copy;
                          });
                        }}
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                )}

                {/* Desktop View Table */}
                <div className="desktop-view" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1900px', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        {/* Frozen Column containing Checkbox + Dealer Name */}
                        <th style={{ position: 'sticky', left: 0, background: '#f8fafc', zIndex: 10, padding: '1rem', textAlign: 'left', fontWeight: 600, borderRight: '2px solid #e2e8f0', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <input 
                              type="checkbox" 
                              checked={allDealerInvoicesSelected} 
                              onChange={handleSelectAllToggle}
                              style={{ cursor: 'pointer', width: '16px', height: '16px' }} 
                            />
                            <span>Dealer Name</span>
                          </div>
                        </th>
                        
                        {/* Static Info */}
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Invoice Number</th>
                        <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Invoice Value</th>
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Overdue Days</th>
                        <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Balance</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Brand</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Date of Invoice</th>
                        <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Total Received</th>
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Part Payments</th>
                        
                        {/* Input Columns */}
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, background: '#f0fdfa' }}>Received Date</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, background: '#f0fdfa' }}>Payment Mode</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, background: '#f0fdfa' }}>Received Amount</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, background: '#f0fdfa' }}>RTGS/Cash/Cheque/GPay</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, background: '#f0fdfa' }}>Cheque Number</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, background: '#f0fdfa' }}>Cheque Date</th>
                        
                        {/* Static Sales Team & Belt Columns */}
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Sales Team</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Belt</th>
                        
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, background: '#f0fdfa' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.length === 0 ? (
                        <tr>
                          <td colSpan="19" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                            <div>No bills match your filter criteria.</div>
                          </td>
                        </tr>
                      ) : (
                        filteredInvoices.map(inv => {
                        const value = inv.invoiceValue || 0;
                        const balance = inv.balance !== undefined ? inv.balance : value;
                        const overdue = calculateOverdueDays(inv.dateOfInvoice || inv.date);
                        const totalReceived = calculateTotalReceived(inv);
                        const form = paymentForms[inv._id] || {};
                        const displayDate = form.date !== undefined ? form.date : currentDateStr;

                        return (
                          <tr key={inv._id} style={{ borderBottom: '1px solid #f1f5f9', background: inv.status === 'Paid' ? '#f0fdf4' : 'white', transition: 'background-color 0.2s', ':hover': { backgroundColor: '#f8fafc' } }}>
                            {/* Frozen Column with checkbox + Dealer Name */}
                            <td style={{ position: 'sticky', left: 0, background: inv.status === 'Paid' ? '#f0fdf4' : 'white', zIndex: 10, padding: '1rem', fontWeight: 700, color: 'var(--primary-color)', borderRight: '2px solid #e2e8f0', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <input 
                                  type="checkbox" 
                                  checked={!!selectedInvoices[inv._id]} 
                                  onChange={() => toggleInvoiceSelection(inv._id)}
                                  style={{ cursor: 'pointer', width: '16px', height: '16px', marginTop: '0.15rem' }} 
                                />
                                <div>
                                  <div>{inv.dealerName}</div>
                                  <div style={{ marginTop: '0.5rem' }}>
                                    <span className={`badge badge-${inv.status === 'Paid' ? 'success' : inv.status === 'Partial' ? 'warning' : 'danger'}`}>{inv.status}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            
                            <td style={{ padding: '1rem', fontWeight: 600 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>{inv.invoiceNumber}</span>
                                {inv.invoiceImage && (
                                  <button 
                                    type="button" 
                                    onClick={() => setZoomedImageUrl(inv.invoiceImage)}
                                    style={{ 
                                      background: 'none', 
                                      border: 'none', 
                                      padding: 0, 
                                      cursor: 'pointer', 
                                      fontSize: '1.1rem',
                                      display: 'inline-flex',
                                      alignItems: 'center'
                                    }} 
                                    title="View Hard Copy"
                                  >
                                    📷
                                  </button>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 500 }}>₹{value.toLocaleString()}</td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <span style={{ color: overdue > 0 && inv.status !== 'Paid' ? '#b91c1c' : '#64748b', fontWeight: 600 }}>
                                {inv.status === 'Paid' ? 0 : overdue}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: balance > 0 ? '#b91c1c' : '#15803d' }}>₹{balance.toLocaleString()}</td>
                            <td style={{ padding: '1rem' }}>{inv.brand || '-'}</td>
                            <td style={{ padding: '1rem' }}>{new Date(inv.dateOfInvoice || inv.date).toLocaleDateString()}</td>
                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#0369a1' }}>₹{totalReceived.toLocaleString()}</td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              {(inv.partPayments && inv.partPayments.length > 0) ? (
                                <button 
                                  onClick={() => setActiveHistoryInvoice(inv)}
                                  style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '0.35rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s' }}
                                  onMouseEnter={(e) => { e.target.style.background = '#dbeafe'; }}
                                  onMouseLeave={(e) => { e.target.style.background = '#eff6ff'; }}
                                >
                                  View ({inv.partPayments.length})
                                </button>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>-</span>
                              )}
                            </td>

                            {/* Inputs - Only editable if unpaid/partial */}
                            {inv.status !== 'Paid' ? (
                              <>
                                <td style={{ padding: '0.5rem' }}>
                                  <input type="date" className="form-input" style={{ padding: '0.4rem', fontSize: '0.8rem', minWidth: '130px' }} value={displayDate} onChange={e => handlePaymentChange(inv._id, 'date', e.target.value)} />
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                  <select className="form-input" style={{ padding: '0.4rem', fontSize: '0.8rem', minWidth: '110px' }} value={form.paymentMode || 'Online'} onChange={e => handlePaymentChange(inv._id, 'paymentMode', e.target.value)}>
                                    <option value="Online">Online</option>
                                    <option value="Cash">Cash</option>
                                  </select>
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                  <input type="number" placeholder="Amt (₹)" className="form-input" style={{ padding: '0.4rem', fontSize: '0.8rem', minWidth: '100px' }} value={form.amount || ''} onChange={e => handlePaymentChange(inv._id, 'amount', e.target.value)} />
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                  <select className="form-input" style={{ padding: '0.4rem', fontSize: '0.8rem', minWidth: '110px' }} value={form.instrument || 'RTGS'} onChange={e => handlePaymentChange(inv._id, 'instrument', e.target.value)}>
                                    <option value="RTGS">RTGS</option>
                                    <option value="NEFT">NEFT</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="GPay">GPay</option>
                                  </select>
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                  <input type="text" placeholder="Chq No." className="form-input" disabled={form.paymentMode !== 'Cheque' && form.instrument !== 'Cheque'} style={{ padding: '0.4rem', fontSize: '0.8rem', minWidth: '100px', opacity: (form.paymentMode !== 'Cheque' && form.instrument !== 'Cheque') ? 0.5 : 1 }} value={form.chequeNumber || ''} onChange={e => handlePaymentChange(inv._id, 'chequeNumber', e.target.value)} />
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                  <input type="date" className="form-input" disabled={form.paymentMode !== 'Cheque' && form.instrument !== 'Cheque'} style={{ padding: '0.4rem', fontSize: '0.8rem', minWidth: '130px', opacity: (form.paymentMode !== 'Cheque' && form.instrument !== 'Cheque') ? 0.5 : 1 }} value={form.chequeDate || ''} onChange={e => handlePaymentChange(inv._id, 'chequeDate', e.target.value)} />
                                </td>
                                
                                {/* Sales Team & Belt columns at the end of inputs */}
                                <td style={{ padding: '1rem' }}>{inv.salesTeam || '-'}</td>
                                <td style={{ padding: '1rem' }}>{inv.belt || '-'}</td>
                                
                                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                  <button 
                                    onClick={() => handleSavePayment(inv._id)}
                                    className="btn btn-primary"
                                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                                  >
                                    Save Payment
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td colSpan="6" style={{ padding: '1rem', textAlign: 'center', color: '#15803d', fontWeight: 600, background: '#f0fdfa' }}>
                                  Fully Paid
                                </td>
                                <td style={{ padding: '1rem' }}>{inv.salesTeam || '-'}</td>
                                <td style={{ padding: '1rem' }}>{inv.belt || '-'}</td>
                                <td style={{ padding: '1rem', textAlign: 'center', background: '#f0fdfa' }}>
                                  -
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      }))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Card List */}
                <div className="mobile-view">
                  {filteredInvoices.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                      <div>No bills match your filter criteria.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {filteredInvoices.map(inv => {
                        const value = inv.invoiceValue || 0;
                        const balance = inv.balance !== undefined ? inv.balance : value;
                        const overdue = calculateOverdueDays(inv.dateOfInvoice || inv.date);
                        const totalReceived = calculateTotalReceived(inv);
                        const form = paymentForms[inv._id] || {};
                        const displayDate = form.date !== undefined ? form.date : currentDateStr;
                        const isExpanded = !!expandedPayments[inv._id];

                        return (
                          <div 
                            key={inv._id} 
                            className="mobile-card" 
                            style={{ 
                              borderLeft: `4px solid ${inv.status === 'Paid' ? '#10b981' : inv.status === 'Partial' ? '#f59e0b' : '#ef4444'}`,
                              background: inv.status === 'Paid' ? '#f0fdf4' : 'white',
                              padding: '1rem',
                              marginBottom: 0
                            }}
                          >
                            {/* Card Header: Checkbox + Invoice Details */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                              <input 
                                type="checkbox" 
                                checked={!!selectedInvoices[inv._id]} 
                                onChange={() => toggleInvoiceSelection(inv._id)}
                                style={{ cursor: 'pointer', width: '18px', height: '18px', marginTop: '0.15rem' }} 
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-color)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                    Invoice No: {inv.invoiceNumber}
                                    {inv.invoiceImage && (
                                      <button 
                                        type="button" 
                                        onClick={() => setZoomedImageUrl(inv.invoiceImage)}
                                        style={{ 
                                          background: 'none', 
                                          border: 'none', 
                                          padding: 0, 
                                          cursor: 'pointer', 
                                          fontSize: '1rem',
                                          display: 'inline-flex',
                                          alignItems: 'center'
                                        }}
                                        title="View Hard Copy"
                                      >
                                        📷
                                      </button>
                                    )}
                                  </span>
                                  <span className={`badge badge-${inv.status === 'Paid' ? 'success' : inv.status === 'Partial' ? 'warning' : 'danger'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                                    {inv.status}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                  Brand: <strong>{inv.brand || '-'}</strong> | Sales Team: <strong>{inv.salesTeam || '-'}</strong> | Belt: <strong>{inv.belt || '-'}</strong>
                                </div>
                              </div>
                            </div>

                            {/* Stats Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                              <div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Invoice Value</div>
                                <div style={{ fontWeight: 600, color: 'var(--primary-color)', fontSize: '0.9rem', marginTop: '0.1rem' }}>₹{value.toLocaleString()}</div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Balance</div>
                                <div style={{ fontWeight: 700, color: balance > 0 ? '#b91c1c' : '#15803d', fontSize: '0.9rem', marginTop: '0.1rem' }}>₹{balance.toLocaleString()}</div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Total Received</div>
                                <div style={{ fontWeight: 600, color: '#0369a1', fontSize: '0.9rem', marginTop: '0.1rem' }}>₹{totalReceived.toLocaleString()}</div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Overdue Days</div>
                                <div style={{ fontWeight: 700, color: overdue > 0 && inv.status !== 'Paid' ? '#b91c1c' : '#64748b', fontSize: '0.9rem', marginTop: '0.1rem' }}>
                                  {inv.status === 'Paid' ? 0 : overdue} Days
                                </div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Invoice Date</div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem', marginTop: '0.1rem' }}>
                                  {new Date(inv.dateOfInvoice || inv.date).toLocaleDateString()}
                                </div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Sales Team / Brand / Belt</div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem', marginTop: '0.1rem' }}>
                                  {inv.salesTeam || '-'} / {inv.brand || '-'} / {inv.belt || '-'}
                                </div>
                              </div>
                            </div>

                            {/* Action Row */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                {inv.partPayments && inv.partPayments.length > 0 ? (
                                  <button 
                                    onClick={() => setActiveHistoryInvoice(inv)}
                                    className="btn"
                                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}
                                  >
                                    History ({inv.partPayments.length})
                                  </button>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '0.75rem', marginLeft: '0.25rem' }}>No history</span>
                                )}
                              </div>

                              {inv.status !== 'Paid' && (
                                <button 
                                  onClick={() => toggleExpandPayment(inv._id)}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                  {isExpanded ? 'Hide Form ▲' : 'Record Payment ▼'}
                                </button>
                              )}
                            </div>

                            {/* Collapsible Payment Form */}
                            {inv.status !== 'Paid' && (
                              <div className={`mobile-card-form ${isExpanded ? 'open' : ''}`} style={{ fontSize: '0.85rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Received Date</label>
                                    <input type="date" className="form-input" style={{ width: '100%', padding: '0.45rem' }} value={displayDate} onChange={e => handlePaymentChange(inv._id, 'date', e.target.value)} />
                                  </div>

                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <div>
                                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Payment Mode</label>
                                      <select className="form-input" style={{ width: '100%', padding: '0.45rem' }} value={form.paymentMode || 'Online'} onChange={e => handlePaymentChange(inv._id, 'paymentMode', e.target.value)}>
                                        <option value="Online">Online</option>
                                        <option value="Cash">Cash</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Received Amount (₹)</label>
                                      <input type="number" placeholder="Amt (₹)" className="form-input" style={{ width: '100%', padding: '0.45rem' }} value={form.amount || ''} onChange={e => handlePaymentChange(inv._id, 'amount', e.target.value)} />
                                    </div>
                                  </div>

                                  <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Instrument Type</label>
                                    <select className="form-input" style={{ width: '100%', padding: '0.45rem' }} value={form.instrument || 'RTGS'} onChange={e => handlePaymentChange(inv._id, 'instrument', e.target.value)}>
                                      <option value="RTGS">RTGS</option>
                                      <option value="NEFT">NEFT</option>
                                      <option value="UPI">UPI</option>
                                      <option value="Cash">Cash</option>
                                      <option value="Cheque">Cheque</option>
                                      <option value="GPay">GPay</option>
                                    </select>
                                  </div>

                                  {(form.paymentMode === 'Cheque' || form.instrument === 'Cheque') && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                      <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Cheque Number</label>
                                        <input type="text" placeholder="Chq No." className="form-input" style={{ width: '100%', padding: '0.45rem' }} value={form.chequeNumber || ''} onChange={e => handlePaymentChange(inv._id, 'chequeNumber', e.target.value)} />
                                      </div>
                                      <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Cheque Date</label>
                                        <input type="date" className="form-input" style={{ width: '100%', padding: '0.45rem' }} value={form.chequeDate || ''} onChange={e => handlePaymentChange(inv._id, 'chequeDate', e.target.value)} />
                                      </div>
                                    </div>
                                  )}

                                  <button 
                                    onClick={() => handleSavePayment(inv._id)}
                                    className="btn btn-primary"
                                    style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', fontWeight: 600 }}
                                  >
                                    Save Payment
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })()
      )}

      {/* Part Payments Timeline Modal Overlay */}
      {activeHistoryInvoice && (
        <div className="modal-overlay" onClick={() => setActiveHistoryInvoice(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 style={{margin: 0, color: 'var(--primary-color)'}}>Payment History</h3>
                <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem'}}>
                  Invoice: <strong style={{color: 'var(--primary-color)'}}>{activeHistoryInvoice.invoiceNumber}</strong> | Dealer: <strong>{activeHistoryInvoice.dealerName}</strong>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveHistoryInvoice(null)} aria-label="Close modal">
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              {/* Progress Bar & Summary Stats */}
              <div className="modal-progress-section">
                {(() => {
                  const totalVal = activeHistoryInvoice.invoiceValue || 0;
                  const bal = activeHistoryInvoice.balance !== undefined ? activeHistoryInvoice.balance : totalVal;
                  const received = totalVal - bal;
                  const percentReceived = totalVal > 0 ? Math.min(100, Math.round((received / totalVal) * 100)) : 0;
                  return (
                    <>
                      <div className="progress-labels">
                        <span style={{color: 'var(--text-secondary)', fontWeight: 500}}>Collection Status</span>
                        <span className="progress-label-value" style={{color: percentReceived === 100 ? '#10b981' : 'var(--accent-color)'}}>{percentReceived}% Paid</span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar-fill" style={{ width: `${percentReceived}%`, background: percentReceived === 100 ? '#10b981' : 'var(--accent-color)' }}></div>
                      </div>
                      <div className="progress-meta-grid">
                        <div className="progress-meta-item">
                          <span className="progress-meta-label">Total Value</span>
                          <span className="progress-meta-value">₹{totalVal.toLocaleString()}</span>
                        </div>
                        <div className="progress-meta-item">
                          <span className="progress-meta-label">Total Paid</span>
                          <span className="progress-meta-value" style={{color: '#10b981'}}>₹{received.toLocaleString()}</span>
                        </div>
                        <div className="progress-meta-item">
                          <span className="progress-meta-label">Remaining</span>
                          <span className="progress-meta-value" style={{color: bal > 0 ? '#ef4444' : '#10b981'}}>₹{bal.toLocaleString()}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Payments List/Timeline */}
              <h4 style={{fontSize: '0.9rem', marginBottom: '0.75rem', fontWeight: 700, color: 'var(--primary-color)'}}>Payment History List</h4>
              {activeHistoryInvoice.partPayments && activeHistoryInvoice.partPayments.length > 0 ? (
                <div className="timeline-container">
                  {activeHistoryInvoice.partPayments.map((p, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content-card" style={p.isBounced ? { border: '1px solid #fee2e2', background: '#fef2f2' } : {}}>
                        <div className="timeline-item-meta" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Payment Date: <strong style={{ color: 'var(--text-primary)' }}>{new Date(p.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</strong>
                            {p.isBounced && (
                              <span className="badge badge-danger" style={{ marginLeft: '0.5rem', fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                                Bounced
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            Paid Amount: <span style={p.isBounced ? { textDecoration: 'line-through', color: '#ef4444' } : { color: '#10b981' }}>₹{p.amount.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="timeline-item-details">
                          <div className="timeline-detail-col">
                            <span className="timeline-detail-label">Mode</span>
                            <span className="timeline-detail-value" style={p.isBounced ? { textDecoration: 'line-through', color: '#94a3b8' } : {}}>{p.paymentMode}</span>
                          </div>
                          <div className="timeline-detail-col">
                            <span className="timeline-detail-label">Instrument</span>
                            <span className="timeline-detail-value" style={p.isBounced ? { textDecoration: 'line-through', color: '#94a3b8' } : {}}>{p.instrument || 'RTGS'}</span>
                          </div>
                          {p.chequeNumber && (
                            <div className="timeline-detail-col">
                              <span className="timeline-detail-label">Cheque No.</span>
                              <span className="timeline-detail-value" style={p.isBounced ? { textDecoration: 'line-through', color: '#94a3b8' } : {}}>{p.chequeNumber}</span>
                            </div>
                          )}
                          {p.chequeDate && (
                            <div className="timeline-detail-col">
                              <span className="timeline-detail-label">Cheque Date</span>
                              <span className="timeline-detail-value" style={p.isBounced ? { textDecoration: 'line-through', color: '#94a3b8' } : {}}>
                                {new Date(p.chequeDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)'}}>
                  No part payments recorded for this invoice.
                </div>
              )}
            </div>
            
            <div className="modal-footer" style={{background: '#f8fafc', borderTop: '1px solid var(--border-color)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end'}}>
              <button className="btn btn-secondary" onClick={() => setActiveHistoryInvoice(null)} style={{fontWeight: 600}}>
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {zoomedImageUrl && (
        <div 
          onClick={() => setZoomedImageUrl(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.9)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'zoom-out',
            padding: '2rem'
          }}
        >
          <img 
            src={zoomedImageUrl} 
            alt="Invoice hard copy Zoomed" 
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
          />
          <button 
            onClick={() => setZoomedImageUrl(null)}
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '1.5rem',
              background: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              fontSize: '1.25rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default CollectionEntry;
