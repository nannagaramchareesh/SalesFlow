import React, { useState, useEffect } from 'react';
import { getStocks, getStockById, createStock, deleteStock } from '../utils/api';
import { FileSpreadsheet, Trash2, Search, FileUp, Download, RefreshCw } from 'lucide-react';

const Stock = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(null);
  
  // Form State
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getStocks();
      setStocks(data);
    } catch (error) {
      console.error('Error fetching stocks:', error);
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
    
    // Validate file type (Excel only)
    const extension = selected.name.split('.').pop().toLowerCase();
    const validExtensions = ['xls', 'xlsx', 'csv'];
    if (!validExtensions.includes(extension)) {
      setFileError('Only Excel (.xls, .xlsx, .csv) files are supported');
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
      alert('Please enter a name for the stock sheet.');
      return;
    }
    if (!file) {
      alert('Please select an Excel or CSV file.');
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
          fileType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          fileData: reader.result
        };
        
        await createStock(payload);
        
        // Reset form
        setName('');
        setFile(null);
        const fileInput = document.getElementById('stock-file-input');
        if (fileInput) fileInput.value = null;
        
        // Refresh stocks
        await fetchData();
      } catch (error) {
        console.error('Error uploading stock sheet:', error);
        alert('Failed to upload stock sheet.');
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setUploading(false);
      alert('Error reading file.');
    };
  };

  const handleDelete = async (id, stockName) => {
    if (!window.confirm(`Are you sure you want to delete stock sheet "${stockName}"?`)) {
      return;
    }
    try {
      await deleteStock(id);
      setStocks(prev => prev.filter(s => s._id !== id));
    } catch (error) {
      console.error('Error deleting stock sheet:', error);
      alert('Failed to delete stock sheet.');
    }
  };

  const handleDownload = async (stockId) => {
    try {
      setDownloadLoading(stockId);
      const fullStock = await getStockById(stockId);
      
      const base64Data = fullStock.fileData;
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
      a.download = fullStock.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      alert('Failed to download stock sheet.');
    } finally {
      setDownloadLoading(null);
    }
  };

  const filteredStocks = stocks.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-container" style={{ maxWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 0 }}>Stock</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Upload, manage, and download active stock and inventory spreadsheets.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="grid-mobile-stack">
        
        {/* Upload Card */}
        <div className="card" style={{ background: 'white' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileUp size={20} className="text-primary" />
            Upload New Stock Spreadsheet
          </h2>
          
          <form onSubmit={handleUploadSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="grid-mobile-stack">
              <div className="form-group">
                <label>Stock Sheet Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Belt Stock Inventory - June 2026"
                  required
                />
              </div>

              <div className="form-group">
                <label>Choose Excel or CSV File (Max 10MB)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="stock-file-input"
                    type="file"
                    className="form-input"
                    onChange={handleFileChange}
                    accept=".xls, .xlsx, .csv"
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
          {/* Search Bar */}
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
                placeholder="Search stock sheets by name..."
              />
            </div>
          </div>

          {/* Stocks Listing */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="spinner" style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
              <div>Loading stock sheets...</div>
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
              <FileSpreadsheet size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
              <h3>No stock sheets found</h3>
              <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                {searchQuery ? 'Try adjusting your search query.' : 'Upload your first stock Excel or CSV sheet to begin.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {filteredStocks.map((stock) => {
                return (
                  <div 
                    key={stock._id} 
                    className="card" 
                    style={{ 
                      background: 'white', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      borderLeft: '4px solid #10b981' // Success Green representing inventory/stock
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
                          background: '#ecfdf5',
                          color: '#10b981'
                        }}>
                          <FileSpreadsheet size={22} />
                        </div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }} title={stock.name}>
                            {stock.name}
                          </h3>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {stock.fileName}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>File Type:</span>
                          <span style={{ fontWeight: 600 }}>Excel Spreadsheet</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Uploaded:</span>
                          <span style={{ fontWeight: 600 }}>{new Date(stock.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleDownload(stock._id)}
                        disabled={downloadLoading === stock._id}
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}
                      >
                        {downloadLoading === stock._id ? (
                          <RefreshCw size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Download size={14} />
                        )}
                        Download Stock File
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleDelete(stock._id, stock.name)}
                        style={{ color: 'var(--danger-color)', borderColor: '#fee2e2', hoverBackground: '#fef2f2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.45rem', width: '42px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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

export default Stock;
