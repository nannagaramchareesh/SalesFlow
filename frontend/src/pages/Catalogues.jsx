import React, { useState, useEffect } from 'react';
import { getCatalogues, getCatalogueById, createCatalogue, deleteCatalogue } from '../utils/api';
import { BookOpen, FileText, Image, Trash2, Search, FileUp, Eye, X, RefreshCw, Download } from 'lucide-react';

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
  const [typeFilter, setTypeFilter] = useState('all'); // all, pdf, image
  
  // Preview Modal State
  const [selectedView, setSelectedView] = useState(null); // { url, name, type }

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
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFileError('');
    if (!selected) {
      setFile(null);
      return;
    }
    
    // Check file size (e.g. limit to 10MB)
    if (selected.size > 10 * 1024 * 1024) {
      setFileError('File size must be less than 10MB');
      setFile(null);
      e.target.value = null;
      return;
    }
    
    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(selected.type)) {
      setFileError('Only PDF and Image files are supported');
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
      alert('Please enter a name for the catalogue.');
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
          fileType: file.type,
          fileData: reader.result
        };
        
        await createCatalogue(payload);
        
        // Reset form
        setName('');
        setFile(null);
        const fileInput = document.getElementById('catalogue-file-input');
        if (fileInput) fileInput.value = null;
        
        // Refresh catalogues list
        await fetchData();
      } catch (error) {
        console.error('Error uploading catalogue:', error);
        alert('Failed to upload catalogue.');
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
      console.error('Error deleting catalogue:', error);
      alert('Failed to delete catalogue.');
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
      
      const blob = new Blob([uInt8Array], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);
      
      if (contentType.includes('pdf')) {
        // Open PDF in a new tab for native responsive pdf rendering
        const win = window.open();
        if (win) {
          win.document.write(
            `<iframe src="${blobUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
          );
          win.document.title = fullCatalog.name;
        } else {
          // Fallback if popup blocker hits
          window.open(blobUrl, '_blank');
        }
      } else {
        // Display images in our clean premium modal overlay
        setSelectedView({ url: blobUrl, name: fullCatalog.name, type: contentType });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load catalogue file.');
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
    
    if (typeFilter === 'pdf') {
      return matchesSearch && cat.fileType.includes('pdf');
    }
    if (typeFilter === 'image') {
      return matchesSearch && !cat.fileType.includes('pdf');
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
                <label>Choose PDF or Image File (Max 10MB)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="catalogue-file-input"
                    type="file"
                    className="form-input"
                    onChange={handleFileChange}
                    accept=".pdf, image/*"
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
                const isPdf = cat.fileType.includes('pdf');
                
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
                      borderLeft: `4px solid ${isPdf ? '#ef4444' : '#3b82f6'}`
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
                          background: isPdf ? '#fef2f2' : '#eff6ff',
                          color: isPdf ? '#ef4444' : '#3b82f6'
                        }}>
                          {isPdf ? <FileText size={22} /> : <Image size={22} />}
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
                          <span style={{ fontWeight: 600 }}>{isPdf ? 'PDF Document' : 'Image File'}</span>
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
