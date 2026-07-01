import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { getDealers, createDealer, deleteDealer, createBulkDealers } from '../utils/api';
import { DEALERS_LIST as STATIC_DEALERS } from '../utils/dealers';

const DealersMaster = () => {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [beltFilter, setBeltFilter] = useState('');

  // Add form states
  const [name, setName] = useState('');
  const [salesTeam, setSalesTeam] = useState('Arvind');
  const [customSalesTeam, setCustomSalesTeam] = useState('');
  const [belt, setBelt] = useState('FRI');
  const [customBelt, setCustomBelt] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Excel Upload states
  const [activeTab, setActiveTab] = useState('manual');
  const [excelPreview, setExcelPreview] = useState([]);
  const [excelError, setExcelError] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadDealers();
  }, []);

  const loadDealers = async () => {
    setLoading(true);
    try {
      const data = await getDealers();
      if (data && data.length > 0) {
        setDealers(data);
      } else {
        setDealers(STATIC_DEALERS);
      }
    } catch (error) {
      console.error('Error loading dealers:', error);
      setDealers(STATIC_DEALERS);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDealer = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    const finalSalesTeam = salesTeam === 'custom' ? customSalesTeam.trim() : salesTeam;
    const finalBelt = belt === 'custom' ? customBelt.trim() : belt;

    if (!finalSalesTeam || !finalBelt) {
      setErrorMsg('Please specify both sales team and belt.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: name.trim(),
      salesTeam: finalSalesTeam,
      belt: finalBelt,
      contactNumber: contactNumber.trim()
    };

    try {
      const result = await createDealer(payload);
      setSuccessMsg(`Dealer "${result.name}" added successfully!`);
      setName('');
      setContactNumber('');
      if (salesTeam === 'custom') setCustomSalesTeam('');
      if (belt === 'custom') setCustomBelt('');
      loadDealers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to add dealer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDealer = async (id, dealerName) => {
    if (window.confirm(`Are you sure you want to delete dealer "${dealerName}"?`)) {
      try {
        await deleteDealer(id);
        setSuccessMsg(`Dealer "${dealerName}" deleted successfully!`);
        loadDealers();
      } catch (err) {
        setErrorMsg('Failed to delete dealer. It might be stored locally only.');
      }
    }
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setExcelError(null);
    setErrorMsg('');
    setSuccessMsg('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        
        if (data.length === 0) {
          setExcelError('The uploaded Excel sheet appears to be empty.');
          setExcelPreview([]);
          return;
        }

        const parsedDealers = data.map((row) => {
          const getVal = (possibleKeys) => {
            const foundKey = Object.keys(row).find(k => 
              possibleKeys.some(pk => k.toLowerCase().replace(/[^a-z0-9]/g, '') === pk.toLowerCase().replace(/[^a-z0-9]/g, ''))
            );
            return foundKey ? row[foundKey] : '';
          };

          const name = String(getVal(['name', 'dealername', 'dealer'])).trim();
          const salesTeam = String(getVal(['salesteam', 'team', 'salesperson', 'salesman'])).trim();
          const belt = String(getVal(['belt', 'area', 'route'])).trim();
          const contactNumber = String(getVal(['contactnumber', 'contact', 'phone', 'phonenumber', 'mobile'])).trim();

          return {
            name,
            salesTeam,
            belt,
            contactNumber
          };
        }).filter(d => d.name && d.salesTeam && d.belt);

        if (parsedDealers.length === 0) {
          setExcelError('No valid rows found. Please check columns: Name (or Dealer Name), Sales Team, and Belt.');
          setExcelPreview([]);
        } else {
          setExcelPreview(parsedDealers);
        }
      } catch (err) {
        setExcelError('Failed to parse file: ' + err.message);
        setExcelPreview([]);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input element
  };

  const handleSaveBulkDealers = async () => {
    if (excelPreview.length === 0) return;
    setIsImporting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await createBulkDealers(excelPreview);
      
      if (response && response.message && response.message.includes('failed to insert')) {
        const msg = `${response.insertedCount} dealers imported successfully. Some duplicate names were skipped.`;
        setSuccessMsg(msg);
      } else {
        const msg = `Successfully imported ${excelPreview.length} dealers!`;
        setSuccessMsg(msg);
      }
      setExcelPreview([]);
      setActiveTab('manual');
      loadDealers();
    } catch (err) {
      const errMsg = 'Error saving dealers: ' + (err.response?.data?.message || err.message);
      setErrorMsg(errMsg);
    } finally {
      setIsImporting(false);
    }
  };

  const clearExcelImport = () => {
    setExcelPreview([]);
    setExcelError(null);
  };

  // Filter logic
  const filteredDealers = dealers.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (d.contactNumber && d.contactNumber.includes(searchQuery));
    const matchesTeam = teamFilter ? d.salesTeam === teamFilter : true;
    const matchesBelt = beltFilter ? d.belt === beltFilter : true;
    return matchesSearch && matchesTeam && matchesBelt;
  });

  return (
    <div className="page-container">
      <h1 className="page-title">Dealers Master</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        
        {/* Add Dealer Form */}
        <div className="card">
          <h2 style={{ marginBottom: '1.25rem', fontSize: '1.125rem' }}>Add New Dealer-Sales Team-Belt</h2>
          
          {errorMsg && (
            <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ padding: '0.75rem', background: '#dcfce7', color: '#15803d', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              ✓ {successMsg}
            </div>
          )}

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

          {activeTab === 'excel' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ padding: '0.85rem 1rem', background: '#f8fafc', borderLeft: '4px solid var(--primary-color)', borderRadius: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong>Import Instructions:</strong> Upload a spreadsheet containing columns for: 
                <code style={{ background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: '4px', margin: '0 0.25rem', fontWeight: 600 }}>name</code> (or dealer name), 
                <code style={{ background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: '4px', margin: '0 0.25rem', fontWeight: 600 }}>sales team</code>, 
                <code style={{ background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: '4px', margin: '0 0.25rem', fontWeight: 600 }}>belt</code>, and 
                <code style={{ background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: '4px', margin: '0 0.25rem', fontWeight: 600 }}>contact number</code> (optional).
              </div>

              {excelError && (
                <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 500 }}>
                  ⚠️ {excelError}
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
                    Supports .xlsx, .xls, .csv
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Previewing {excelPreview.length} dealers from spreadsheet:
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
                        onClick={handleSaveBulkDealers} 
                        className="btn btn-primary" 
                        disabled={isImporting}
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', minWidth: '100px' }}
                      >
                        {isImporting ? 'Saving...' : `Save ${excelPreview.length} Dealers`}
                      </button>
                    </div>
                  </div>

                  <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 1 }}>
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Dealer Name</th>
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Sales Team</th>
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Belt</th>
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Contact Number</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelPreview.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{item.name}</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{item.salesTeam}</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{item.belt}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>{item.contactNumber || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleAddDealer} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Dealer Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter dealer name"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Contact Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={contactNumber}
                  onChange={e => setContactNumber(e.target.value)}
                  placeholder="Enter contact number"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Sales Team</label>
                <select
                  className="form-input"
                  value={salesTeam}
                  onChange={e => setSalesTeam(e.target.value)}
                >
                  <option value="Arvind">Arvind</option>
                  <option value="Praveen">Praveen</option>
                  <option value="custom">Custom (Type Manually)...</option>
                </select>
              </div>

              {salesTeam === 'custom' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Custom Sales Team</label>
                  <input
                    type="text"
                    className="form-input"
                    value={customSalesTeam}
                    onChange={e => setCustomSalesTeam(e.target.value)}
                    placeholder="Sales team name"
                    required
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Belt</label>
                <select
                  className="form-input"
                  value={belt}
                  onChange={e => setBelt(e.target.value)}
                >
                  <option value="FRI">FRI</option>
                  <option value="MON">MON</option>
                  <option value="TUE">TUE</option>
                  <option value="WED">WED</option>
                  <option value="THUR">THUR</option>
                  <option value="SAT">SAT</option>
                  <option value="custom">Custom (Type Manually)...</option>
                </select>
              </div>

              {belt === 'custom' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Custom Belt</label>
                  <input
                    type="text"
                    className="form-input"
                    value={customBelt}
                    onChange={e => setCustomBelt(e.target.value)}
                    placeholder="Belt name"
                    required
                  />
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSubmitting} 
                style={{ height: '42px', padding: '0 1.5rem', fontWeight: 600 }}
              >
                {isSubmitting ? 'Adding...' : 'Add Dealer'}
              </button>
            </form>
          )}
        </div>

        {/* Dealers List */}
        <div className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.125rem', margin: 0 }}>All Dealers ({filteredDealers.length})</h2>
            
            {/* Filter controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', flex: '1', justifyContent: 'flex-end', maxWidth: '600px' }}>
              <input
                type="text"
                className="form-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name..."
                style={{ flex: '2', minWidth: '150px', padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
              />
              <select
                className="form-input"
                value={teamFilter}
                onChange={e => setTeamFilter(e.target.value)}
                style={{ flex: '1', minWidth: '110px', padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
              >
                <option value="">All Teams</option>
                <option value="Arvind">Arvind</option>
                <option value="Praveen">Praveen</option>
              </select>
              <select
                className="form-input"
                value={beltFilter}
                onChange={e => setBeltFilter(e.target.value)}
                style={{ flex: '1', minWidth: '100px', padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
              >
                <option value="">All Belts</option>
                <option value="FRI">FRI</option>
                <option value="MON">MON</option>
                <option value="TUE">TUE</option>
                <option value="WED">WED</option>
                <option value="THUR">THUR</option>
                <option value="SAT">SAT</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Loading dealers list...
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="table-container desktop-view">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Dealer Name</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Contact Number</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Sales Team</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Belt</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDealers.map(d => (
                      <tr key={d._id || d.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{d.name}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{d.contactNumber || '-'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: d.salesTeam === 'Arvind' ? '#e0f2fe' : '#f0fdf4', color: d.salesTeam === 'Arvind' ? '#0369a1' : '#15803d', fontSize: '0.8rem', fontWeight: 600 }}>
                            {d.salesTeam}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{d.belt}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          {d._id && (
                            <button
                              onClick={() => handleDeleteDealer(d._id, d.name)}
                              className="btn"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '6px', fontWeight: 600 }}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredDealers.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                          No dealers found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="mobile-view">
                {filteredDealers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No dealers found.
                  </div>
                ) : (
                  filteredDealers.map(d => (
                    <div key={d._id || d.name} className="mobile-card" style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '0.75rem', background: 'white' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Team: <strong>{d.salesTeam}</strong> | Belt: <strong>{d.belt}</strong>{d.contactNumber ? ` | Contact: ${d.contactNumber}` : ''}
                          </div>
                        </div>
                        {d._id && (
                          <button
                            onClick={() => handleDeleteDealer(d._id, d.name)}
                            className="btn"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '4px' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DealersMaster;
