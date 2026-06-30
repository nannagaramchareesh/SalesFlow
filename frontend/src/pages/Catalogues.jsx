import React, { useState, useEffect } from 'react';
import { getCatalogues, getCatalogueById, createCatalogue, deleteCatalogue } from '../utils/api';
import { BookOpen, FileText, Image, Trash2, Search, FileUp, Eye, X, RefreshCw, Download, FileSpreadsheet, FileImage } from 'lucide-react';
import * as XLSX from 'xlsx';

const Catalogues = () => {
  const [catalogues, setCatalogues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewLoading, setViewLoading] = useState(null);
  
  // Form State
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, pdf, image, excel
  
  // Preview Modal State
  const [selectedView, setSelectedView] = useState(null); // { url, name, type }
  const [selectedExcel, setSelectedExcel] = useState(null); // { name, data }
  const [excelSearchQuery, setExcelSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getCatalogues();
      setCatalogues(data);
    } catch (error) {
      console.error('Error fetching catalogues:', error);
    } finally {
      setLoading(false);
    }
  };  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFileError('');
    if (!selected) {
      setFile(null);
      return;
    }
    
    const extension = selected.name.split('.').pop().toLowerCase();
    const validExtensions = ['pdf', 'xls', 'xlsx', 'csv', 'jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!validExtensions.includes(extension)) {
      setFileError('Unsupported file type. Please upload a PDF, Excel spreadsheet, or Image.');
      setFile(null);
      e.target.value = null;
      return;
    }
    
    setFile(selected);
    if (!name) {
      const cleanName = selected.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, ' ');
      setName(cleanName);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a name.');
      return;
    }
    if (!file) {
      alert('Please select a file.');
      return;
    }

    setUploading(true);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const payload = {
          name: name.trim(),
          fileName: file.name,
          fileType: file.type,
          fileData: reader.result
        };
        
        await createCatalogue(payload);
        
        setName('');
        setFile(null);
        const fileInput = document.getElementById('catalogue-file-input');
        if (fileInput) fileInput.value = null;
        
        await fetchData();
      } catch (error) {
        console.error('Error uploading:', error);
        alert('Failed to upload.');
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setUploading(false);
      alert('Error reading file.');
    };
  };

  const handleDelete = async (id, catalogName) => {
    if (!window.confirm(`Are you sure you want to delete "${catalogName}"?`)) {
      return;
    }
    try {
      await deleteCatalogue(id);
      setCatalogues(prev => prev.filter(c => c._id !== id));
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete.');
    }
  };

  const handleView = async (catalogueId) => {
    try {
      setViewLoading(catalogueId);
      const fullCatalog = await getCatalogueById(catalogueId);
      
      const base64Data = fullCatalog.fileData;
      const parts = base64Data.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      
      const ext = fullCatalog.fileName.toLowerCase().split('.').pop();
      const blob = new Blob([uInt8Array], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);
      
      if (ext === 'pdf') {
        const win = window.open();
        if (win) {
          win.document.write(
            `<html>
              <head>
                <title>${fullCatalog.name}</title>
                <style>
                  html, body {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    background-color: #f4f4f5;
                  }
                  iframe {
                    width: 100%;
                    height: 100%;
                    border: none;
                    display: block;
                  }
                </style>
              </head>
              <body>
                <iframe src="${blobUrl}" allowfullscreen></iframe>
              </body>
            </html>`
          );
          win.document.close();
        } else {
          window.open(blobUrl, '_blank');
        }
      } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
        const wb = XLSX.read(uInt8Array, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        setSelectedExcel({ name: fullCatalog.name, data });
      } else {
        setSelectedView({ url: blobUrl, name: fullCatalog.name, type: contentType });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load file.');
    } finally {
      setViewLoading(null);
    }
  };
  const handleDownload = async (catalogueId) => {
    try {
      setViewLoading(catalogueId);
      const fullCatalog = await getCatalogueById(catalogueId);
      
      const base64Data = fullCatalog.fileData;
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
      a.download = fullCatalog.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      alert('Failed to download catalogue.');
    } finally {
      setViewLoading(null);
    }
  };

  const filteredCatalogues = catalogues.filter(cat => {
    const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          cat.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const ext = cat.fileName.toLowerCase().split('.').pop();
    if (typeFilter === 'pdf') {
      return matchesSearch && ext === 'pdf';
    }
    if (typeFilter === 'image') {
      return matchesSearch && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    }
    if (typeFilter === 'excel') {
      return matchesSearch && ['xls', 'xlsx', 'csv'].includes(ext);
    }
    return matchesSearch;
  });

  return (
    <div className="page-container" style={{ maxWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 0 }}>Product Catalogues</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Upload, manage, and share product catalogues, leaflets, and image spec sheets.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="grid-mobile-stack">
        
        {/* Upload Card */}
        <div className="card" style={{ background: 'white' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileUp size={20} className="text-primary" />
            Upload New Catalogue
          </h2>
          
          <form onSubmit={handleUploadSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="grid-mobile-stack">
              <div className="form-group">
                <label>Catalogue Title / Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Winter 2026 Leather Belts Catalogue"
                  required
                />
              </div>

              <div className="form-group">
                <label>Choose PDF, Image or Excel File</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="catalogue-file-input"
                    type="file"
                    className="form-input"
                    onChange={handleFileChange}
                    accept=".pdf, .xls, .xlsx, .csv, image/*"
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
                placeholder="Search catalogues by name..."
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
                className={`btn ${typeFilter === 'image' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
                onClick={() => setTypeFilter('image')}
              >
                Images
              </button>
              <button
                className={`btn ${typeFilter === 'excel' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
                onClick={() => setTypeFilter('excel')}
              >
                Excel
              </button>
            </div>
          </div>

          {/* Catalogues Listing */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="spinner" style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
              <div>Loading catalogues...</div>
            </div>
          ) : filteredCatalogues.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
              <BookOpen size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
              <h3>No catalogues found</h3>
              <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                {searchQuery || typeFilter !== 'all' ? 'Try adjusting your search query or filters.' : 'Upload your first PDF or Image catalogue to begin.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {filteredCatalogues.map((cat) => {
                const ext = cat.fileName.toLowerCase().split('.').pop();
                const isPdf = ext === 'pdf';
                const isExcel = ['xls', 'xlsx', 'csv'].includes(ext);
                
                let iconColor = '#3b82f6';
                let iconBg = '#eff6ff';
                let iconElement = <FileImage size={22} />;
                let typeText = 'Image File';
                let borderCol = '#3b82f6';

                if (isPdf) {
                  iconColor = '#ef4444';
                  iconBg = '#fef2f2';
                  iconElement = <FileText size={22} />;
                  typeText = 'PDF Document';
                  borderCol = '#ef4444';
                } else if (isExcel) {
                  iconColor = '#10b981';
                  iconBg = '#ecfdf5';
                  iconElement = <FileSpreadsheet size={22} />;
                  typeText = 'Excel Spreadsheet';
                  borderCol = '#10b981';
                }
                
                return (
                  <div 
                    key={cat._id} 
                    className="card" 
                    style={{ 
                      background: 'white', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      borderLeft: `4px solid ${borderCol}`
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
                          background: iconBg,
                          color: iconColor
                        }}>
                          {iconElement}
                        </div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }} title={cat.name}>
                            {cat.name}
                          </h3>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {cat.fileName}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>File Type:</span>
                          <span style={{ fontWeight: 600 }}>{typeText}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Uploaded:</span>
                          <span style={{ fontWeight: 600 }}>{new Date(cat.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleView(cat._id)}
                        disabled={viewLoading === cat._id}
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                      >
                        {viewLoading === cat._id ? (
                          <RefreshCw size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Eye size={14} />
                        )}
                        View
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleDownload(cat._id)}
                        disabled={viewLoading === cat._id}
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                      >
                        {viewLoading === cat._id ? (
                          <RefreshCw size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Download size={14} />
                        )}
                        Download
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleDelete(cat._id, cat.name)}
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

      {/* Image Preview Modal Overlay */}
      {selectedView && (
        <div className="modal-overlay" onClick={() => setSelectedView(null)}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>{selectedView.name}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedView(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', background: '#0f172a', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', maxHeight: '70vh' }}>
              <img 
                src={selectedView.url} 
                alt={selectedView.name} 
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Excel Preview Modal Overlay */}
      {selectedExcel && (() => {
        const maxCols = selectedExcel.data && selectedExcel.data.length > 0
          ? Math.max(...selectedExcel.data.map(row => row ? row.length : 0), 0)
          : 0;
        
        const query = excelSearchQuery.trim().toLowerCase();
        const filteredRows = query
          ? selectedExcel.data.slice(1).filter(row => 
              row && row.some(cell => 
                cell !== undefined && cell !== null && String(cell).toLowerCase().includes(query)
              )
            )
          : selectedExcel.data.slice(1);

        return (
          <div className="modal-overlay" onClick={() => { setSelectedExcel(null); setExcelSearchQuery(''); }}>
            <div className="modal-content" style={{ maxWidth: '90%', width: '1200px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-group">
                  <h3>{selectedExcel.name}</h3>
                </div>
                <button className="modal-close-btn" onClick={() => { setSelectedExcel(null); setExcelSearchQuery(''); }}>
                  <X size={20} />
                </button>
              </div>

              {/* Search option in Excel Viewer */}
              <div className="modal-search-wrapper" style={{ padding: '0.75rem 1rem', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Search size={16} color="#64748b" style={{ flexShrink: 0 }} />
                <input 
                  type="text" 
                  placeholder="Search in sheet..." 
                  value={excelSearchQuery}
                  onChange={e => setExcelSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.4rem 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    outline: 'none',
                    background: 'white'
                  }}
                />
                {excelSearchQuery && (
                  <button 
                    onClick={() => setExcelSearchQuery('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '0.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="modal-body" style={{ overflow: 'auto', maxHeight: '70vh', padding: '1rem', background: '#f8fafc' }}>
                <div style={{ background: 'white', borderRadius: '6px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    <thead>
                      <tr style={{ background: '#e2e8f0', borderBottom: '2px solid #cbd5e1' }}>
                        {Array.from({ length: maxCols }).map((_, idx) => {
                          const col = selectedExcel.data[0] ? selectedExcel.data[0][idx] : '';
                          return (
                            <th key={idx} style={{ padding: '0.75rem 1rem', borderRight: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 600, color: '#334155' }}>
                              {col !== undefined && col !== null && String(col).trim() !== '' ? String(col) : `Column ${idx + 1}`}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={maxCols} style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: 'white' }}>
                            No results match "{excelSearchQuery}"
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row, rowIdx) => (
                          <tr key={rowIdx} style={{ borderBottom: '1px solid #e2e8f0', background: rowIdx % 2 === 0 ? 'white' : '#f8fafc' }}>
                            {Array.from({ length: maxCols }).map((_, cellIdx) => {
                              const cell = row ? row[cellIdx] : '';
                              return (
                                <td key={cellIdx} style={{ padding: '0.75rem 1rem', borderRight: '1px solid #e2e8f0', color: '#475569' }}>
                                  {cell !== undefined && cell !== null ? String(cell) : ''}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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

export default Catalogues;
