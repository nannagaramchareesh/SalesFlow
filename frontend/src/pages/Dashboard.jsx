import React, { useState, useEffect } from 'react';
import { IndianRupee, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { getInvoices, getCollections } from '../utils/api';
import { calculateDealerTotalOutstanding, calculateTotalReceived } from '../utils/formulas';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({ totalSales: 0, collected: 0, outstanding: 0 });
  const [invoices, setInvoices] = useState([]);
  const [expandedDealer, setExpandedDealer] = useState(null);
  
  // Dashboard Filters State
  const [dealerSearch, setDealerSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [salesTeamFilter, setSalesTeamFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  useEffect(() => {
    const loadData = async () => {
      const invoicesData = await getInvoices();
      const collections = await getCollections();
      
      const totalSales = invoicesData.reduce((sum, inv) => sum + Number(inv.invoiceValue || 0), 0);
      const totalOutstanding = calculateDealerTotalOutstanding(invoicesData);
      const totalCollected = invoicesData.reduce((sum, inv) => sum + calculateTotalReceived(inv), 0);
      
      setStats({
        totalSales,
        collected: totalCollected,
        outstanding: totalOutstanding
      });
      
      setInvoices(invoicesData);
    };
    loadData();
  }, []);

  // Extract unique values for filter dropdowns
  const uniqueBrands = [...new Set(invoices.map(inv => inv.brand).filter(Boolean))].sort();
  const uniqueSalesTeams = [...new Set(invoices.map(inv => inv.salesTeam).filter(Boolean))].sort();
  const uniqueMonths = [...new Set(invoices.map(inv => inv.month).filter(Boolean))].sort();

  // Filter invoices for aggregation
  const filteredInvoices = invoices.filter(inv => {
    if (dealerSearch && !inv.dealerName?.toLowerCase().includes(dealerSearch.toLowerCase())) return false;
    if (brandFilter !== 'all' && inv.brand !== brandFilter) return false;
    if (salesTeamFilter !== 'all' && inv.salesTeam !== salesTeamFilter) return false;
    if (monthFilter !== 'all' && inv.month !== monthFilter) return false;
    return true;
  });

  // Aggregate by dealer
  const dealerAggregates = {};
  filteredInvoices.forEach(inv => {
    const dealer = inv.dealerName || 'Unknown';
    const value = inv.invoiceValue || 0;
    const balance = inv.balance !== undefined ? inv.balance : value;
    const brand = inv.brand || 'Unknown';

    if (!dealerAggregates[dealer]) {
      dealerAggregates[dealer] = {
        dealerName: dealer,
        totalInvoiceValue: 0,
        totalBalance: 0,
        brandContribution: {}
      };
    }

    dealerAggregates[dealer].totalInvoiceValue += value;
    dealerAggregates[dealer].totalBalance += balance;

    if (balance > 0) {
      if (!dealerAggregates[dealer].brandContribution[brand]) {
        dealerAggregates[dealer].brandContribution[brand] = 0;
      }
      dealerAggregates[dealer].brandContribution[brand] += balance;
    }
  });

  // Sort and filter aggregates
  const sortedDealerAggregates = Object.values(dealerAggregates)
    .filter(d => d.totalBalance > 0)
    .sort((a, b) => b.totalBalance - a.totalBalance);

  return (
    <div className="dashboard">
      <h1 className="page-title">Dashboard Overview</h1>
      
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent-color)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Sales</p>
            <h3 className="stat-value">₹{stats.totalSales.toLocaleString()}</h3>
          </div>
        </div>
        
        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)' }}>
            <IndianRupee size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Collected</p>
            <h3 className="stat-value">₹{stats.collected.toLocaleString()}</h3>
          </div>
        </div>
        
        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning-color)' }}>
            <AlertCircle size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Outstanding Balance</p>
            <h3 className="stat-value">₹{stats.outstanding.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Dynamic Filters Bar */}
        <div className="card" style={{ padding: '1.25rem', background: 'white' }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            background: '#ffffff',
            alignItems: 'center'
          }}>
            <div style={{ flex: '2', minWidth: '200px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Search Dealer</label>
              <input
                type="text"
                className="form-input"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                value={dealerSearch}
                onChange={e => setDealerSearch(e.target.value)}
                placeholder="Search dealer name..."
              />
            </div>
            <div style={{ flex: '1', minWidth: '150px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Brand</label>
              <select
                className="form-input"
                style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                value={brandFilter}
                onChange={e => setBrandFilter(e.target.value)}
              >
                <option value="all">All Brands</option>
                {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div style={{ flex: '1', minWidth: '150px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Sales Team</label>
              <select
                className="form-input"
                style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                value={salesTeamFilter}
                onChange={e => setSalesTeamFilter(e.target.value)}
              >
                <option value="all">All Sales Teams</option>
                {uniqueSalesTeams.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div style={{ flex: '1', minWidth: '150px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Month</label>
              <select
                className="form-input"
                style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                value={monthFilter}
                onChange={e => setMonthFilter(e.target.value)}
              >
                <option value="all">All Months</option>
                {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Total Outstanding Summary Table */}
        <div className="card" style={{ padding: '1.25rem', background: 'white' }}>
          <div className="card-header" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--primary-color)' }}>Total Dealer Outstanding Summaries</h2>
          </div>
          
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Dealer Name</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right', width: '220px' }}>Total Invoice Value</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right', width: '220px' }}>Total Balance</th>
                </tr>
              </thead>
              <tbody>
                {sortedDealerAggregates.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No outstanding dealer summaries found matching filters.
                    </td>
                  </tr>
                ) : (
                  sortedDealerAggregates.map((dealer, idx) => {
                    const isExpanded = expandedDealer === dealer.dealerName;
                    return (
                      <React.Fragment key={idx}>
                        <tr style={{ borderBottom: '1px solid #f1f5f9', background: isExpanded ? '#f8fafc' : 'transparent' }}>
                          <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--primary-color)' }}>{dealer.dealerName}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 500 }}>₹{dealer.totalInvoiceValue.toLocaleString()}</td>
                          <td 
                            style={{ 
                              padding: '1rem', 
                              textAlign: 'right', 
                              fontWeight: 700, 
                              color: '#b91c1c', 
                              cursor: 'pointer',
                              userSelect: 'none'
                            }}
                            onClick={() => setExpandedDealer(isExpanded ? null : dealer.dealerName)}
                          >
                            <span style={{ borderBottom: '1px dashed #b91c1c', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }} title="Click to view brand breakdown">
                              ₹{dealer.totalBalance.toLocaleString()}
                              <span style={{ fontSize: '0.75rem', color: '#b91c1c', opacity: 0.8 }}>
                                {isExpanded ? '▲' : '▼'}
                              </span>
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan="3" style={{ background: '#f8fafc', padding: '1.25rem 2rem', borderBottom: '1px solid #e2e8f0' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    📊 Brand Outstanding Breakdown for {dealer.dealerName}
                                  </h4>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    Out of ₹{dealer.totalBalance.toLocaleString()} total
                                  </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.25rem' }}>
                                  {Object.entries(dealer.brandContribution).length === 0 ? (
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>
                                      No outstanding balance for any brand.
                                    </div>
                                  ) : (
                                    Object.entries(dealer.brandContribution)
                                      .sort((a, b) => b[1] - a[1])
                                      .map(([brand, amt]) => {
                                        const percentage = dealer.totalBalance > 0 ? ((amt / dealer.totalBalance) * 100).toFixed(1) : 0;
                                        return (
                                          <div key={brand} style={{ background: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary-color)' }}>{brand}</span>
                                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>{percentage}% of total</span>
                                            </div>
                                            <div style={{ fontWeight: 700, color: '#b91c1c', fontSize: '0.9rem' }}>
                                              ₹{amt.toLocaleString()}
                                            </div>
                                          </div>
                                        );
                                      })
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
                {/* Totals Row */}
                {sortedDealerAggregates.length > 0 && (
                  <tr style={{ fontWeight: 800, background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                    <td style={{ padding: '1rem' }}>Total</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>₹{sortedDealerAggregates.reduce((sum, d) => sum + d.totalInvoiceValue, 0).toLocaleString()}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#b91c1c' }}>₹{sortedDealerAggregates.reduce((sum, d) => sum + d.totalBalance, 0).toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
