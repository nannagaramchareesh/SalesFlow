import React, { useState, useEffect } from 'react';
import { getSchemes, getSchemeById, createScheme, deleteScheme } from '../utils/api';
import { FileText, Trash2, Search, FileUp, Eye, Download, RefreshCw } from 'lucide-react';

const Schemes = () => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewLoading, setViewLoading] = useState(null);
  
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
      const data = await getSchemes();
      setSchemes(data);
    } catch (error) {
      console.error('Error fetching schemes:', error);
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
    
    // Validate file type (PDF only)
    const extension = selected.name.split('.').pop().toLowerCase();
    if (extension !== 'pdf') {
      setFileError('Only PDF files are supported for schemes');
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
      alert('Please enter a name for the scheme.');
      return;
    }
    if (!file) {
      alert('Please select a PDF file.');
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
          fileType: file.type || 'application/pdf',
          fileData: reader.result
        };
        
        await createScheme(payload);
        
        // Reset form
        setName('');
        setFile(null);
        const fileInput = document.getElementById('scheme-file-input');
        if (fileInput) fileInput.value = null;
        
        // Refresh schemes
        await fetchData();
      } catch (error) {
        console.error('Error uploading scheme:', error);
        alert('Failed to upload scheme.');
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setUploading(false);
      alert('Error reading file.');
    };
  };

  const handleDelete = async (id, schemeName) => {
    if (!window.confirm(`Are you sure you want to delete scheme "${schemeName}"?`)) {
      return;
    }
    try {
      await deleteScheme(id);
      setSchemes(prev => prev.filter(s => s._id !== id));
    } catch (error) {
      console.error('Error deleting scheme:', error);
      alert('Failed to delete scheme.');
    }
  };

  const handleDownload = async (schemeId) => {
    try {
      setViewLoading(schemeId);
      const fullScheme = await getSchemeById(schemeId);
      
      const base64Data = fullScheme.fileData;
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
      a.download = fullScheme.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      alert('Failed to download scheme.');
    } finally {
      setViewLoading(null);
    }
  };

  const handleView = async (schemeId) => {
    try {
      setViewLoading(schemeId);
      const fullScheme = await getSchemeById(schemeId);
      
      const base64Data = fullScheme.fileData;
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
      
      const win = window.open();
      if (win) {
        win.document.write(
          `<iframe src="${blobUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
        );
        win.document.title = fullScheme.name;
      } else {
        window.open(blobUrl, '_blank');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to view scheme.');
    } finally {
      setViewLoading(null);
    }
  };

  const filteredSchemes = schemes.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-container" style={{ maxWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 0 }}>Schemes</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Upload, manage, and view active sales schemes, dealer reward program structures, and campaign PDF documents.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="grid-mobile-stack">
        
        {/* Upload Card */}
        <div className="card" style={{ background: 'white' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileUp size={20} className="text-primary" />
            Upload New Scheme PDF
          </h2>
          
          <form onSubmit={handleUploadSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="grid-mobile-stack">
              <div className="form-group">
                <label>Scheme Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Monsoon Special Reward Scheme 2026"
                  required
                />
              </div>

              <div className="form-group">
                <label>Choose PDF File (Max 10MB)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="scheme-file-input"
                    type="file"
                    className="form-input"
                    onChange={handleFileChange}
                    accept=".pdf"
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
                ) : 'Upload Scheme PDF'}
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
                placeholder="Search schemes by name..."
              />
            </div>
          </div>

          {/* Schemes Listing */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="spinner" style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
              <div>Loading schemes...</div>
            </div>
          ) : filteredSchemes.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
              <FileText size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
              <h3>No schemes found</h3>
              <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                {searchQuery ? 'Try adjusting your search query.' : 'Upload your first scheme PDF document to begin.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {filteredSchemes.map((scheme) => {
                return (
                  <div 
                    key={scheme._id} 
                    className="card" 
                    style={{ 
                      background: 'white', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      borderLeft: '4px solid #2563eb' // Professional Blue color representing active Schemes
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
                          background: '#eff6ff',
                          color: '#2563eb'
                        }}>
                          <FileText size={22} />
                        </div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }} title={scheme.name}>
                            {scheme.name}
                          </h3>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {scheme.fileName}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>File Type:</span>
                          <span style={{ fontWeight: 600 }}>PDF Document</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Uploaded:</span>
                          <span style={{ fontWeight: 600 }}>{new Date(scheme.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleView(scheme._id)}
                        disabled={viewLoading === scheme._id}
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                      >
                        {viewLoading === scheme._id ? (
                          <RefreshCw size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Eye size={14} />
                        )}
                        View
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleDownload(scheme._id)}
                        disabled={viewLoading === scheme._id}
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                      >
                        {viewLoading === scheme._id ? (
                          <RefreshCw size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Download size={14} />
                        )}
                        Download
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleDelete(scheme._id, scheme.name)}
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

export default Schemes;
