import React, { useState, useEffect } from 'react';
import { getInvoices } from '../utils/api';
import { calculateOverdueDays, calculateTotalReceived } from '../utils/formulas';
import { BarChart3, Users, Calendar, Printer, Search, Building2, Layers, TrendingUp, MessageCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const Reports = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('aging'); // aging, brand, month, team
  const [searchQuery, setSearchQuery] = useState('');
  
  // WhatsApp Share States
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [shareFormat, setShareFormat] = useState('text'); // text, pdf, jpg

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getInvoices();
        setInvoices(data);
      } catch (error) {
        console.error('Error fetching invoices for reports:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Helper: Get invoice balance
  const getInvoiceBalance = (inv) => {
    const val = inv.invoiceValue || 0;
    return inv.balance !== undefined ? inv.balance : val;
  };

  // Helper: Get month name and year from date string
  const getMonthYearStr = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Unknown';
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  // 1. Dealer Aging Report Calculation
  const getDealerAgingData = () => {
    const dealers = {};
    invoices.forEach(inv => {
      const dealer = inv.dealerName || 'Unknown Dealer';
      const balance = getInvoiceBalance(inv);
      const overdue = inv.status === 'Paid' ? 0 : calculateOverdueDays(inv.dateOfInvoice || inv.date);

      if (!dealers[dealer]) {
        dealers[dealer] = {
          name: dealer,
          outstanding_0_30: 0,
          outstanding_31_60: 0,
          outstanding_61_90: 0,
          outstanding_90_plus: 0,
          totalOutstanding: 0
        };
      }

      dealers[dealer].totalOutstanding += balance;

      if (balance > 0) {
        if (overdue <= 30) {
          dealers[dealer].outstanding_0_30 += balance;
        } else if (overdue <= 60) {
          dealers[dealer].outstanding_31_60 += balance;
        } else if (overdue <= 90) {
          dealers[dealer].outstanding_61_90 += balance;
        } else {
          dealers[dealer].outstanding_90_plus += balance;
        }
      }
    });

    return Object.values(dealers);
  };

  // 2. Brand-wise Report Calculation
  const getBrandWiseData = () => {
    const brands = {};
    invoices.forEach(inv => {
      const brand = inv.brand || 'No Brand';
      const value = inv.invoiceValue || 0;
      const balance = getInvoiceBalance(inv);
      const received = calculateTotalReceived(inv);

      if (!brands[brand]) {
        brands[brand] = {
          name: brand,
          invoiceCount: 0,
          totalValue: 0,
          totalReceived: 0,
          totalOutstanding: 0
        };
      }

      brands[brand].invoiceCount += 1;
      brands[brand].totalValue += value;
      brands[brand].totalReceived += received;
      brands[brand].totalOutstanding += balance;
    });

    return Object.values(brands);
  };

  // 3. Month-wise Report Calculation
  const getMonthWiseData = () => {
    const months = {};
    invoices.forEach(inv => {
      const monthYear = getMonthYearStr(inv.dateOfInvoice || inv.date);
      const value = inv.invoiceValue || 0;
      const balance = getInvoiceBalance(inv);
      const received = calculateTotalReceived(inv);

      if (!months[monthYear]) {
        months[monthYear] = {
          name: monthYear,
          invoiceCount: 0,
          totalValue: 0,
          totalReceived: 0,
          totalOutstanding: 0,
          // For sorting chronologically
          sortDate: new Date(inv.dateOfInvoice || inv.date).getTime() || 0
        };
      }

      months[monthYear].invoiceCount += 1;
      months[monthYear].totalValue += value;
      months[monthYear].totalReceived += received;
      months[monthYear].totalOutstanding += balance;
    });

    return Object.values(months).sort((a, b) => b.sortDate - a.sortDate);
  };

  // 4. Team-wise Report Calculation
  const getTeamWiseData = () => {
    const teams = {};
    invoices.forEach(inv => {
      const team = inv.salesTeam || 'Unassigned';
      const value = inv.invoiceValue || 0;
      const balance = getInvoiceBalance(inv);
      const received = calculateTotalReceived(inv);

      if (!teams[team]) {
        teams[team] = {
          name: team,
          invoiceCount: 0,
          totalValue: 0,
          totalReceived: 0,
          totalOutstanding: 0
        };
      }

      teams[team].invoiceCount += 1;
      teams[team].totalValue += value;
      teams[team].totalReceived += received;
      teams[team].totalOutstanding += balance;
    });

    return Object.values(teams);
  };

  // Filter and compute current report dataset based on search query
  const getReportData = () => {
    let rawData = [];
    if (activeTab === 'aging') rawData = getDealerAgingData();
    else if (activeTab === 'brand') rawData = getBrandWiseData();
    else if (activeTab === 'month') rawData = getMonthWiseData();
    else if (activeTab === 'team') rawData = getTeamWiseData();

    if (!searchQuery) return rawData;
    
    return rawData.filter(row => 
      row.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const reportData = getReportData();

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Aggregate stats for Cards
  const getSummaryCards = () => {
    const totalOut = invoices.reduce((sum, inv) => sum + getInvoiceBalance(inv), 0);
    const totalInvoicesValue = invoices.reduce((sum, inv) => sum + (inv.invoiceValue || 0), 0);
    const totalCollections = invoices.reduce((sum, inv) => sum + calculateTotalReceived(inv), 0);
    
    const overdueAmt = invoices.reduce((sum, inv) => {
      if (inv.status === 'Paid') return sum;
      const overdue = calculateOverdueDays(inv.dateOfInvoice || inv.date);
      return overdue > 0 ? sum + getInvoiceBalance(inv) : sum;
    }, 0);

    return [
      { label: 'Total Outstanding', value: `₹${totalOut.toLocaleString()}`, color: '#b91c1c', icon: <TrendingUp size={24} /> },
      { label: 'Overdue Amount', value: `₹${overdueAmt.toLocaleString()}`, color: '#ea580c', icon: <Calendar size={24} /> },
      { label: 'Total Sales (Invoiced)', value: `₹${totalInvoicesValue.toLocaleString()}`, color: '#1e3a8a', icon: <BarChart3 size={24} /> },
      { label: 'Total Collections', value: `₹${totalCollections.toLocaleString()}`, color: '#15803d', icon: <Users size={24} /> }
    ];
  };

  const summaryCards = getSummaryCards();

  // WhatsApp Message Generator
  const padRight = (str, len) => {
    str = String(str);
    if (str.length >= len) return str.substring(0, len);
    return str + ' '.repeat(len - str.length);
  };

  const padLeft = (str, len) => {
    str = String(str);
    if (str.length >= len) return str.substring(0, len);
    return ' '.repeat(len - str.length) + str;
  };

  const truncateStr = (str, len) => {
    if (str.length <= len) return str;
    return str.substring(0, len - 1) + '.';
  };

  const generateWhatsappMessage = () => {
    let msg = `*SalesFlow Reports & Analytics*\n`;
    msg += `Date: ${new Date().toLocaleDateString()}\n\n`;

    if (activeTab === 'aging') {
      msg += `*DEALER AGING REPORT (DAYS)*\n`;
      msg += `\`\`\`\n`;
      msg += `${padRight('Dealer', 10)}|${padLeft('0-30', 6)}|${padLeft('31-60', 6)}|${padLeft('61-90', 6)}|${padLeft('>90', 6)}|${padLeft('Total', 7)}\n`;
      msg += `-`.repeat(46) + `\n`;
      
      reportData.forEach(row => {
        const dealerName = truncateStr(row.name, 10);
        msg += `${padRight(dealerName, 10)}|${padLeft(Math.round(row.outstanding_0_30), 6)}|${padLeft(Math.round(row.outstanding_31_60), 6)}|${padLeft(Math.round(row.outstanding_61_90), 6)}|${padLeft(Math.round(row.outstanding_90_plus), 6)}|${padLeft(Math.round(row.totalOutstanding), 7)}\n`;
      });

      msg += `-`.repeat(46) + `\n`;
      const total_0_30 = reportData.reduce((sum, r) => sum + r.outstanding_0_30, 0);
      const total_31_60 = reportData.reduce((sum, r) => sum + r.outstanding_31_60, 0);
      const total_61_90 = reportData.reduce((sum, r) => sum + r.outstanding_61_90, 0);
      const total_90_plus = reportData.reduce((sum, r) => sum + r.outstanding_90_plus, 0);
      const grandTotal = reportData.reduce((sum, r) => sum + r.totalOutstanding, 0);

      msg += `${padRight('TOTAL', 10)}|${padLeft(Math.round(total_0_30), 6)}|${padLeft(Math.round(total_31_60), 6)}|${padLeft(Math.round(total_61_90), 6)}|${padLeft(Math.round(total_90_plus), 6)}|${padLeft(Math.round(grandTotal), 7)}\n`;
      msg += `\`\`\``;
    } else {
      const typeLabel = activeTab === 'brand' ? 'Brand' : activeTab === 'month' ? 'Month' : 'Team';
      msg += `*${typeLabel.toUpperCase()}-WISE PERFORMANCE REPORT*\n`;
      msg += `\`\`\`\n`;
      msg += `${padRight(typeLabel, 10)}|${padLeft('Bills', 5)}|${padLeft('Sales', 8)}|${padLeft('Recvd', 8)}|${padLeft('Bal', 8)}\n`;
      msg += `-`.repeat(44) + `\n`;

      reportData.forEach(row => {
        const rowName = truncateStr(row.name, 10);
        msg += `${padRight(rowName, 10)}|${padLeft(row.invoiceCount, 5)}|${padLeft(Math.round(row.totalValue), 8)}|${padLeft(Math.round(row.totalReceived), 8)}|${padLeft(Math.round(row.totalOutstanding), 8)}\n`;
      });

      msg += `-`.repeat(44) + `\n`;
      const totalBills = reportData.reduce((sum, r) => sum + r.invoiceCount, 0);
      const totalVal = reportData.reduce((sum, r) => sum + r.totalValue, 0);
      const totalRecd = reportData.reduce((sum, r) => sum + r.totalReceived, 0);
      const totalBal = reportData.reduce((sum, r) => sum + r.totalOutstanding, 0);

      msg += `${padRight('TOTAL', 10)}|${padLeft(totalBills, 5)}|${padLeft(Math.round(totalVal), 8)}|${padLeft(Math.round(totalRecd), 8)}|${padLeft(Math.round(totalBal), 8)}\n`;
      msg += `\`\`\``;
    }

    return msg;
  };

  const handleShareToWhatsapp = async () => {
    let textMsg = '';
    const dateStr = new Date().toLocaleDateString().replace(/\//g, '-');
    const filename = `SalesFlow_${activeTab}_report_${dateStr}`;

    if (shareFormat === 'text') {
      textMsg = generateWhatsappMessage();
    } else {
      const element = document.getElementById('print-section');
      
      try {
        // Capture element canvas
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        
        if (shareFormat === 'pdf') {
          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          const pdf = new jsPDF('p', 'mm', 'a4');
          const imgWidth = 210; 
          const pageHeight = 295; 
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          let heightLeft = imgHeight;
          let position = 0;

          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;

          while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }
          pdf.save(`${filename}.pdf`);
        } else if (shareFormat === 'jpg') {
          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          const link = document.createElement('a');
          link.href = imgData;
          link.download = `${filename}.jpg`;
          link.click();
        }
        
        textMsg = `Hello, I've shared the *SalesFlow ${activeTab === 'aging' ? 'Aging' : activeTab} Report* with you. Please attach the downloaded ${shareFormat.toUpperCase()} file here.`;
      } catch (err) {
        console.error('Error generating file export:', err);
        alert('Failed to generate export file. Sharing as text.');
        textMsg = generateWhatsappMessage();
      }
    }

    let url = 'https://api.whatsapp.com/send';
    const params = new URLSearchParams();
    if (whatsappNumber.trim()) {
      params.append('phone', whatsappNumber.trim());
    }
    params.append('text', textMsg);
    
    url += `?${params.toString()}`;
    window.open(url, '_blank');
    setShowWhatsappModal(false);
    setWhatsappNumber('');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <div>Loading reports data...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Print style block */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }} className="no-print">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-color)' }}>Reports & Analytics</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Analyze aging balances, sales trends, brands, and sales team productivity.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => setShowWhatsappModal(true)}
            className="btn" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, padding: '0.5rem 1rem', background: '#16a34a', borderColor: '#16a34a', color: 'white' }}
          >
            <MessageCircle size={16} />
            Share on WhatsApp
          </button>
          <button 
            onClick={handlePrint}
            className="btn btn-secondary" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, padding: '0.5rem 1rem' }}
          >
            <Printer size={16} />
            Print Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }} className="no-print">
        {summaryCards.map((card, i) => (
          <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div style={{ background: `${card.color}15`, color: card.color, padding: '0.75rem', borderRadius: '10px' }}>
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{card.label}</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: card.color, marginTop: '0.2rem' }}>{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs bar and Search bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }} className="no-print">
        {/* Navigation tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => { setActiveTab('aging'); setSearchQuery(''); }}
            className={`btn ${activeTab === 'aging' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 600, padding: '0.45rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Building2 size={16} />
            Dealer Aging (Days)
          </button>
          <button 
            onClick={() => { setActiveTab('brand'); setSearchQuery(''); }}
            className={`btn ${activeTab === 'brand' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 600, padding: '0.45rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Layers size={16} />
            Brand-wise
          </button>
          <button 
            onClick={() => { setActiveTab('month'); setSearchQuery(''); }}
            className={`btn ${activeTab === 'month' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 600, padding: '0.45rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Calendar size={16} />
            Month-wise
          </button>
          <button 
            onClick={() => { setActiveTab('team'); setSearchQuery(''); }}
            className={`btn ${activeTab === 'team' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 600, padding: '0.45rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Users size={16} />
            Team-wise
          </button>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
            <Search size={16} />
          </span>
          <input 
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.25rem', paddingRight: '1rem', width: '100%', fontSize: '0.85rem', borderRadius: '8px' }}
            placeholder={`Search ${activeTab === 'aging' ? 'dealer' : activeTab === 'brand' ? 'brand' : activeTab === 'month' ? 'month' : 'team'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Report Table Area */}
      <div id="print-section" className="card" style={{ padding: '1.25rem', background: 'white' }}>
        
        {/* Printable Title Block */}
        <div style={{ display: 'none', marginBottom: '1.5rem' }} className="visible-print-only">
          <h2 style={{ margin: 0 }}>SalesFlow Reports & Analytics</h2>
          <p style={{ margin: '0.25rem 0', color: '#64748b' }}>
            Report: {activeTab === 'aging' ? 'Dealer Aging Analysis' : activeTab === 'brand' ? 'Brand-wise Analysis' : activeTab === 'month' ? 'Month-wise Performance' : 'Sales Team Performance'}
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Generated on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
          <hr style={{ margin: '1rem 0', border: 'none', borderTop: '2px solid #cbd5e1' }} />
        </div>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          
          {/* Aging Report Table */}
          {activeTab === 'aging' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Dealer Name</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'right' }}>0-30 Days Overdue</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'right' }}>31-60 Days Overdue</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'right' }}>61-90 Days Overdue</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'right' }}>&gt;90 Days Overdue</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'right', background: '#fef2f2', color: '#b91c1c' }}>Total Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No dealer aging data found.</td>
                  </tr>
                ) : (
                  <>
                    {reportData.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--primary-color)' }}>{row.name}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>₹{row.outstanding_0_30.toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>₹{row.outstanding_31_60.toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>₹{row.outstanding_61_90.toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: row.outstanding_90_plus > 0 ? '#b91c1c' : 'inherit', fontWeight: row.outstanding_90_plus > 0 ? 600 : 'normal' }}>
                          ₹{row.outstanding_90_plus.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, background: '#fffbeb', color: '#b91c1c' }}>
                          ₹{row.totalOutstanding.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {/* Report Totals Row */}
                    <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>Total</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>₹{reportData.reduce((sum, r) => sum + r.outstanding_0_30, 0).toLocaleString()}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>₹{reportData.reduce((sum, r) => sum + r.outstanding_31_60, 0).toLocaleString()}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>₹{reportData.reduce((sum, r) => sum + r.outstanding_61_90, 0).toLocaleString()}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#b91c1c' }}>₹{reportData.reduce((sum, r) => sum + r.outstanding_90_plus, 0).toLocaleString()}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', background: '#fee2e2', color: '#b91c1c' }}>
                        ₹{reportData.reduce((sum, r) => sum + r.totalOutstanding, 0).toLocaleString()}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          )}

          {/* Brand/Month/Team Reports Template */}
          {activeTab !== 'aging' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                    {activeTab === 'brand' ? 'Brand Name' : activeTab === 'month' ? 'Month' : 'Sales Team'}
                  </th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'center' }}>Total Bills</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'right' }}>Total Invoiced Value</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'right', color: '#15803d' }}>Total Payments Collected</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'right', color: '#b91c1c' }}>Total Balance Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No report data found.</td>
                  </tr>
                ) : (
                  <>
                    {reportData.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--primary-color)' }}>{row.name}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{row.invoiceCount}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>₹{row.totalValue.toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#15803d', fontWeight: 500 }}>₹{row.totalReceived.toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#b91c1c', fontWeight: 600 }}>₹{row.totalOutstanding.toLocaleString()}</td>
                      </tr>
                    ))}
                    {/* Report Totals Row */}
                    <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>Total</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{reportData.reduce((sum, r) => sum + r.invoiceCount, 0)}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>₹{reportData.reduce((sum, r) => sum + r.totalValue, 0).toLocaleString()}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#15803d' }}>₹{reportData.reduce((sum, r) => sum + r.totalReceived, 0).toLocaleString()}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#b91c1c' }}>
                        ₹{reportData.reduce((sum, r) => sum + r.totalOutstanding, 0).toLocaleString()}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          )}

        </div>
      </div>
      
      {/* WhatsApp Modal */}
      {showWhatsappModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }} className="no-print">
          <div className="card" style={{
            maxWidth: '500px',
            width: '100%',
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a' }}>
              <MessageCircle size={24} />
              Share Report via WhatsApp
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0', lineHeight: 1.4 }}>
              Choose a format below to share. For PDF or JPG, it will download the file to your system, and then open WhatsApp where you can attach and send the file.
            </p>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Format to Share</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="shareFormat"
                    value="text"
                    checked={shareFormat === 'text'}
                    onChange={() => setShareFormat('text')}
                  />
                  <span><strong>Monospaced Text:</strong> Send structured text table directly</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="shareFormat"
                    value="pdf"
                    checked={shareFormat === 'pdf'}
                    onChange={() => setShareFormat('pdf')}
                  />
                  <span><strong>PDF Document:</strong> Download report as PDF and share</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="shareFormat"
                    value="jpg"
                    checked={shareFormat === 'jpg'}
                    onChange={() => setShareFormat('jpg')}
                  />
                  <span><strong>JPG Image:</strong> Download report as JPG image and share</span>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>Phone Number (Optional)</label>
              <input
                type="tel"
                className="form-input"
                placeholder="e.g. 919876543210"
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem' }}
                value={whatsappNumber}
                onChange={e => setWhatsappNumber(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
                onClick={() => {
                  setShowWhatsappModal(false);
                  setWhatsappNumber('');
                  setShareFormat('text');
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ background: '#16a34a', borderColor: '#16a34a', color: 'white', padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                onClick={handleShareToWhatsapp}
              >
                Download & Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS styling for printing display helper */}
      <style>{`
        @media screen {
          .visible-print-only {
            display: none !important;
          }
        }
        @media print {
          .visible-print-only {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Reports;
