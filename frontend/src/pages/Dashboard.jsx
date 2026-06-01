import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IndianRupee, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { getInvoices, getCollections } from '../utils/api';
import { calculateDealerTotalOutstanding, calculateTotalReceived } from '../utils/formulas';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({ totalSales: 0, collected: 0, outstanding: 0 });
  const [recentInvoices, setRecentInvoices] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const invoices = await getInvoices();
      const collections = await getCollections();
      
      const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.invoiceValue || 0), 0);
      const totalOutstanding = calculateDealerTotalOutstanding(invoices);
      const totalCollected = invoices.reduce((sum, inv) => sum + calculateTotalReceived(inv), 0);
      
      setStats({
        totalSales,
        collected: totalCollected,
        outstanding: totalOutstanding
      });
      
      setRecentInvoices(invoices.slice(0, 5));
    };
    loadData();
  }, []);

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

      <div className="dashboard-content">
        <div className="card recent-section">
          <div className="card-header">
            <h2>Recent Invoices</h2>
            <Link to="/data-entry" className="btn btn-secondary">View All</Link>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Dealer</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv._id}>
                    <td>{inv.invoiceNumber}</td>
                    <td style={{fontWeight: 500}}>{inv.dealerName}</td>
                    <td>₹{(inv.invoiceValue || 0).toLocaleString()}</td>
                    <td>{new Date(inv.dateOfInvoice || Date.now()).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge badge-${inv.status === 'Paid' ? 'success' : inv.status === 'Partial' ? 'warning' : 'danger'}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentInvoices.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{textAlign: 'center'}}>No recent invoices</td>
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
