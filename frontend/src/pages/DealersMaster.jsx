import React, { useState, useEffect } from 'react';
import { getDealers, createDealer, deleteDealer } from '../utils/api';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
      belt: finalBelt
    };

    try {
      const result = await createDealer(payload);
      setSuccessMsg(`Dealer "${result.name}" added successfully!`);
      setName('');
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

  // Filter logic
  const filteredDealers = dealers.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
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
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Sales Team</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Belt</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDealers.map(d => (
                      <tr key={d._id || d.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{d.name}</td>
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
                        <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
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
                            Team: <strong>{d.salesTeam}</strong> | Belt: <strong>{d.belt}</strong>
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
