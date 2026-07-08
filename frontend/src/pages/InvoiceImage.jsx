import { useState, useEffect } from 'react';
import { getInvoices, updateInvoice } from '../utils/api';
import { Search, Filter } from 'lucide-react';

const InvoiceImage = () => {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  // Filter and search states
  const [dealerFilter, setDealerFilter] = useState('');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await getInvoices();
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedInvoice = invoices.find(inv => inv._id === selectedInvoiceId);

  // Derive unique list of dealers for filtering
  const uniqueDealers = [...new Set(invoices.map(inv => inv.dealerName))].filter(Boolean).sort();

  // Filter invoices based on selected dealer and search query
  const filteredInvoices = invoices.filter(inv => {
    const matchesDealer = !dealerFilter || inv.dealerName === dealerFilter;
    const invoiceNumStr = inv.invoiceNumber ? String(inv.invoiceNumber) : '';
    const matchesSearch = !invoiceSearchQuery || 
      invoiceNumStr.toLowerCase().includes(invoiceSearchQuery.toLowerCase());
    return matchesDealer && matchesSearch;
  });

  // Set image preview when selected invoice changes
  useEffect(() => {
    if (selectedInvoice) {
      setImagePreview(selectedInvoice.invoiceImage || null);
    } else {
      setImagePreview(null);
    }
  }, [selectedInvoiceId, invoices]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSaving(true);
    try {
      const base64Image = await compressImage(file);
      setImagePreview(base64Image);
    } catch (error) {
      alert('Error processing image. Please try again.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
 
          // Limit resolution to maximum 1000px width/height to keep database payload small
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 1000;
 
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
 
          canvas.width = width;
          canvas.height = height;
 
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
 
          // Return compressed JPEG data URI
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedDataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleSaveImage = async () => {
    if (!selectedInvoiceId) return;
    setSaving(true);
    try {
      await updateInvoice(selectedInvoiceId, { invoiceImage: imagePreview });
      alert('Invoice copy saved successfully!');
      loadInvoices();
    } catch (error) {
      alert('Failed to save image: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!selectedInvoiceId) return;
    if (window.confirm('Are you sure you want to delete the attached image?')) {
      setSaving(true);
      try {
        await updateInvoice(selectedInvoiceId, { invoiceImage: null });
        setImagePreview(null);
        alert('Invoice copy deleted successfully!');
        loadInvoices();
      } catch (error) {
        alert('Failed to delete image: ' + error.message);
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">Invoice Hard Copy Attachment</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        <div className="card">
          <h2 style={{ marginBottom: '1.25rem', fontSize: '1.125rem' }}>Step 1: Select Invoice Number</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Filter size={14} /> Filter by Dealer
              </label>
              <select
                value={dealerFilter}
                onChange={(e) => {
                  setDealerFilter(e.target.value);
                  setSelectedInvoiceId('');
                }}
                className="form-input"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer' }}
              >
                <option value="">-- All Dealers --</option>
                {uniqueDealers.map((dealer) => (
                  <option key={dealer} value={dealer}>
                    {dealer}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Search size={14} /> Search Invoice Number
              </label>
              <input
                type="text"
                placeholder="Type invoice no..."
                value={invoiceSearchQuery}
                onChange={(e) => {
                  setInvoiceSearchQuery(e.target.value);
                  setSelectedInvoiceId('');
                }}
                className="form-input"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
              Choose Invoice to Attach Image
            </label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="form-input"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer' }}
            >
              <option value="">
                {filteredInvoices.length === 0 ? 'No invoices found' : '-- Choose Invoice --'}
              </option>
              {filteredInvoices.map((inv) => (
                <option key={inv._id} value={inv._id}>
                  {inv.invoiceNumber} | {inv.dealerName} (₹{(inv.invoiceValue || 0).toLocaleString()})
                </option>
              ))}
            </select>
            {(dealerFilter || invoiceSearchQuery) && (
              <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Found {filteredInvoices.length} matching {filteredInvoices.length === 1 ? 'invoice' : 'invoices'}
                </span>
                <button
                  onClick={() => {
                    setDealerFilter('');
                    setInvoiceSearchQuery('');
                    setSelectedInvoiceId('');
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px' }}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {selectedInvoice && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {/* Invoice details */}
            <div className="card" style={{ height: 'fit-content' }}>
              <h2 style={{ marginBottom: '1.25rem', fontSize: '1.125rem' }}>Invoice Details</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Invoice No:</span>
                  <strong style={{ fontSize: '0.9rem' }}>{selectedInvoice.invoiceNumber}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Brand:</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedInvoice.brand || 'No Brand'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Dealer Name:</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedInvoice.dealerName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Invoice Date:</span>
                  <span style={{ fontSize: '0.9rem' }}>{new Date(selectedInvoice.dateOfInvoice || selectedInvoice.date).toLocaleDateString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Value:</span>
                  <strong style={{ fontSize: '1rem', color: 'var(--primary-color)' }}>₹{(selectedInvoice.invoiceValue || 0).toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* Image attachment box */}
            <div className="card">
              <h2 style={{ marginBottom: '1.25rem', fontSize: '1.125rem' }}>Step 2: Take or Upload Image</h2>
              
              {!imagePreview ? (
                <div 
                  style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: '8px',
                    padding: '3rem 1rem',
                    textAlign: 'center',
                    background: '#f8fafc',
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                >
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    onChange={handleImageChange}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📷</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    Take Photo of Hard Copy
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    or click to choose image from files
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div 
                    onClick={() => setIsZoomed(true)}
                    style={{ 
                      position: 'relative', 
                      borderRadius: '8px', 
                      overflow: 'hidden', 
                      border: '1px solid var(--border-color)',
                      maxHeight: '300px',
                      cursor: 'zoom-in',
                      background: '#f1f5f9',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <img 
                      src={imagePreview} 
                      alt="Invoice hard copy" 
                      style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
                    />
                    <div 
                      style={{ 
                        position: 'absolute', 
                        bottom: '0.5rem', 
                        right: '0.5rem', 
                        background: 'rgba(15, 23, 42, 0.75)', 
                        color: 'white', 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 500
                      }}
                    >
                      🔍 Click to Zoom
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={handleImageChange}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0,
                          cursor: 'pointer'
                        }}
                      />
                      <button className="btn" style={{ width: '100%', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}>
                        Retake Photo
                      </button>
                    </div>

                    <button 
                      onClick={handleSaveImage} 
                      className="btn btn-primary" 
                      disabled={saving}
                      style={{ flex: 1 }}
                    >
                      {saving ? 'Saving...' : 'Save Attachment'}
                    </button>

                    {selectedInvoice.invoiceImage && (
                      <button 
                        onClick={handleDeleteImage} 
                        className="btn" 
                        disabled={saving}
                        style={{ background: '#fee2e2', color: '#b91c1c' }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full-Screen Zoom Modal */}
      {isZoomed && (
        <div 
          onClick={() => setIsZoomed(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.9)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'zoom-out',
            padding: '2rem'
          }}
        >
          <img 
            src={imagePreview} 
            alt="Invoice hard copy Zoomed" 
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
          />
          <button 
            onClick={() => setIsZoomed(false)}
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '1.5rem',
              background: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              fontSize: '1.25rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default InvoiceImage;
