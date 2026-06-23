import React, { useState, useEffect } from 'react';
import { getPriceLists, getPriceListById, createPriceList, deletePriceList } from '../utils/api';
import { FileSpreadsheet, FileText, Trash2, Search, FileUp, Eye, Download, RefreshCw, X, File } from 'lucide-react';
import * as XLSX from 'xlsx';

const PriceLists = () => {
  const [priceLists, setPriceLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewLoading, setViewLoading] = useState(null);
  const [selectedExcel, setSelectedExcel] = useState(null);
  
  // Form State
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, pdf, excel
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getPriceLists();
      setPriceLists(data);
    } catch (error) {
      console.error('Error fetching price lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFileError('');
    if (!selected) {
      setFile(null);
      return;
    }
    
    // Check file size (limit to 10MB)
    if (selected.size > 10 * 1024 * 1024) {
      setFileError('File size must be less than 10MB');
      setFile(null);
      e.target.value = null;
      return;
    }
    
    // Validate file type by extension
    const extension = selected.name.split('.').pop().toLowerCase();
    const validExtensions = ['pdf', 'xls', 'xlsx', 'csv'];
    if (!validExtensions.includes(extension)) {
      setFileError('Only PDF and Excel (.xls, .xlsx, .csv) files are supported');
      setFile(null);
      e.target.value = null;
      return;
    }
    
    setFile(selected);
    // Auto-fill name if empty
    if (!name) {
      const cleanName = selected.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, ' ');
      setName(cleanName);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a name for the price list.');
      return;
    }
    if (!file) {
      alert('Please select a file.');
      return;
    }

    setUploading(true);
    
    // Convert file to Base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const payload = {
          name: name.trim(),
          fileName: file.name,
          fileType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
          fileData: reader.result
        };
        
        await createPriceList(payload);
        
        // Reset form
        setName('');
        setFile(null);
        const fileInput = document.getElementById('pricelist-file-input');
        if (fileInput) fileInput.value = null;
        
        // Refresh price lists
        await fetchData();
      } catch (error) {
        console.error('Error uploading price list:', error);
        alert('Failed to upload price list.');
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setUploading(false);
      alert('Error reading file.');
    };
  };

  const handleDelete = async (id, priceListName) => {
    if (!window.confirm(`Are you sure you want to delete price list "${priceListName}"?`)) {
      return;
    }
    try {
      await deletePriceList(id);
      setPriceLists(prev => prev.filter(p => p._id !== id));
    } catch (error) {
      console.error('Error deleting price list:', error);
      alert('Failed to delete price list.');
    }
  };

  const handleDownload = async (priceListId) => {
    try {
      setViewLoading(priceListId);
      const fullPriceList = await getPriceListById(priceListId);
      
      const base64Data = fullPriceList.fileData;
      const parts = base64Data.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      
      const blob = new Blob([uInt8Array], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fullPriceList.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      alert('Failed to download price list.');
    } finally {
      setViewLoading(null);
    }
  };

  const handleView = async (priceListId) => {
    try {
      setViewLoading(priceListId);
      const fullPriceList = await getPriceListById(priceListId);
      
      const base64Data = fullPriceList.fileData;
      const parts = base64Data.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      
      if (contentType.includes('pdf') || fullPriceList.fileName.toLowerCase().endsWith('.pdf')) {
        const blob = new Blob([uInt8Array], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open();
        if (win) {
          win.document.write(
            `<iframe src="${blobUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
          );
          win.document.title = fullPriceList.name;
        } else {
          window.open(blobUrl, '_blank');
        }
      } else {
        // Parse Excel/CSV
        const wb = XLSX.read(uInt8Array, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        setSelectedExcel({ name: fullPriceList.name, data });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to view price list.');
    } finally {
      setViewLoading(null);
    }
  };

  const isExcel = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    return ['xls', 'xlsx', 'csv'].includes(ext);
  };

  const filteredPriceLists = priceLists.filter(pl => {
    const matchesSearch = pl.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          pl.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (typeFilter === 'pdf') {
      return matchesSearch && pl.fileName.toLowerCase().endsWith('.pdf');
    }
    if (typeFilter === 'excel') {
      return matchesSearch && isExcel(pl.fileName);
    }
    return matchesSearch;
  });

  return (
    <div className="page-container" style={{ maxWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 0 }}>Price Lists</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Upload, manage, and download price lists (Excel sheets or PDF documents).
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="grid-mobile-stack">
        
        {/* Upload Card */}
        <div className="card" style={{ background: 'white' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileUp size={20} className="text-primary" />
            Upload New Price List
          </h2>
          
          <form onSubmit={handleUploadSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="grid-mobile-stack">
              <div className="form-group">
                <label>Price List Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dealer Price List - June 2026"
                  required
                />
              </div>

              <div className="form-group">
                <label>Choose Excel or PDF File (Max 10MB)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="pricelist-file-input"
                    type="file"
                    className="form-input"
                    onChange={handleFileChange}
                    accept=".pdf, .xls, .xlsx, .csv"
                    required
                    style={{ padding: '0.65rem' }}
                  />
                </div>
                {fileError && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--danger-color)', marginTop: '0.25rem', display: 'block' }}>
                    ⚠️ {fileError}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={uploading || !file}
                style={{ fontWeight: 600, padding: '0.65rem 1.5rem', opacity: (uploading || !file) ? 0.65 : 1, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {uploading ? (
                  <>
                    <RefreshCw size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                    Uploading...
                  </>
                ) : 'Upload File'}
              </button>
            </div>
          </form>
        </div>

        {/* View & Search Section */}
        <div>
          {/* Filters Bar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem',
            background: 'white',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ flex: '1', minWidth: '280px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.25rem 0.75rem', background: '#f8fafc' }}>
              <Search size={18} style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.875rem', padding: '0.5rem 0' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search price lists by name..."
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={`btn ${typeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
                onClick={() => setTypeFilter('all')}
              >
                All
              </button>
              <button
                className={`btn ${typeFilter === 'pdf' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
                onClick={() => setTypeFilter('pdf')}
              >
                PDFs
              </button>
              <button
                className={`btn ${typeFilter === 'excel' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
                onClick={() => setTypeFilter('excel')}
              >
                Excel Sheets
              </button>
            </div>
          </div>

          {/* Price Lists Listing */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="spinner" style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
              <div>Loading price lists...</div>
            </div>
          ) : filteredPriceLists.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
              <FileSpreadsheet size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
              <h3>No price lists found</h3>
              <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                {searchQuery || typeFilter !== 'all' ? 'Try adjusting your search query or filters.' : 'Upload your first Excel or PDF price list to begin.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {filteredPriceLists.map((pl) => {
                const isPdfFile = pl.fileName.toLowerCase().endsWith('.pdf');
                
                return (
                  <div 
                    key={pl._id} 
                    className="card" 
                    style={{ 
                      background: 'white', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      borderLeft: `4px solid ${isPdfFile ? '#ef4444' : '#10b981'}`
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '8px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          background: isPdfFile ? '#fef2f2' : '#ecfdf5',
                          color: isPdfFile ? '#ef4444' : '#10b981'
                        }}>
                          {isPdfFile ? <FileText size={22} /> : <FileSpreadsheet size={22} />}
                        </div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }} title={pl.name}>
                            {pl.name}
                          </h3>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {pl.fileName}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>File Type:</span>
                          <span style={{ fontWeight: 600 }}>{isPdfFile ? 'PDF Document' : 'Excel Sheet'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Uploaded:</span>
                          <span style={{ fontWeight: 600 }}>{new Date(pl.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleView(pl._id)}
                        disabled={viewLoading === pl._id}
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                      >
                        {viewLoading === pl._id ? (
                          <RefreshCw size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Eye size={14} />
                        )}
                        View
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleDownload(pl._id)}
                        disabled={viewLoading === pl._id}
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                      >
                        {viewLoading === pl._id ? (
                          <RefreshCw size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Download size={14} />
                        )}
                        Download
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleDelete(pl._id, pl.name)}
                        style={{ color: 'var(--danger-color)', borderColor: '#fee2e2', hoverBackground: '#fef2f2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.45rem', width: '36px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Excel Preview Modal Overlay */}
      {selectedExcel && (
        <div className="modal-overlay" onClick={() => setSelectedExcel(null)}>
          <div className="modal-content" style={{ maxWidth: '90%', width: '1200px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>{selectedExcel.name}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedExcel(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ overflow: 'auto', maxHeight: '70vh', padding: '1rem', background: '#f8fafc' }}>
              <div style={{ background: 'white', borderRadius: '6px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#e2e8f0', borderBottom: '2px solid #cbd5e1' }}>
                      {selectedExcel.data[0] && selectedExcel.data[0].map((col, idx) => (
                        <th key={idx} style={{ padding: '0.75rem 1rem', borderRight: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 600, color: '#334155' }}>
                          {col !== undefined && col !== null ? String(col) : `Column ${idx + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedExcel.data.slice(1).map((row, rowIdx) => {
                      const maxCols = selectedExcel.data[0] ? selectedExcel.data[0].length : 0;
                      return (
                        <tr key={rowIdx} style={{ borderBottom: '1px solid #e2e8f0', background: rowIdx % 2 === 0 ? 'white' : '#f8fafc' }}>
                          {Array.from({ length: maxCols }).map((_, cellIdx) => {
                            const cell = row[cellIdx];
                            return (
                              <td key={cellIdx} style={{ padding: '0.75rem 1rem', borderRight: '1px solid #e2e8f0', color: '#475569' }}>
                                {cell !== undefined && cell !== null ? String(cell) : ''}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styling for animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spinner {
          display: inline-block;
        }
      `}</style>
    </div>
  );
};

export default PriceLists;
