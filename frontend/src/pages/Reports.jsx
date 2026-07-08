import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { getInvoices } from '../utils/api';
import { calculateOverdueDays, calculateDealerTotalOutstanding, countOverdueBills } from '../utils/formulas';

const Reports = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDealer, setSelectedDealer] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState({});
  const [viewMode, setViewMode] = useState('dealers'); // 'dealers', 'all_bills', or 'total_outstanding'
  const [expandedDealer, setExpandedDealer] = useState(null);
  const [sharingPdf, setSharingPdf] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Dealer view filters
  const [dealerSearch, setDealerSearch] = useState('');
  const [dealerBalanceFilter, setDealerBalanceFilter] = useState('all'); // all, outstanding, zero
  const [dealerOverdueFilter, setDealerOverdueFilter] = useState('all'); // all, has_overdue, no_overdue

  // Invoice view filters
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all'); // all, Unpaid, Partial, Paid
  const [invoiceOverdueFilter, setInvoiceOverdueFilter] = useState('all'); // all, overdue, overdue_30, overdue_60, overdue_90, not_overdue
  const [invoiceBrandFilter, setInvoiceBrandFilter] = useState('all'); // all, or specific brand
  const [invoiceDealerFilter, setInvoiceDealerFilter] = useState('all'); // all, or specific dealer
  const [invoiceSalesTeamFilter, setInvoiceSalesTeamFilter] = useState('all'); // all, or specific sales team
  const [invoiceBeltFilter, setInvoiceBeltFilter] = useState('all'); // all, or specific belt
  const [invoiceMonthFilter, setInvoiceMonthFilter] = useState('all'); // all, or specific month
  const [invoiceBalanceStatusFilter, setInvoiceBalanceStatusFilter] = useState('all'); // all, outstanding, zero
  const [invoiceOverdueSort, setInvoiceOverdueSort] = useState('none'); // none, asc, desc
  const [invoiceBalanceSort, setInvoiceBalanceSort] = useState('none'); // none, asc, desc

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

  const toggleInvoiceSelection = (invoiceId) => {
    setSelectedInvoices(prev => ({
      ...prev,
      [invoiceId]: !prev[invoiceId]
    }));
  };

  const isAllBills = viewMode === 'all_bills';
  const isOutstandingMode = viewMode === 'total_outstanding';
  const isAllBillsOrOutstanding = isAllBills || isOutstandingMode;

  const dealerInvoices = useMemo(() => {
    return isAllBillsOrOutstanding ? invoices : invoices.filter(inv => inv.dealerName === selectedDealer);
  }, [invoices, isAllBillsOrOutstanding, selectedDealer]);

  const uniqueBrands = useMemo(() => {
    return [...new Set(dealerInvoices.map(inv => inv.brand).filter(Boolean))];
  }, [dealerInvoices]);

  const uniqueDealersList = useMemo(() => {
    return [...new Set(invoices.map(inv => inv.dealerName).filter(Boolean))].sort();
  }, [invoices]);

  const uniqueSalesTeamsList = useMemo(() => {
    return [...new Set(invoices.map(inv => inv.salesTeam).filter(Boolean))].sort();
  }, [invoices]);

  const uniqueBeltsList = useMemo(() => {
    return [...new Set(invoices.map(inv => inv.belt).filter(Boolean))].sort();
  }, [invoices]);

  const uniqueMonthsList = useMemo(() => {
    return [...new Set(invoices.map(inv => inv.month).filter(Boolean))].sort();
  }, [invoices]);

  const invoiceActiveCount = useMemo(() => {
    return (invoiceStatusFilter !== 'all' ? 1 : 0) +
      (invoiceSalesTeamFilter !== 'all' ? 1 : 0) +
      (invoiceBeltFilter !== 'all' ? 1 : 0) +
      (invoiceMonthFilter !== 'all' ? 1 : 0) +
      (invoiceBalanceStatusFilter !== 'all' ? 1 : 0) +
      (invoiceOverdueFilter !== 'all' ? 1 : 0) +
      (invoiceBrandFilter !== 'all' ? 1 : 0) +
      (isAllBills && invoiceDealerFilter !== 'all' ? 1 : 0) +
      (invoiceOverdueSort !== 'none' ? 1 : 0) +
      (invoiceBalanceSort !== 'none' ? 1 : 0);
  }, [invoiceStatusFilter, invoiceSalesTeamFilter, invoiceBeltFilter, invoiceMonthFilter, invoiceBalanceStatusFilter, invoiceOverdueFilter, invoiceBrandFilter, isAllBills, invoiceDealerFilter, invoiceOverdueSort, invoiceBalanceSort]);

  const filteredInvoices = useMemo(() => {
    let filtered = dealerInvoices.filter(inv => {
      const invoiceNumStr = inv.invoiceNumber ? String(inv.invoiceNumber) : '';
      if (invoiceSearch && !invoiceNumStr.toLowerCase().includes(invoiceSearch.toLowerCase())) return false;
      if (invoiceStatusFilter !== 'all' && inv.status !== invoiceStatusFilter) return false;
      if (invoiceBrandFilter !== 'all' && inv.brand !== invoiceBrandFilter) return false;
      if (isAllBillsOrOutstanding && invoiceDealerFilter !== 'all' && inv.dealerName !== invoiceDealerFilter) return false;
      if (invoiceSalesTeamFilter !== 'all' && inv.salesTeam !== invoiceSalesTeamFilter) return false;
      if (invoiceBeltFilter !== 'all' && inv.belt !== invoiceBeltFilter) return false;
      if (invoiceMonthFilter !== 'all' && inv.month !== invoiceMonthFilter) return false;

      const value = inv.invoiceValue || 0;
      const balance = inv.balance !== undefined ? inv.balance : value;
      if (invoiceBalanceStatusFilter === 'outstanding' && balance <= 0) return false;
      if (invoiceBalanceStatusFilter === 'zero' && balance > 0) return false;

      const overdueDays = calculateOverdueDays(inv.dateOfInvoice || inv.date);
      if (invoiceOverdueFilter === 'overdue' && (overdueDays <= 0 || inv.status === 'Paid')) return false;
      if (invoiceOverdueFilter === 'overdue_30' && (overdueDays <= 30 || inv.status === 'Paid')) return false;
      if (invoiceOverdueFilter === 'overdue_60' && (overdueDays <= 60 || inv.status === 'Paid')) return false;
      if (invoiceOverdueFilter === 'overdue_90' && (overdueDays <= 90 || inv.status === 'Paid')) return false;
      if (invoiceOverdueFilter === 'not_overdue' && (overdueDays > 0 && inv.status !== 'Paid')) return false;

      return true;
    });

    // Sorting logic
    if (isAllBills && (invoiceOverdueSort === 'asc' || invoiceOverdueSort === 'desc')) {
      const groups = {};
      filtered.forEach(inv => {
        const dealer = inv.dealerName || 'Unknown';
        if (!groups[dealer]) {
          groups[dealer] = [];
        }
        groups[dealer].push(inv);
      });

      Object.keys(groups).forEach(dealer => {
        groups[dealer].sort((a, b) => {
          const overdueA = a.status === 'Paid' ? 0 : calculateOverdueDays(a.dateOfInvoice || a.date);
          const overdueB = b.status === 'Paid' ? 0 : calculateOverdueDays(b.dateOfInvoice || b.date);
          return invoiceOverdueSort === 'asc' ? overdueA - overdueB : overdueB - overdueA;
        });
      });

      const sortedDealers = Object.keys(groups).sort((a, b) => {
        const invoicesA = groups[a];
        const invoicesB = groups[b];
        
        const overdueA = invoicesA.map(inv => inv.status === 'Paid' ? 0 : calculateOverdueDays(inv.dateOfInvoice || inv.date));
        const overdueB = invoicesB.map(inv => inv.status === 'Paid' ? 0 : calculateOverdueDays(inv.dateOfInvoice || inv.date));
        
        if (invoiceOverdueSort === 'asc') {
          const minA = Math.min(...overdueA);
          const minB = Math.min(...overdueB);
          return minA - minB;
        } else {
          const maxA = Math.max(...overdueA);
          const maxB = Math.max(...overdueB);
          return maxB - maxA;
        }
      });

      const sortedInvoices = [];
      sortedDealers.forEach(dealer => {
        sortedInvoices.push(...groups[dealer]);
      });
      filtered = sortedInvoices;
    } else {
      if (invoiceOverdueSort === 'asc') {
        filtered.sort((a, b) => {
          const overdueA = a.status === 'Paid' ? 0 : calculateOverdueDays(a.dateOfInvoice || a.date);
          const overdueB = b.status === 'Paid' ? 0 : calculateOverdueDays(b.dateOfInvoice || b.date);
          return overdueA - overdueB;
        });
      } else if (invoiceOverdueSort === 'desc') {
        filtered.sort((a, b) => {
          const overdueA = a.status === 'Paid' ? 0 : calculateOverdueDays(a.dateOfInvoice || a.date);
          const overdueB = b.status === 'Paid' ? 0 : calculateOverdueDays(b.dateOfInvoice || b.date);
          return overdueB - overdueA;
        });
      } else if (invoiceBalanceSort === 'asc') {
        filtered.sort((a, b) => {
          const balA = a.balance !== undefined ? a.balance : (a.invoiceValue || 0);
          const balB = b.balance !== undefined ? b.balance : (b.invoiceValue || 0);
          return balA - balB;
        });
      } else if (invoiceBalanceSort === 'desc') {
        filtered.sort((a, b) => {
          const balA = a.balance !== undefined ? a.balance : (a.invoiceValue || 0);
          const balB = b.balance !== undefined ? b.balance : (b.invoiceValue || 0);
          return balB - balA;
        });
      }
    }
    return filtered;
  }, [dealerInvoices, invoiceSearch, invoiceStatusFilter, invoiceBrandFilter, isAllBillsOrOutstanding, invoiceDealerFilter, invoiceSalesTeamFilter, invoiceBeltFilter, invoiceMonthFilter, invoiceBalanceStatusFilter, invoiceOverdueFilter, isAllBills, invoiceOverdueSort, invoiceBalanceSort]);

  const sumInvoicedValue = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + (inv.invoiceValue || 0), 0);
  }, [filteredInvoices]);

  const sumOutstandingBalance = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + (inv.balance !== undefined ? inv.balance : inv.invoiceValue), 0);
  }, [filteredInvoices]);

  const sortedDealerAggregates = useMemo(() => {
    const dealerAggregates = {};
    if (viewMode === 'total_outstanding') {
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
    }
    return Object.values(dealerAggregates).sort((a, b) => b.totalBalance - a.totalBalance);
  }, [filteredInvoices, viewMode]);

  const selectedDealerInvoices = useMemo(() => {
    return dealerInvoices.filter(inv => selectedInvoices[inv._id]);
  }, [dealerInvoices, selectedInvoices]);

  const selectedBalance = useMemo(() => {
    return selectedDealerInvoices.reduce((sum, inv) => sum + (inv.balance !== undefined ? inv.balance : inv.invoiceValue), 0);
  }, [selectedDealerInvoices]);

  const allDealerInvoicesSelected = useMemo(() => {
    return filteredInvoices.length > 0 && filteredInvoices.every(inv => selectedInvoices[inv._id]);
  }, [filteredInvoices, selectedInvoices]);

  const printedInvoices = useMemo(() => {
    return selectedDealerInvoices.length > 0
      ? filteredInvoices.filter(inv => selectedInvoices[inv._id])
      : filteredInvoices;
  }, [selectedDealerInvoices, filteredInvoices, selectedInvoices]);

  const printedTotalInvoiced = useMemo(() => {
    return printedInvoices.reduce((sum, inv) => sum + (inv.invoiceValue || 0), 0);
  }, [printedInvoices]);

  const printedTotalOutstanding = useMemo(() => {
    return printedInvoices.reduce((sum, inv) => sum + (inv.balance !== undefined ? inv.balance : inv.invoiceValue), 0);
  }, [printedInvoices]);

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

  const handleSharePDF = async () => {
    setSharingPdf(true);
    const element = document.querySelector('.print-only');
    if (!element) {
      setSharingPdf(false);
      return;
    }

    const clone = element.cloneNode(true);
    clone.classList.remove('print-only');
    clone.style.display = 'block';
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.width = '800px';
    clone.style.boxSizing = 'border-box';
    clone.style.padding = '40px 50px';
    clone.style.background = 'white';
    document.body.appendChild(clone);

    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 800
      });
      document.body.removeChild(clone);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
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

      const pdfBlob = pdf.output('blob');
      const targetName = viewMode === 'total_outstanding'
        ? 'Total_Outstanding'
        : isAllBills
          ? 'All_Dealers'
          : selectedDealer.replace(/\s+/g, '_');
      const fileName = viewMode === 'total_outstanding'
        ? 'Total_Outstanding_Report.pdf'
        : `Outstanding_Statement_\${targetName}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: viewMode === 'total_outstanding' ? 'Total Outstanding Report' : 'Outstanding Statement',
          text: viewMode === 'total_outstanding'
            ? 'Please find attached the total outstanding summary report.'
            : `Please find attached the outstanding bills statement for \${isAllBills ? 'All Dealers' : selectedDealer}.`
        });
      } else {
        pdf.save(fileName);
        alert('Web Share API is not supported on this browser/device. The PDF statement has been downloaded to your device instead.');
      }
    } catch (error) {
      console.error('Error generating or sharing PDF:', error);
      alert('Failed to generate PDF. Please use the Print Statement button instead.');
      if (document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
    } finally {
      setSharingPdf(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <div>Loading reports data...</div>
      </div>
    );
  }

  // Filter Dealers list
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-container" style={{maxWidth: '100%', overflowX: 'hidden'}}>
      {/* CSS style block for print and responsive layouts */}
      <style>{`
        /* Hide print-only element on screen */
        .print-only {
          display: none !important;
        }
        
        /* Responsive table for screen view */
        @media screen {
          .responsive-table {
            min-width: 1100px;
          }
        }

        /* Table styles for both print preview and PDF generator */
        .print-table {
          width: 100% !important;
          border-collapse: collapse !important;
          table-layout: fixed !important;
          font-size: 12px !important;
          background: white !important;
          color: black !important;
        }
        
        .print-table th, .print-table td {
          border: 1px solid #cbd5e1 !important;
          padding: 8px 10px !important;
          font-size: 11px !important;
          word-wrap: break-word !important;
          white-space: normal !important;
        }
        
        .print-table th {
          background-color: #f1f5f9 !important;
          font-weight: 700 !important;
          color: black !important;
        }
        
        .print-table tr {
          page-break-inside: avoid !important;
        }

        @media print {
          /* Hide all screen elements */
          body * {
            visibility: hidden;
          }
          
          /* Show print-only elements */
          .print-only, .print-only * {
            visibility: visible !important;
          }
          
          .print-only {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 40px 50px !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }
        }

        /* Mobile slide-out filters drawer overlay */
        @media (max-width: 768px) {
          .filters-drawer-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background-color: rgba(15, 23, 42, 0.4) !important;
            backdrop-filter: blur(4px) !important;
            z-index: 9999 !important;
            display: flex !important;
            justify-content: flex-end !important;
            align-items: stretch !important;
          }
          
          .filters-drawer-content {
            width: 85% !important;
            max-width: 320px !important;
            background-color: #ffffff !important;
            box-shadow: -4px 0 25px rgba(0, 0, 0, 0.15) !important;
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
            padding: 1.25rem !important;
            box-sizing: border-box !important;
            animation: slideInLeft 0.25s ease-out !important;
          }
          
          @keyframes slideInLeft {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          
          .filters-drawer-body {
            flex: 1 !important;
            overflow-y: auto !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 1.25rem !important;
            padding-right: 4px !important;
            margin-top: 0.5rem !important;
          }

          .filters-drawer-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-bottom: 1px solid var(--border-color) !important;
            padding-bottom: 0.75rem !important;
          }
          
          .filters-drawer-footer {
            display: flex !important;
            gap: 0.5rem !important;
            margin-top: 1rem !important;
            border-top: 1px solid var(--border-color) !important;
            padding-top: 0.75rem !important;
          }
          
          .desktop-only-filters-grid {
            display: none !important;
          }
        }
        
        @media (min-width: 769px) {
          .filters-drawer-overlay {
            display: none !important;
          }
          
          .desktop-only-filters-grid {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)) !important;
            gap: 1rem !important;
            background: #ffffff !important;
            padding: 1.25rem !important;
            border-radius: 12px !important;
            border: 1px solid var(--border-color) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03) !important;
            margin-top: 0.5rem !important;
          }
        }
      `}</style>

      <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }} className="no-print">
              <div>
                <h1 className="page-title" style={{marginBottom: 0}}>Reports & Analytics</h1>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Generate and print billing statements, outstanding balances, and sales team reports.
                </p>
              </div>
              {(viewMode === 'all_bills' || viewMode === 'total_outstanding' || selectedDealer) && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={handlePrint}
                    className="btn btn-secondary" 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, padding: '0.5rem 1rem' }}
                  >
                    🖨️ Print
                  </button>
                  <button 
                    onClick={handleSharePDF}
                    className="btn btn-primary" 
                    disabled={sharingPdf}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, padding: '0.5rem 1rem', opacity: sharingPdf ? 0.7 : 1 }}
                  >
                    {sharingPdf ? '⏳ Generating...' : '📤 Share PDF'}
                  </button>
                </div>
              )}
            </div>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }} className="no-print">
              <button
                onClick={() => { setViewMode('dealers'); setSelectedDealer(''); setShowMobileFilters(false); }}
                className={`btn ${viewMode === 'dealers' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontWeight: 600, gap: '0.35rem' }}
              >
                📂 Group by Dealers
              </button>
              <button
                onClick={() => { setViewMode('all_bills'); setShowMobileFilters(false); }}
                className={`btn ${viewMode === 'all_bills' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontWeight: 600, gap: '0.35rem' }}
              >
                📄 View All Bills at Once
              </button>
              <button
                onClick={() => { setViewMode('total_outstanding'); setShowMobileFilters(false); }}
                className={`btn ${viewMode === 'total_outstanding' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontWeight: 600, gap: '0.35rem' }}
              >
                📊 Total Outstanding
              </button>
            </div>

            {viewMode === 'dealers' && !selectedDealer ? (
              /* Dealers List View */
              <div className="no-print">
                <div style={{ marginBottom: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Select a dealer below to generate their outstanding bills statement.
                </div>

                {/* Dealer Filters Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '0.6rem 0.85rem', fontSize: '0.85rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                        value={dealerSearch}
                        onChange={e => setDealerSearch(e.target.value)}
                        placeholder="Search by dealer name..."
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary mobile-filter-toggle-btn"
                      onClick={() => setShowMobileFilters(!showMobileFilters)}
                      style={{ margin: 0, width: 'auto', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      ⚙️ {showMobileFilters ? 'Hide Filters' : 'Filters'}
                      {(dealerBalanceFilter !== 'all' || dealerOverdueFilter !== 'all') && ' (Active)'}
                    </button>
                  </div>

                  <div className={`filters-container-box ${showMobileFilters ? 'mobile-open' : ''}`} style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    background: '#ffffff',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                    alignItems: 'center'
                  }}>
                    <div style={{ minWidth: '180px', flex: '1' }}>
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
                    <div style={{ minWidth: '180px', flex: '1' }}>
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
                              style={{ background: 'white' }}
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
                                    Selected: ₹{selectedBalance.toLocaleString()}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>-</span>
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
              /* Selected Dealer / Global Bills report view */
              <div>
                {/* Back Navigation & Summary Header */}
                <div style={{ marginBottom: '1.5rem' }} className="no-print">
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => { setSelectedDealer(''); setViewMode('dealers'); setShowMobileFilters(false); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '1.25rem', padding: '0.5rem 1rem' }}
                  >
                    ← Back to Dealers List
                  </button>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#f8fafc', padding: '1.25rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                        {isAllBills ? 'All Bills (Global Report)' : selectedDealer}
                      </h2>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Showing {filteredInvoices.length} bills in this statement
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
                      {selectedDealerInvoices.length > 0 && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Selected Balance</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b91c1c' }}>
                            ₹{selectedBalance.toLocaleString()}
                          </div>
                        </div>
                      )}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Balance</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: sumOutstandingBalance > 0 ? '#b91c1c' : '#15803d' }}>
                          ₹{sumOutstandingBalance.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invoices Filters Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }} className="no-print">
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '0.6rem 0.85rem', fontSize: '0.85rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                        value={invoiceSearch}
                        onChange={e => setInvoiceSearch(e.target.value)}
                        placeholder="Search by bill number..."
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowMobileFilters(!showMobileFilters)}
                      style={{ margin: 0, width: 'auto', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', height: '38px', fontWeight: 600 }}
                    >
                      {showMobileFilters ? '🙈 Hide Filters' : '⚙️ Filters'}
                      {invoiceActiveCount > 0 && (
                        <span style={{
                          background: 'var(--accent-color)',
                          color: 'white',
                          fontSize: '0.75rem',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '10px',
                          fontWeight: 700,
                          marginLeft: '0.25rem'
                        }}>
                          {invoiceActiveCount}
                        </span>
                      )}
                    </button>
                    {invoiceActiveCount > 0 && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setInvoiceSearch('');
                          setInvoiceStatusFilter('all');
                          setInvoiceOverdueFilter('all');
                          setInvoiceBrandFilter('all');
                          setInvoiceDealerFilter('all');
                          setInvoiceSalesTeamFilter('all');
                          setInvoiceBeltFilter('all');
                          setInvoiceMonthFilter('all');
                          setInvoiceBalanceStatusFilter('all');
                          setInvoiceOverdueSort('none');
                          setInvoiceBalanceSort('none');
                        }}
                        style={{ margin: 0, width: 'auto', whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#b91c1c', border: '1px solid #fee2e2', background: '#fff5f5', height: '38px' }}
                      >
                        🧹 Clear All
                      </button>
                    )}
                  </div>

                  {/* Active Filter Chips (displayed when filters are collapsed) */}
                  {!showMobileFilters && invoiceActiveCount > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Filters:</span>
                      {invoiceStatusFilter !== 'all' && (
                        <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', padding: '0.25rem 0.6rem', background: '#e2e8f0', color: '#334155', borderRadius: '20px', fontWeight: 600 }}>
                          Status: {invoiceStatusFilter}
                          <span style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', color: '#64748b' }} onClick={() => setInvoiceStatusFilter('all')}>×</span>
                        </span>
                      )}
                      {invoiceSalesTeamFilter !== 'all' && (
                        <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', padding: '0.25rem 0.6rem', background: '#e2e8f0', color: '#334155', borderRadius: '20px', fontWeight: 600 }}>
                          Team: {invoiceSalesTeamFilter}
                          <span style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', color: '#64748b' }} onClick={() => setInvoiceSalesTeamFilter('all')}>×</span>
                        </span>
                      )}
                      {invoiceBeltFilter !== 'all' && (
                        <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', padding: '0.25rem 0.6rem', background: '#e2e8f0', color: '#334155', borderRadius: '20px', fontWeight: 600 }}>
                          Belt: {invoiceBeltFilter}
                          <span style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', color: '#64748b' }} onClick={() => setInvoiceBeltFilter('all')}>×</span>
                        </span>
                      )}
                      {invoiceMonthFilter !== 'all' && (
                        <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', padding: '0.25rem 0.6rem', background: '#e2e8f0', color: '#334155', borderRadius: '20px', fontWeight: 600 }}>
                          Month: {invoiceMonthFilter}
                          <span style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', color: '#64748b' }} onClick={() => setInvoiceMonthFilter('all')}>×</span>
                        </span>
                      )}
                      {invoiceBalanceStatusFilter !== 'all' && (
                        <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', padding: '0.25rem 0.6rem', background: '#e2e8f0', color: '#334155', borderRadius: '20px', fontWeight: 600 }}>
                          Balance: {invoiceBalanceStatusFilter === 'outstanding' ? 'Outstanding' : 'Zero'}
                          <span style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', color: '#64748b' }} onClick={() => setInvoiceBalanceStatusFilter('all')}>×</span>
                        </span>
                      )}
                      {invoiceOverdueFilter !== 'all' && (
                        <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', padding: '0.25rem 0.6rem', background: '#e2e8f0', color: '#334155', borderRadius: '20px', fontWeight: 600 }}>
                          Overdue: {invoiceOverdueFilter.replace('overdue_', '> ').replace('overdue', 'Overdue')} Days
                          <span style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', color: '#64748b' }} onClick={() => setInvoiceOverdueFilter('all')}>×</span>
                        </span>
                      )}
                      {invoiceBrandFilter !== 'all' && (
                        <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', padding: '0.25rem 0.6rem', background: '#e2e8f0', color: '#334155', borderRadius: '20px', fontWeight: 600 }}>
                          Brand: {invoiceBrandFilter}
                          <span style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', color: '#64748b' }} onClick={() => setInvoiceBrandFilter('all')}>×</span>
                        </span>
                      )}
                      {isAllBills && invoiceDealerFilter !== 'all' && (
                        <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', padding: '0.25rem 0.6rem', background: '#e2e8f0', color: '#334155', borderRadius: '20px', fontWeight: 600 }}>
                          Dealer: {invoiceDealerFilter}
                          <span style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', color: '#64748b' }} onClick={() => setInvoiceDealerFilter('all')}>×</span>
                        </span>
                      )}
                      {invoiceOverdueSort !== 'none' && (
                        <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', padding: '0.25rem 0.6rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '20px', fontWeight: 600 }}>
                          Sort Overdue: {invoiceOverdueSort === 'asc' ? 'Low to High' : 'High to Low'}
                          <span style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', color: '#0284c7' }} onClick={() => setInvoiceOverdueSort('none')}>×</span>
                        </span>
                      )}
                      {invoiceBalanceSort !== 'none' && (
                        <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', padding: '0.25rem 0.6rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '20px', fontWeight: 600 }}>
                          Sort Balance: {invoiceBalanceSort === 'asc' ? 'Low to High' : 'High to Low'}
                          <span style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', color: '#0284c7' }} onClick={() => setInvoiceBalanceSort('none')}>×</span>
                        </span>
                      )}
                    </div>
                  )}

                                    {showMobileFilters && (
                    <>
                      {/* Mobile Drawer (visible only on mobile via CSS) */}
                      <div className="filters-drawer-overlay" onClick={() => setShowMobileFilters(false)}>
                        <div className="filters-drawer-content" onClick={e => e.stopPropagation()}>
                          <div className="filters-drawer-header">
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-color)' }}>⚙️ Filters</h3>
                            <button 
                              type="button" 
                              onClick={() => setShowMobileFilters(false)}
                              style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0 0.5rem' }}
                            >
                              ×
                            </button>
                          </div>
                          
                          <div className="filters-drawer-body">

                      {isAllBills && (
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Dealer</label>
                          <select
                            className="form-input"
                            style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                            value={invoiceDealerFilter}
                            onChange={e => setInvoiceDealerFilter(e.target.value)}
                          >
                            <option value="all">All Dealers</option>
                            {uniqueDealersList.map(dealer => (
                              <option key={dealer} value={dealer}>{dealer}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
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
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Sales Team</label>
                        <select
                          className="form-input"
                          style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                          value={invoiceSalesTeamFilter}
                          onChange={e => setInvoiceSalesTeamFilter(e.target.value)}
                        >
                          <option value="all">All Teams</option>
                          {uniqueSalesTeamsList.map(team => (
                            <option key={team} value={team}>{team}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Belt</label>
                        <select
                          className="form-input"
                          style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                          value={invoiceBeltFilter}
                          onChange={e => setInvoiceBeltFilter(e.target.value)}
                        >
                          <option value="all">All Belts</option>
                          {uniqueBeltsList.map(belt => (
                            <option key={belt} value={belt}>{belt}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Month</label>
                        <select
                          className="form-input"
                          style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                          value={invoiceMonthFilter}
                          onChange={e => setInvoiceMonthFilter(e.target.value)}
                        >
                          <option value="all">All Months</option>
                          {uniqueMonthsList.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Balance</label>
                        <select
                          className="form-input"
                          style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                          value={invoiceBalanceStatusFilter}
                          onChange={e => setInvoiceBalanceStatusFilter(e.target.value)}
                        >
                          <option value="all">All Balances</option>
                          <option value="outstanding">Outstanding (&gt; ₹0)</option>
                          <option value="zero">Zero (₹0)</option>
                        </select>
                      </div>
                      <div>
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
                      <div>
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
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Sort Overdue</label>
                        <select
                          className="form-input"
                          style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                          value={invoiceOverdueSort}
                          onChange={e => {
                            setInvoiceOverdueSort(e.target.value);
                            setInvoiceBalanceSort('none');
                          }}
                        >
                          <option value="none">No Sort</option>
                          <option value="asc">Low to High</option>
                          <option value="desc">High to Low</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Sort Balance</label>
                        <select
                          className="form-input"
                          style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                          value={invoiceBalanceSort}
                          onChange={e => {
                            setInvoiceBalanceSort(e.target.value);
                            setInvoiceOverdueSort('none');
                          }}
                        >
                          <option value="none">No Sort</option>
                          <option value="asc">Low to High</option>
                          <option value="desc">High to Low</option>
                        </select>
                      </div>

                          </div>
                          
                          <div className="filters-drawer-footer">
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ flex: 1, margin: 0, height: '38px', fontSize: '0.85rem' }}
                              onClick={() => {
                                setInvoiceSearch('');
                                setInvoiceStatusFilter('all');
                                setInvoiceOverdueFilter('all');
                                setInvoiceBrandFilter('all');
                                setInvoiceDealerFilter('all');
                                setInvoiceSalesTeamFilter('all');
                                setInvoiceBeltFilter('all');
                                setInvoiceMonthFilter('all');
                                setInvoiceBalanceStatusFilter('all');
                                setInvoiceOverdueSort('none');
                                setInvoiceBalanceSort('none');
                                setShowMobileFilters(false);
                              }}
                            >
                              🧹 Clear All
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ flex: 1, margin: 0, height: '38px', fontSize: '0.85rem' }}
                              onClick={() => setShowMobileFilters(false)}
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Grid Layout (visible only on desktop via CSS) */}
                      <div className="desktop-only-filters-grid">

                      {isAllBills && (
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Dealer</label>
                          <select
                            className="form-input"
                            style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                            value={invoiceDealerFilter}
                            onChange={e => setInvoiceDealerFilter(e.target.value)}
                          >
                            <option value="all">All Dealers</option>
                            {uniqueDealersList.map(dealer => (
                              <option key={dealer} value={dealer}>{dealer}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
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
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Sales Team</label>
                        <select
                          className="form-input"
                          style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                          value={invoiceSalesTeamFilter}
                          onChange={e => setInvoiceSalesTeamFilter(e.target.value)}
                        >
                          <option value="all">All Teams</option>
                          {uniqueSalesTeamsList.map(team => (
                            <option key={team} value={team}>{team}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Belt</label>
                        <select
                          className="form-input"
                          style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                          value={invoiceBeltFilter}
                          onChange={e => setInvoiceBeltFilter(e.target.value)}
                        >
                          <option value="all">All Belts</option>
                          {uniqueBeltsList.map(belt => (
                            <option key={belt} value={belt}>{belt}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Month</label>
                        <select
                          className="form-input"
                          style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                          value={invoiceMonthFilter}
                          onChange={e => setInvoiceMonthFilter(e.target.value)}
                        >
                          <option value="all">All Months</option>
                          {uniqueMonthsList.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Balance</label>
                        <select
                          className="form-input"
                          style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                          value={invoiceBalanceStatusFilter}
                          onChange={e => setInvoiceBalanceStatusFilter(e.target.value)}
                        >
                          <option value="all">All Balances</option>
                          <option value="outstanding">Outstanding (&gt; ₹0)</option>
                          <option value="zero">Zero (₹0)</option>
                        </select>
                      </div>
                      <div>
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
                      <div>
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
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Sort Overdue</label>
                        <select
                          className="form-input"
                          style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                          value={invoiceOverdueSort}
                          onChange={e => {
                            setInvoiceOverdueSort(e.target.value);
                            setInvoiceBalanceSort('none');
                          }}
                        >
                          <option value="none">No Sort</option>
                          <option value="asc">Low to High</option>
                          <option value="desc">High to Low</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Sort Balance</label>
                        <select
                          className="form-input"
                          style={{ padding: '0.45rem', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                          value={invoiceBalanceSort}
                          onChange={e => {
                            setInvoiceBalanceSort(e.target.value);
                            setInvoiceOverdueSort('none');
                          }}
                        >
                          <option value="none">No Sort</option>
                          <option value="asc">Low to High</option>
                          <option value="desc">High to Low</option>
                        </select>
                      </div>

                      </div>
                    </>
                  )}
            </div>

              {/* Selection Summary Bar */}
              {selectedDealerInvoices.length > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  marginBottom: '1.25rem',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }} className="no-print">
                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Selected Bills</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#166534' }}>
                        {selectedDealerInvoices.length} of {filteredInvoices.length}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>Selected Balance</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b91c1c' }}>
                        ₹{selectedBalance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderColor: '#bbf7d0', background: 'white' }}
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
              )}

              {/* Screen-Only Table (Interactive, with checkboxes) */}
              {viewMode === 'total_outstanding' ? (
                /* Total Outstanding Aggregated View */
                <div className="card screen-only no-print" style={{ padding: '1.25rem', background: 'white' }}>
                  {/* Desktop View Table */}
                  <div className="desktop-view" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Dealer Name</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right', width: '200px' }}>Total Invoice Value</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right', width: '200px' }}>Total Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedDealerAggregates.length === 0 ? (
                          <tr>
                            <td colSpan="3" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                              No outstanding dealer aggregates found.
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

                  {/* Mobile View Card List */}
                  <div className="mobile-view">
                    {sortedDealerAggregates.length === 0 ? (
                      <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        <div>No outstanding dealer aggregates found.</div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {sortedDealerAggregates.map((dealer, idx) => {
                          const isExpanded = expandedDealer === dealer.dealerName;
                          return (
                            <div 
                              key={idx} 
                              className="mobile-card" 
                              style={{ 
                                borderLeft: '4px solid #ef4444',
                                padding: '1rem',
                                marginBottom: 0
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-color)' }}>
                                  {dealer.dealerName}
                                </span>
                                <button
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', margin: 0, height: 'auto', border: '1px solid #cbd5e1' }}
                                  onClick={() => setExpandedDealer(isExpanded ? null : dealer.dealerName)}
                                >
                                  {isExpanded ? 'Hide' : '📊 Breakdown'}
                                </button>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '6px', marginTop: '0.5rem' }}>
                                <div>
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>TOTAL INVOICED</span>
                                  <div style={{ fontWeight: 600 }}>₹{dealer.totalInvoiceValue.toLocaleString()}</div>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>TOTAL OUTSTANDING</span>
                                  <div style={{ fontWeight: 700, color: '#b91c1c' }}>₹{dealer.totalBalance.toLocaleString()}</div>
                                </div>
                              </div>
                              {isExpanded && (
                                <div style={{ marginTop: '0.75rem', borderTop: '1px dashed #e2e8f0', paddingTop: '0.75rem' }}>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                                    Brand Breakdown
                                  </span>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {Object.entries(dealer.brandContribution).length === 0 ? (
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>No outstanding balance.</div>
                                    ) : (
                                      Object.entries(dealer.brandContribution)
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([brand, amt]) => {
                                          const percentage = dealer.totalBalance > 0 ? ((amt / dealer.totalBalance) * 100).toFixed(1) : 0;
                                          return (
                                            <div key={brand} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', background: 'white', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                              <span style={{ fontWeight: 600 }}>{brand} <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>({percentage}%)</span></span>
                                              <span style={{ fontWeight: 700, color: '#b91c1c' }}>₹{amt.toLocaleString()}</span>
                                            </div>
                                          );
                                        })
                                    )}
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
              ) : (
                <div className="card screen-only no-print" style={{ padding: '1.25rem', background: 'white' }}>
                  {/* Scrollable Table Container */}
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                          <th 
                            style={{ 
                              position: 'sticky', 
                              left: 0, 
                              background: '#f8fafc', 
                              zIndex: 10, 
                              padding: 0, 
                              borderRight: '2px solid #e2e8f0', 
                              boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)', 
                              width: '50px',
                              verticalAlign: 'middle'
                            }}
                          >
                            <label style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              width: '100%', 
                              height: '100%', 
                              minHeight: '44px',
                              padding: '0.75rem 1rem', 
                              cursor: 'pointer',
                              margin: 0,
                              boxSizing: 'border-box'
                            }}>
                              <input 
                                type="checkbox" 
                                checked={allDealerInvoicesSelected} 
                                onChange={handleSelectAllToggle}
                                style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }} 
                              />
                            </label>
                          </th>
                          {isAllBills && <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Dealer Name</th>}
                          <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Invoice Number</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Invoice Value</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Overdue Days</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Balance</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Brand</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Date of Invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={isAllBills ? 8 : 7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                              No bills found.
                            </td>
                          </tr>
                        ) : (
                          <>
                            {filteredInvoices.map((inv, idx) => {
                              const value = inv.invoiceValue || 0;
                              const balance = inv.balance !== undefined ? inv.balance : value;
                              const overdue = calculateOverdueDays(inv.dateOfInvoice || inv.date);

                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td 
                                    style={{ 
                                      position: 'sticky', 
                                      left: 0, 
                                      background: 'white', 
                                      zIndex: 10, 
                                      padding: 0, 
                                      borderRight: '2px solid #e2e8f0', 
                                      boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)',
                                      verticalAlign: 'middle'
                                    }}
                                  >
                                    <label style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      width: '100%', 
                                      height: '100%', 
                                      minHeight: '44px',
                                      padding: '0.75rem 1rem', 
                                      cursor: 'pointer',
                                      margin: 0,
                                      boxSizing: 'border-box'
                                    }}>
                                      <input 
                                        type="checkbox" 
                                        checked={!!selectedInvoices[inv._id]} 
                                        onChange={() => toggleInvoiceSelection(inv._id)}
                                        style={{ cursor: 'pointer', width: '18px', height: '18px', margin: 0 }} 
                                      />
                                    </label>
                                  </td>
                                  {isAllBills && <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{inv.dealerName}</td>}
                                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>₹{value.toLocaleString()}</td>
                                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: overdue > 0 && inv.status !== 'Paid' ? '#b91c1c' : '#64748b' }}>
                                    {inv.status === 'Paid' ? 0 : overdue}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: balance > 0 ? '#b91c1c' : '#15803d' }}>₹{balance.toLocaleString()}</td>
                                  <td style={{ padding: '0.75rem 1rem' }}>{inv.brand || '-'}</td>
                                  <td style={{ padding: '0.75rem 1rem' }}>{new Date(inv.dateOfInvoice || inv.date).toLocaleDateString()}</td>
                                </tr>
                              );
                            })}
                            
                            {/* Screen Totals Row */}
                            <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid #e2e8f0' }}>
                              <td style={{ padding: '0.75rem 1rem' }}>Total</td>
                              {isAllBills && <td></td>}
                              <td></td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>₹{sumInvoicedValue.toLocaleString()}</td>
                              <td></td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#b91c1c' }}>₹{sumOutstandingBalance.toLocaleString()}</td>
                              <td colSpan="2"></td>
                            </tr>
                          </>
                        )}

                      </tbody>
                    </table>
                  </div>
                </div>
              )}


              {/* Print-Only Block (Prints ONLY selected bills, formats correctly for A4 portrait/landscape) */}
              <div className="print-only">
                {viewMode === 'total_outstanding' ? (
                  <div style={{ fontFamily: 'sans-serif' }}>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a', fontWeight: 700 }}>Total Outstanding Summary Report</h2>
                      
                      <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', marginBottom: '1rem', borderBottom: '2px solid #94a3b8', paddingBottom: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Report Date</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{new Date().toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Dealers Count</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{sortedDealerAggregates.length}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Total Outstanding</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b91c1c' }}>₹{sortedDealerAggregates.reduce((sum, d) => sum + d.totalBalance, 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <table className="print-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40%', textAlign: 'left' }}>Dealer Name</th>
                          <th style={{ width: '30%', textAlign: 'right' }}>Total Invoice Value</th>
                          <th style={{ width: '30%', textAlign: 'right' }}>Total Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedDealerAggregates.length === 0 ? (
                          <tr>
                            <td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>
                              No outstanding balances found.
                            </td>
                          </tr>
                        ) : (
                          <>
                            {sortedDealerAggregates.map((dealer, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 600 }}>
                                  {dealer.dealerName}
                                  {Object.keys(dealer.brandContribution).length > 0 && (
                                    <div style={{ fontSize: '9px', color: '#475569', fontWeight: 400, marginTop: '2px' }}>
                                      {Object.entries(dealer.brandContribution)
                                        .map(([brand, amt]) => `${brand}: ₹${amt.toLocaleString()}`)
                                        .join(', ')}
                                    </div>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right' }}>₹{dealer.totalInvoiceValue.toLocaleString()}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: '#b91c1c' }}>₹{dealer.totalBalance.toLocaleString()}</td>
                              </tr>
                            ))}
                            <tr style={{ fontWeight: 800, background: '#f8fafc' }}>
                              <td>Total</td>
                              <td style={{ textAlign: 'right' }}>₹{sortedDealerAggregates.reduce((sum, d) => sum + d.totalInvoiceValue, 0).toLocaleString()}</td>
                              <td style={{ textAlign: 'right', color: '#b91c1c' }}>₹{sortedDealerAggregates.reduce((sum, d) => sum + d.totalBalance, 0).toLocaleString()}</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ fontFamily: 'sans-serif' }}>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a', fontWeight: 700 }}>Outstanding Bills Statement</h2>
                      <p style={{ margin: '0.25rem 0 0.75rem 0', color: '#475569', fontSize: '0.85rem' }}>
                        Dealer: <strong>{isAllBills ? 'All Dealers' : selectedDealer}</strong>
                      </p>
                      
                      <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', borderBottom: '2px solid #94a3b8', paddingBottom: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Statement Date</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{new Date().toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Bills Printed</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{printedInvoices.length} of {filteredInvoices.length}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Printed Outstanding</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b91c1c' }}>₹{printedTotalOutstanding.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <table className="print-table">
                      <thead>
                        <tr>
                          {isAllBills && <th style={{ width: '20%', textAlign: 'left' }}>Dealer Name</th>}
                          <th style={{ width: isAllBills ? '15%' : '25%', textAlign: 'left' }}>Invoice Number</th>
                          <th style={{ width: isAllBills ? '15%' : '15%', textAlign: 'right' }}>Invoice Value</th>
                          <th style={{ width: isAllBills ? '10%' : '12%', textAlign: 'center' }}>Overdue Days</th>
                          <th style={{ width: isAllBills ? '15%' : '18%', textAlign: 'right' }}>Balance</th>
                          <th style={{ width: isAllBills ? '12%' : '15%', textAlign: 'left' }}>Brand</th>
                          <th style={{ width: isAllBills ? '13%' : '15%', textAlign: 'left' }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {printedInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={isAllBills ? 7 : 6} style={{ textAlign: 'center', padding: '2rem' }}>
                              No bills selected to print.
                            </td>
                          </tr>
                        ) : (
                          <>
                            {printedInvoices.map((inv, idx) => {
                              const value = inv.invoiceValue || 0;
                              const balance = inv.balance !== undefined ? inv.balance : value;
                              const overdue = calculateOverdueDays(inv.dateOfInvoice || inv.date);

                              return (
                                <tr key={idx}>
                                  {isAllBills && <td>{inv.dealerName}</td>}
                                  <td style={{ fontWeight: 600 }}>{inv.invoiceNumber}</td>
                                  <td style={{ textAlign: 'right' }}>₹{value.toLocaleString()}</td>
                                  <td style={{ textAlign: 'center', fontWeight: 600, color: overdue > 0 && inv.status !== 'Paid' ? '#b91c1c' : 'black' }}>
                                    {inv.status === 'Paid' ? 0 : overdue}
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{balance.toLocaleString()}</td>
                                  <td>{inv.brand || '-'}</td>
                                  <td>{new Date(inv.dateOfInvoice || inv.date).toLocaleDateString()}</td>
                                </tr>
                              );
                            })}
                            <tr style={{ fontWeight: 800, background: '#f8fafc' }}>
                              <td>Total</td>
                              {isAllBills && <td></td>}
                              <td style={{ textAlign: 'right' }}>₹{printedTotalInvoiced.toLocaleString()}</td>
                              <td></td>
                              <td style={{ textAlign: 'right', color: '#b91c1c' }}>₹{printedTotalOutstanding.toLocaleString()}</td>
                              <td colSpan="2"></td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          </>
    </div>
  );
};

export default Reports;



