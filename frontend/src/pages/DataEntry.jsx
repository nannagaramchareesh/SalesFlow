import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { getInvoices, createInvoice, updateInvoice, deleteInvoice, createBulkInvoices, getDealers } from '../utils/api';
import { calculateOverdueDays, calculateTotalReceived, calculateDealerTotalOutstanding, countOverdueBills } from '../utils/formulas';
import { DEALERS_LIST, getDealerDetails } from '../utils/dealers';

const DataEntry = () => {
  const [invoices, setInvoices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [selectedDealer, setSelectedDealer] = useState('');
  const [dealersList, setDealersList] = useState([]);

  const [activeTab, setActiveTab] = useState('manual');
  const [excelPreview, setExcelPreview] = useState([]);
  const [excelError, setExcelError] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const initialFormState = {
    invoiceNumber: '',
    brand: '',
    dealerName: '',
    dateOfInvoice: new Date().toISOString().split('T')[0],
    invoiceValueBeforeTax: '',
    invoiceValue: '',
    belt: '',
    salesTeam: '',
    isCustomDealer: false,
    status: 'Unpaid'
  };

  const [formData, setFormData] = useState(initialFormState);
  const [zoomedImageUrl, setZoomedImageUrl] = useState(null);

  useEffect(() => {
    loadInvoices();
    loadDealers();
  }, []);

  const loadInvoices = async () => {
    const data = await getInvoices();
    setInvoices(data);
  };

  const loadDealers = async () => {
    try {
      const data = await getDealers();
      if (data && data.length > 0) {
        setDealersList(data.map(d => ({
          ...d,
          displayName: d.displayName || `${d.name} (${d.belt} - ${d.salesTeam})`
        })));
      } else {
        setDealersList(DEALERS_LIST);
      }
    } catch (err) {
      setDealersList(DEALERS_LIST);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.invoiceNumber || !formData.dealerName || !formData.invoiceValue || !formData.invoiceValueBeforeTax) return;

    const { isCustomDealer, ...rest } = formData;
    const payload = {
      ...rest,
      invoiceValueBeforeTax: Number(formData.invoiceValueBeforeTax),
      invoiceValue: Number(formData.invoiceValue),
      dateOfInvoice: new Date(formData.dateOfInvoice).toISOString()
    };

    if (editingId) {
      await updateInvoice(editingId, payload);
      setEditingId(null);
    } else {
      await createInvoice(payload);
    }

    setFormData(initialFormState);
    loadInvoices();
  };

  const handleEdit = (inv) => {
    const isPredefined = dealersList.some(d => d.name.toLowerCase() === inv.dealerName.toLowerCase());
    setEditingId(inv._id);
    setFormData({
      invoiceNumber: inv.invoiceNumber,
      brand: inv.brand || '',
      dealerName: inv.dealerName,
      dateOfInvoice: new Date(inv.dateOfInvoice || inv.date).toISOString().split('T')[0],
      invoiceValueBeforeTax: inv.invoiceValueBeforeTax !== undefined ? inv.invoiceValueBeforeTax : '',
      invoiceValue: inv.invoiceValue || inv.amount || 0,
      belt: inv.belt || '',
      salesTeam: inv.salesTeam || '',
      isCustomDealer: !isPredefined,
      status: inv.status
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      await deleteInvoice(id);
      loadInvoices();
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData(initialFormState);
  };

  const handleDealerChange = (e) => {
    const selected = e.target.value;
    if (selected === 'custom') {
      setFormData(prev => ({
        ...prev,
        dealerName: '',
        belt: '',
        salesTeam: '',
        isCustomDealer: true
      }));
    } else if (selected === '') {
      setFormData(prev => ({
        ...prev,
        dealerName: '',
        belt: '',
        salesTeam: '',
        isCustomDealer: false
      }));
    } else {
      const details = dealersList.find(d => d.displayName === selected);
      setFormData(prev => ({
        ...prev,
        dealerName: details ? details.name : '',
        belt: details ? details.belt : '',
        salesTeam: details ? details.salesTeam : '',
        isCustomDealer: false
      }));
    }
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportResult(null);
    setExcelError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        
        if (data.length === 0) {
          setExcelError('The uploaded Excel sheet appears to be empty.');
          setExcelPreview([]);
          return;
        }

        const parsedInvoices = data.map((row) => {
          const getVal = (possibleKeys) => {
            const foundKey = Object.keys(row).find(k => 
              possibleKeys.some(pk => k.toLowerCase().replace(/[^a-z0-9]/g, '') === pk.toLowerCase().replace(/[^a-z0-9]/g, ''))
            );
            return foundKey ? row[foundKey] : '';
          };

          const invoiceNumber = String(getVal(['invoicenumber', 'invoiceno', 'invno'])).trim();
          const dealerName = String(getVal(['dealername', 'dealer'])).trim();
          const rawDate = getVal(['invoicedate', 'date', 'invdate']);
          const invoiceValue = Number(getVal(['invoicevalue', 'value', 'amount', 'invoiceval'])) || 0;
          const invoiceValueBeforeTax = Number(getVal(['invoicevaluebeforetax', 'valuebeforetax', 'amountbeforetax', 'invvalbeforetax', 'valbeforetax'])) || 0;

          let dateOfInvoice = new Date().toISOString().split('T')[0];
          if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
              dateOfInvoice = d.toISOString().split('T')[0];
            }
          }

          const brand = invoiceNumber.includes('-') ? invoiceNumber.split('-')[0].trim() : '';
          const dealerDetail = dealersList.find(d => d.name.toLowerCase() === dealerName.toLowerCase());
          const belt = dealerDetail ? dealerDetail.belt : '';
          const salesTeam = dealerDetail ? dealerDetail.salesTeam : '';

          return {
            invoiceNumber,
            brand,
            dealerName,
            dateOfInvoice,
            invoiceValue,
            invoiceValueBeforeTax,
            belt,
            salesTeam,
            status: 'Unpaid'
          };
        }).filter(inv => inv.invoiceNumber && inv.dealerName);

        if (parsedInvoices.length === 0) {
          setExcelError('No valid rows found. Please check columns: invoice number, dealer name, invoice date, invoice value, invoice value before tax.');
          setExcelPreview([]);
        } else {
          setExcelPreview(parsedInvoices);
        }
      } catch (err) {
        setExcelError('Failed to parse file: ' + err.message);
        setExcelPreview([]);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input element
  };

  const handleSaveBulkInvoices = async () => {
    if (excelPreview.length === 0) return;
    setIsImporting(true);
    try {
      const response = await createBulkInvoices(excelPreview);
      
      if (response && response.message && response.message.includes('failed to insert')) {
        setImportResult({
          success: true,
          message: `${response.insertedCount} invoices imported successfully. Some duplicate invoice numbers were skipped.`,
          count: response.insertedCount
        });
      } else {
        setImportResult({
          success: true,
          message: `Successfully imported ${excelPreview.length} invoices!`,
          count: excelPreview.length
        });
      }
      setExcelPreview([]);
      loadInvoices();
    } catch (err) {
      setExcelError('Error saving invoices: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsImporting(false);
    }
  };

  const clearExcelImport = () => {
    setExcelPreview([]);
    setExcelError(null);
    setImportResult(null);
  };

  const displayedInvoices = selectedDealer ? invoices.filter(inv => inv.dealerName === selectedDealer) : invoices;
  const sumOfBalance = calculateDealerTotalOutstanding(invoices, selectedDealer || null);
  const overdueBillsCount = countOverdueBills(invoices, selectedDealer || null);
  const uniqueDealers = [...new Set(invoices.map(inv => inv.dealerName))].filter(Boolean);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Data Entry (Invoices)</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            value={selectedDealer}
            onChange={(e) => setSelectedDealer(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
          >
            <option value="">All Dealers (Global)</option>
            {uniqueDealers.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', background: 'white', padding: '0.5rem 1rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            Current Date: <strong style={{ color: 'var(--primary-color)' }}>{new Date().toLocaleDateString()}</strong>
          </div>
        </div>
      </div>

      <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1.5rem', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1px solid #bbf7d0' }}>
          <h3 style={{ fontSize: '1rem', color: '#166534', marginBottom: '0.5rem' }}>
            {selectedDealer ? `${selectedDealer} Total Outstanding` : 'Global Total Outstanding'}
          </h3>
          <p style={{ fontSize: '2.5rem', fontWeight: '800', color: '#15803d', margin: 0 }}>₹{sumOfBalance.toLocaleString()}</p>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1.5rem', background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: '1px solid #fecaca' }}>
          <h3 style={{ fontSize: '1rem', color: '#991b1b', marginBottom: '0.5rem' }}>
            {selectedDealer ? `${selectedDealer} Overdue Bills` : 'Global Overdue Bills'}
          </h3>
          <p style={{ fontSize: '2.5rem', fontWeight: '800', color: '#b91c1c', margin: 0 }}>{overdueBillsCount}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem', borderTop: editingId ? '4px solid var(--primary-color)' : 'none' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.125rem', color: editingId ? 'var(--primary-color)' : 'inherit' }}>
          {editingId ? '✏️ Edit Invoice' : '➕ New Invoice'}
        </h2>

        {!editingId && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <button 
              type="button" 
              onClick={() => { setActiveTab('manual'); clearExcelImport(); }} 
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'manual' ? '3px solid var(--primary-color)' : '3px solid transparent',
                color: activeTab === 'manual' ? 'var(--primary-color)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.95rem',
                padding: '0.25rem 0.5rem 0.5rem 0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Manual Entry
            </button>
            <button 
              type="button" 
              onClick={() => { setActiveTab('excel'); }} 
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'excel' ? '3px solid var(--primary-color)' : '3px solid transparent',
                color: activeTab === 'excel' ? 'var(--primary-color)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.95rem',
                padding: '0.25rem 0.5rem 0.5rem 0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Excel Import
            </button>
          </div>
        )}

        {activeTab === 'excel' && !editingId ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '0.85rem 1rem', background: '#f8fafc', borderLeft: '4px solid var(--primary-color)', borderRadius: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <strong>Import Instructions:</strong> Upload a spreadsheet containing columns for: 
              <code style={{ background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: '4px', margin: '0 0.25rem', fontWeight: 600 }}>invoice number</code>, 
              <code style={{ background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: '4px', margin: '0 0.25rem', fontWeight: 600 }}>dealer name</code>, 
              <code style={{ background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: '4px', margin: '0 0.25rem', fontWeight: 600 }}>invoice date</code>, 
              <code style={{ background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: '4px', margin: '0 0.25rem', fontWeight: 600 }}>invoice value</code>, and 
              <code style={{ background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: '4px', margin: '0 0.25rem', fontWeight: 600 }}>invoice value before tax</code>.
            </div>

            {excelError && (
              <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 500 }}>
                ⚠️ {excelError}
              </div>
            )}

            {importResult && (
              <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#15803d', fontSize: '0.85rem', fontWeight: 500 }}>
                ✅ {importResult.message}
              </div>
            )}

            {excelPreview.length === 0 ? (
              <div 
                style={{ 
                  border: '2px dashed var(--border-color)', 
                  borderRadius: '8px', 
                  padding: '2.5rem 1rem', 
                  textAlign: 'center', 
                  cursor: 'pointer',
                  background: '#f8fafc',
                  transition: 'border-color 0.2s',
                  position: 'relative'
                }}
              >
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .ods, .csv" 
                  onChange={handleExcelUpload} 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }} 
                />
                <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>📄</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                  Click to upload Excel Spreadsheet
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Supports .xlsx, .xls, .csv up to 10MB
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Previewing {excelPreview.length} invoices from spreadsheet:
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={clearExcelImport} 
                      className="btn" 
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px' }}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveBulkInvoices} 
                      className="btn btn-primary" 
                      disabled={isImporting}
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', minWidth: '100px' }}
                    >
                      {isImporting ? 'Saving...' : `Save ${excelPreview.length} Invoices`}
                    </button>
                  </div>
                </div>

                <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Invoice No</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Brand</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Dealer</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Date</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Val Before Tax</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelPreview.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{item.invoiceNumber}</td>
                          <td style={{ padding: '0.5rem 0.75rem' }}>{item.brand || 'No Brand'}</td>
                          <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>{item.dealerName}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>{item.dateOfInvoice}</td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>₹{item.invoiceValueBeforeTax.toLocaleString()}</td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>₹{item.invoiceValue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>
                Invoice Number
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.invoiceNumber}
                onChange={e => {
                  const val = e.target.value;
                  const brand = val.includes('-') ? val.split('-')[0].trim() : '';
                  setFormData({ ...formData, invoiceNumber: val, brand: brand });
                }}
                placeholder="e.g. PE-EH24001682"
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Brand</label>
              <input
                type="text"
                className="form-input"
                value={formData.brand}
                readOnly
                style={{ backgroundColor: '#e2e8f0', color: '#475569', cursor: 'not-allowed' }}
                placeholder="Auto-extracted"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Dealer Name</label>
              <select
                className="form-input"
                value={
                  formData.isCustomDealer
                    ? 'custom'
                    : (dealersList.find(d => 
                        d.name === formData.dealerName &&
                        d.salesTeam === formData.salesTeam &&
                        d.belt === formData.belt
                      )?.displayName || '')
                }
                onChange={handleDealerChange}
                required
              >
                <option value="">-- Select Dealer --</option>
                {dealersList.map(d => (
                  <option key={d.displayName} value={d.displayName}>{d.displayName}</option>
                ))}
                <option value="custom">Custom (Type Manually)...</option>
              </select>
            </div>

            {formData.isCustomDealer && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Custom Dealer Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.dealerName}
                  onChange={e => setFormData({ ...formData, dealerName: e.target.value })}
                  placeholder="Enter dealer name"
                  required
                />
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Sales Team</label>
              <input
                type="text"
                className="form-input"
                value={formData.salesTeam || ''}
                onChange={e => setFormData({ ...formData, salesTeam: e.target.value })}
                readOnly={!formData.isCustomDealer}
                style={!formData.isCustomDealer ? { backgroundColor: '#e2e8f0', color: '#475569', cursor: 'not-allowed' } : {}}
                placeholder="Auto-populated"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Belt</label>
              <input
                type="text"
                className="form-input"
                value={formData.belt || ''}
                onChange={e => setFormData({ ...formData, belt: e.target.value })}
                readOnly={!formData.isCustomDealer}
                style={!formData.isCustomDealer ? { backgroundColor: '#e2e8f0', color: '#475569', cursor: 'not-allowed' } : {}}
                placeholder="Auto-populated"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Date of Invoice</label>
              <input type="date" className="form-input" value={formData.dateOfInvoice} onChange={e => setFormData({ ...formData, dateOfInvoice: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Invoice Value Before Tax (₹)</label>
              <input type="number" className="form-input" value={formData.invoiceValueBeforeTax} onChange={e => setFormData({ ...formData, invoiceValueBeforeTax: e.target.value })} placeholder="0.00" required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Invoice Value (₹)</label>
              <input type="number" className="form-input" value={formData.invoiceValue} onChange={e => setFormData({ ...formData, invoiceValue: e.target.value })} placeholder="0.00" required />
            </div>

            <div className="mobile-actions-stack" style={{ display: 'flex', gap: '0.5rem', height: '42px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0' }}>{editingId ? 'Update' : 'Add'}</button>
              {editingId && <button type="button" className="btn" onClick={cancelEdit} style={{ flex: 1, padding: '0', backgroundColor: '#e2e8f0', color: '#1e293b' }}>Cancel</button>}
            </div>
          </form>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>All Invoices {selectedDealer && `(${selectedDealer})`}</h2>
        <div className="table-container desktop-view">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Invoice Number</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Brand</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Dealer Name</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Sales Team</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Belt</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>Value Before Tax</th>
                <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>Value (Incl. Tax)</th>
                <th style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedInvoices.map((inv) => {
                const value = inv.invoiceValue || 0;
                return (
                  <tr key={inv._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s', ':hover': { backgroundColor: '#f8fafc' } }}>
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
                              fontSize: '1rem',
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
                    <td style={{ padding: '1rem' }}>{inv.brand || 'No Brand'}</td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{inv.dealerName}</td>
                    <td style={{ padding: '1rem' }}>{inv.salesTeam || '-'}</td>
                    <td style={{ padding: '1rem' }}>{inv.belt || '-'}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{new Date(inv.dateOfInvoice || inv.date).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 500 }}>₹{(inv.invoiceValueBeforeTax || 0).toLocaleString()}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 500 }}>₹{value.toLocaleString()}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button onClick={() => handleEdit(inv)} className="btn" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', background: 'var(--primary-light)', color: 'var(--primary-color)', border: 'none', borderRadius: '6px', fontWeight: 600, transition: 'all 0.2s' }}>Edit</button>
                        <button onClick={() => handleDelete(inv._id)} className="btn" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '6px', fontWeight: 600, transition: 'all 0.2s' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {displayedInvoices.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
                    <div>No invoices found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mobile-view">
          {displayedInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
              <div>No invoices found.</div>
            </div>
          ) : (
            displayedInvoices.map((inv) => {
              const overdue = calculateOverdueDays(inv.dateOfInvoice || inv.date);
              const value = inv.invoiceValue || 0;
              const balance = inv.balance !== undefined ? inv.balance : value;
              const totalReceived = calculateTotalReceived(inv);
              return (
                <div key={inv._id} className="mobile-card">
                  <div className="mobile-card-header">
                    <div>
                      <div className="mobile-card-title">{inv.dealerName}</div>
                      <div className="mobile-card-subtitle">
                        {inv.invoiceNumber} <span style={{ opacity: 0.7 }}>({inv.brand || 'No Brand'})</span>
                        {inv.invoiceImage && (
                          <button 
                            type="button" 
                            onClick={() => setZoomedImageUrl(inv.invoiceImage)}
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              padding: '0 0.5rem', 
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
                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                          Team: <strong>{inv.salesTeam || '-'}</strong> | Belt: <strong>{inv.belt || '-'}</strong>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="mobile-card-grid">
                    <div className="mobile-data-item">
                      <span className="mobile-data-label">Value Before Tax</span>
                      <span className="mobile-data-value">₹{(inv.invoiceValueBeforeTax || 0).toLocaleString()}</span>
                    </div>
                    <div className="mobile-data-item" style={{ textAlign: 'right' }}>
                      <span className="mobile-data-label">Value (Incl. Tax)</span>
                      <span className="mobile-data-value">₹{value.toLocaleString()}</span>
                    </div>
                    <div className="mobile-data-item" style={{ gridColumn: 'span 2' }}>
                      <span className="mobile-data-label">Invoice Date</span>
                      <span className="mobile-data-value" style={{ fontSize: '0.85rem' }}>
                        {new Date(inv.dateOfInvoice || inv.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="mobile-card-actions">
                    <button onClick={() => handleEdit(inv)} className="btn" style={{ background: '#f1f5f9', color: '#0f172a' }}>Edit</button>
                    <button onClick={() => handleDelete(inv._id)} className="btn" style={{ background: '#fee2e2', color: '#b91c1c' }}>Delete</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

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

export default DataEntry;
