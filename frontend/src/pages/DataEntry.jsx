import { useState, useEffect } from 'react';
import { getInvoices, createInvoice, updateInvoice, deleteInvoice } from '../utils/api';
import { calculateOverdueDays, calculateTotalReceived, calculateDealerTotalOutstanding, countOverdueBills } from '../utils/formulas';

const DataEntry = () => {
  const [invoices, setInvoices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [selectedDealer, setSelectedDealer] = useState('');
  
  const initialFormState = {
    invoiceNumber: '',
    dealerName: '',
    dateOfInvoice: new Date().toISOString().split('T')[0],
    invoiceValue: '',
    belt: '',
    status: 'Unpaid'
  };
  
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    const data = await getInvoices();
    setInvoices(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.invoiceNumber || !formData.dealerName || !formData.invoiceValue) return;
    
    const payload = {
      ...formData,
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
    setEditingId(inv._id);
    setFormData({
      invoiceNumber: inv.invoiceNumber,
      dealerName: inv.dealerName,
      dateOfInvoice: new Date(inv.dateOfInvoice || inv.date).toISOString().split('T')[0],
      invoiceValue: inv.invoiceValue || inv.amount || 0,
      belt: inv.belt || '',
      status: inv.status
    });
  };

  const handleDelete = async (id) => {
    if(window.confirm('Are you sure you want to delete this invoice?')) {
      await deleteInvoice(id);
      loadInvoices();
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData(initialFormState);
  };

  const displayedInvoices = selectedDealer ? invoices.filter(inv => inv.dealerName === selectedDealer) : invoices;
  const sumOfBalance = calculateDealerTotalOutstanding(invoices, selectedDealer || null);
  const overdueBillsCount = countOverdueBills(invoices, selectedDealer || null);
  const uniqueDealers = [...new Set(invoices.map(inv => inv.dealerName))].filter(Boolean);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title" style={{marginBottom: 0}}>Data Entry (Invoices)</h1>
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
            Current Date: <strong style={{color: 'var(--primary-color)'}}>{new Date().toLocaleDateString()}</strong>
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
      
      <div className="card" style={{marginBottom: '2rem', borderTop: editingId ? '4px solid var(--primary-color)' : 'none'}}>
        <h2 style={{marginBottom: '1rem', fontSize: '1.125rem', color: editingId ? 'var(--primary-color)' : 'inherit'}}>
          {editingId ? '✏️ Edit Invoice' : '➕ New Invoice'}
        </h2>
        <form onSubmit={handleSubmit} className="grid-mobile-stack" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', alignItems: 'end'}}>
          <div className="form-group" style={{marginBottom: 0}}>
            <label style={{fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block'}}>
              Invoice Number <span style={{fontWeight: 400, fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.7, marginLeft: '0.25rem'}}>(Brand is auto-extracted)</span>
            </label>
            <input type="text" className="form-input" value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} placeholder="e.g. PE-EH24001682" required />
          </div>
          <div className="form-group" style={{marginBottom: 0}}>
            <label style={{fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block'}}>Dealer Name</label>
            <input type="text" className="form-input" value={formData.dealerName} onChange={e => setFormData({...formData, dealerName: e.target.value})} placeholder="Select or enter dealer" required />
          </div>
          <div className="form-group" style={{marginBottom: 0}}>
            <label style={{fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block'}}>Date of Invoice</label>
            <input type="date" className="form-input" value={formData.dateOfInvoice} onChange={e => setFormData({...formData, dateOfInvoice: e.target.value})} required />
          </div>
          <div className="form-group" style={{marginBottom: 0}}>
            <label style={{fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block'}}>Invoice Value (₹)</label>
            <input type="number" className="form-input" value={formData.invoiceValue} onChange={e => setFormData({...formData, invoiceValue: e.target.value})} placeholder="0.00" required />
          </div>

          <div className="mobile-actions-stack" style={{ display: 'flex', gap: '0.5rem', height: '42px' }}>
            <button type="submit" className="btn btn-primary" style={{flex: 1, padding: '0'}}>{editingId ? 'Update' : 'Add'}</button>
            {editingId && <button type="button" className="btn" onClick={cancelEdit} style={{flex: 1, padding: '0', backgroundColor: '#e2e8f0', color: '#1e293b'}}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <h2 style={{marginBottom: '1rem', fontSize: '1.125rem'}}>All Invoices {selectedDealer && `(${selectedDealer})`}</h2>
        <div className="table-container desktop-view">
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{borderBottom: '2px solid #e2e8f0'}}>
                <th style={{padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600}}>Invoice No / Brand</th>
                <th style={{padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600}}>Dealer Name</th>
                <th style={{padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600}}>Date</th>
                <th style={{padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600}}>Value</th>
                <th style={{padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600}}>Received</th>
                <th style={{padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600}}>Balance</th>
                <th style={{padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600}}>Overdue Days</th>
                <th style={{padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600}}>Status</th>
                <th style={{padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedInvoices.map((inv) => {
                const overdue = calculateOverdueDays(inv.dateOfInvoice || inv.date);
                const value = inv.invoiceValue || 0;
                const balance = inv.balance !== undefined ? inv.balance : value;
                const totalReceived = calculateTotalReceived(inv);
                return (
                  <tr key={inv._id} style={{borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s', ':hover': {backgroundColor: '#f8fafc'}}}>
                    <td style={{padding: '1rem'}}>
                      <div style={{fontWeight: 600}}>{inv.invoiceNumber}</div>
                      <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{inv.brand || 'No Brand'}</div>
                    </td>
                    <td style={{padding: '1rem', fontWeight: 500}}>{inv.dealerName}</td>
                    <td style={{padding: '1rem', color: 'var(--text-secondary)'}}>{new Date(inv.dateOfInvoice || inv.date).toLocaleDateString()}</td>
                    <td style={{padding: '1rem', textAlign: 'right', fontWeight: 500}}>₹{value.toLocaleString()}</td>
                    <td style={{padding: '1rem', textAlign: 'right', fontWeight: 500, color: 'var(--success-color)'}}>₹{totalReceived.toLocaleString()}</td>
                    <td style={{padding: '1rem', textAlign: 'right', fontWeight: 600, color: balance > 0 ? 'inherit' : 'var(--success-color)'}}>₹{balance.toLocaleString()}</td>
                    <td style={{padding: '1rem', textAlign: 'center'}}>
                      <span style={{ 
                        background: overdue > 0 && inv.status !== 'Paid' ? '#fee2e2' : '#f1f5f9', 
                        color: overdue > 0 && inv.status !== 'Paid' ? '#b91c1c' : '#64748b',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}>
                        {inv.status === 'Paid' ? 0 : overdue}
                      </span>
                    </td>
                    <td style={{padding: '1rem', textAlign: 'center'}}>
                      <span className={`badge badge-${inv.status === 'Paid' ? 'success' : inv.status === 'Partial' ? 'warning' : 'danger'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{padding: '1rem'}}>
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
                  <td colSpan="9" style={{textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)'}}>
                    <div style={{fontSize: '2rem', marginBottom: '1rem'}}>📄</div>
                    <div>No invoices found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mobile-view">
          {displayedInvoices.length === 0 ? (
            <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)'}}>
              <div style={{fontSize: '2rem', marginBottom: '1rem'}}>📄</div>
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
                      <div className="mobile-card-subtitle">{inv.invoiceNumber} <span style={{opacity: 0.7}}>({inv.brand || 'No Brand'})</span></div>
                    </div>
                    <span className={`badge badge-${inv.status === 'Paid' ? 'success' : inv.status === 'Partial' ? 'warning' : 'danger'}`}>
                      {inv.status}
                    </span>
                  </div>
                  
                  <div className="mobile-card-grid">
                    <div className="mobile-data-item">
                      <span className="mobile-data-label">Value</span>
                      <span className="mobile-data-value">₹{value.toLocaleString()}</span>
                    </div>
                    <div className="mobile-data-item" style={{textAlign: 'right'}}>
                      <span className="mobile-data-label">Balance</span>
                      <span className="mobile-data-value" style={{color: balance > 0 ? '#b91c1c' : '#15803d', fontWeight: 700}}>
                        ₹{balance.toLocaleString()}
                      </span>
                    </div>
                    <div className="mobile-data-item">
                      <span className="mobile-data-label">Received</span>
                      <span className="mobile-data-value" style={{color: 'var(--success-color)'}}>₹{totalReceived.toLocaleString()}</span>
                    </div>
                    <div className="mobile-data-item" style={{textAlign: 'right'}}>
                      <span className="mobile-data-label">Overdue</span>
                      <span className="mobile-data-value" style={{color: overdue > 0 && inv.status !== 'Paid' ? '#b91c1c' : 'inherit'}}>
                        {inv.status === 'Paid' ? '0 days' : `${overdue} days`}
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
    </div>
  );
};

export default DataEntry;
