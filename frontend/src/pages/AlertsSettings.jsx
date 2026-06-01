import React, { useState, useEffect } from 'react';
import { getInvoices } from '../utils/api';

const colorThemes = {
  red: { name: 'Red', bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  orange: { name: 'Orange', bg: '#ffedd5', text: '#9a3412', border: '#fed7aa' },
  yellow: { name: 'Yellow', bg: '#fef9c3', text: '#854d0e', border: '#fef08a' },
  blue: { name: 'Blue', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  green: { name: 'Green', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
};

const AlertsSettings = () => {
  const [brands, setBrands] = useState([]);
  const [dueAlerts, setDueAlerts] = useState([]);
  const [billHighlights, setBillHighlights] = useState([]);
  const [dealerHighlights, setDealerHighlights] = useState([]);

  // Form states
  const [alertBrand, setAlertBrand] = useState('All');
  const [alertDays, setAlertDays] = useState(30);

  const [billBrand, setBillBrand] = useState('All');
  const [billDays, setBillDays] = useState(30);
  const [billColor, setBillColor] = useState('red');

  const [dealerDays, setDealerDays] = useState(30);
  const [dealerColor, setDealerColor] = useState('red');

  useEffect(() => {
    // Load brands
    const loadBrands = async () => {
      const data = await getInvoices();
      const uniqueBrands = [...new Set(data.map(inv => inv.brand).filter(Boolean))].sort();
      setBrands(uniqueBrands);
    };
    loadBrands();

    // Load rules from localStorage with defaults
    const savedAlerts = localStorage.getItem('salesflow_due_alerts');
    if (savedAlerts) {
      setDueAlerts(JSON.parse(savedAlerts));
    } else {
      const defaults = [{ id: 'def-alert-1', brand: 'All', overdueDays: 30 }];
      setDueAlerts(defaults);
      localStorage.setItem('salesflow_due_alerts', JSON.stringify(defaults));
    }

    const savedBillHighlights = localStorage.getItem('salesflow_bill_highlights');
    if (savedBillHighlights) {
      setBillHighlights(JSON.parse(savedBillHighlights));
    } else {
      const defaults = [
        { id: 'def-bill-1', brand: 'All', overdueDays: 90, color: 'red' },
        { id: 'def-bill-2', brand: 'All', overdueDays: 60, color: 'orange' },
        { id: 'def-bill-3', brand: 'All', overdueDays: 30, color: 'yellow' }
      ];
      setBillHighlights(defaults);
      localStorage.setItem('salesflow_bill_highlights', JSON.stringify(defaults));
    }

    const savedDealerHighlights = localStorage.getItem('salesflow_dealer_highlights');
    if (savedDealerHighlights) {
      setDealerHighlights(JSON.parse(savedDealerHighlights));
    } else {
      const defaults = [
        { id: 'def-dealer-1', overdueDays: 45, color: 'red' }
      ];
      setDealerHighlights(defaults);
      localStorage.setItem('salesflow_dealer_highlights', JSON.stringify(defaults));
    }
  }, []);

  // Save updates helper helper
  const saveRules = (key, data, setter) => {
    setter(data);
    localStorage.setItem(key, JSON.stringify(data));
  };

  // Due alerts handlers
  const handleAddAlert = (e) => {
    e.preventDefault();
    const newAlert = {
      id: 'alert-' + Date.now(),
      brand: alertBrand,
      overdueDays: parseInt(alertDays) || 0,
    };
    saveRules('salesflow_due_alerts', [...dueAlerts, newAlert], setDueAlerts);
    setAlertBrand('All');
    setAlertDays(30);
  };

  const handleDeleteAlert = (id) => {
    const updated = dueAlerts.filter(a => a.id !== id);
    saveRules('salesflow_due_alerts', updated, setDueAlerts);
  };

  // Bill highlight handlers
  const handleAddBillHighlight = (e) => {
    e.preventDefault();
    const newHighlight = {
      id: 'bill-' + Date.now(),
      brand: billBrand,
      overdueDays: parseInt(billDays) || 0,
      color: billColor,
    };
    saveRules('salesflow_bill_highlights', [...billHighlights, newHighlight], setBillHighlights);
    setBillBrand('All');
    setBillDays(30);
    setBillColor('red');
  };

  const handleDeleteBillHighlight = (id) => {
    const updated = billHighlights.filter(h => h.id !== id);
    saveRules('salesflow_bill_highlights', updated, setBillHighlights);
  };

  // Dealer highlight handlers
  const handleAddDealerHighlight = (e) => {
    e.preventDefault();
    const newHighlight = {
      id: 'dealer-' + Date.now(),
      overdueDays: parseInt(dealerDays) || 0,
      color: dealerColor,
    };
    saveRules('salesflow_dealer_highlights', [...dealerHighlights, newHighlight], setDealerHighlights);
    setDealerDays(30);
    setDealerColor('red');
  };

  const handleDeleteDealerHighlight = (id) => {
    const updated = dealerHighlights.filter(h => h.id !== id);
    saveRules('salesflow_dealer_highlights', updated, setDealerHighlights);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-color)', margin: 0 }}>Alerts & Highlights Rules</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Configure custom rules to trigger due alerts or color-code aging bills and dealers based on overdue days.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        
        {/* SECTION 1: DUE ALERTS CONFIG */}
        <div className="card" style={{ padding: '1.5rem', background: '#white', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🔔</span> Due Alert Rules
          </h2>
          
          <form onSubmit={handleAddAlert} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Brand</label>
              <select className="form-input" value={alertBrand} onChange={e => setAlertBrand(e.target.value)} style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}>
                <option value="All">All Brands</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div style={{ width: '150px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Overdue days &ge;</label>
              <input type="number" className="form-input" value={alertDays} onChange={e => setAlertDays(Math.max(0, parseInt(e.target.value) || 0))} style={{ padding: '0.4rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: '38px', padding: '0 1.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
              + Add Alert
            </button>
          </form>

          {dueAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No due alert rules configured.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Brand Rule</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Overdue Threshold</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, width: '100px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dueAlerts.map(rule => (
                    <tr key={rule.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>{rule.brand}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#b91c1c' }}>&ge; {rule.overdueDays} Days Overdue</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <button type="button" onClick={() => handleDeleteAlert(rule.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SECTION 2: BILL COLORING RULES */}
        <div className="card" style={{ padding: '1.5rem', background: '#white', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🎨</span> Bill Highlighting Rules (Overdue Days Cell)
          </h2>

          <form onSubmit={handleAddBillHighlight} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ flex: '1', minWidth: '180px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Brand</label>
              <select className="form-input" value={billBrand} onChange={e => setBillBrand(e.target.value)} style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}>
                <option value="All">All Brands</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div style={{ width: '120px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Overdue days &ge;</label>
              <input type="number" className="form-input" value={billDays} onChange={e => setBillDays(Math.max(0, parseInt(e.target.value) || 0))} style={{ padding: '0.4rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }} />
            </div>
            <div style={{ width: '150px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Highlight Color</label>
              <select className="form-input" value={billColor} onChange={e => setBillColor(e.target.value)} style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}>
                {Object.keys(colorThemes).map(c => <option key={c} value={c}>{colorThemes[c].name}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: '38px', padding: '0 1.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
              + Add Rule
            </button>
          </form>

          {billHighlights.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No bill highlighting rules configured.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Brand Rule</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Overdue Threshold</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Visual Badge Preview</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, width: '100px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {billHighlights.map(rule => {
                    const theme = colorThemes[rule.color] || colorThemes.red;
                    return (
                      <tr key={rule.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>{rule.brand}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>&ge; {rule.overdueDays} Days</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ 
                            background: theme.bg, 
                            color: theme.text, 
                            border: `1px solid ${theme.border}`,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '0.8rem'
                          }}>
                            {rule.overdueDays} Days Overdue ({theme.name})
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <button type="button" onClick={() => handleDeleteBillHighlight(rule.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SECTION 3: DEALER COLORING RULES */}
        <div className="card" style={{ padding: '1.5rem', background: '#white', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🏢</span> Dealer Highlighting Rules (Dealers List View)
          </h2>

          <form onSubmit={handleAddDealerHighlight} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ width: '180px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Dealer Overdue days &ge;</label>
              <input type="number" className="form-input" value={dealerDays} onChange={e => setDealerDays(Math.max(0, parseInt(e.target.value) || 0))} style={{ padding: '0.4rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }} />
            </div>
            <div style={{ width: '180px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Highlight Color</label>
              <select className="form-input" value={dealerColor} onChange={e => setDealerColor(e.target.value)} style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}>
                {Object.keys(colorThemes).map(c => <option key={c} value={c}>{colorThemes[c].name}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: '38px', padding: '0 1.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
              + Add Rule
            </button>
          </form>

          {dealerHighlights.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No dealer highlighting rules configured.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Dealer Oldest Invoice age</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Visual Badge Preview</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, width: '100px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dealerHighlights.map(rule => {
                    const theme = colorThemes[rule.color] || colorThemes.red;
                    return (
                      <tr key={rule.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>&ge; {rule.overdueDays} Days Overdue</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ 
                            background: theme.bg, 
                            color: theme.text, 
                            border: `1px solid ${theme.border}`,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '0.8rem'
                          }}>
                            {theme.name} Highlight
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <button type="button" onClick={() => handleDeleteDealerHighlight(rule.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AlertsSettings;
