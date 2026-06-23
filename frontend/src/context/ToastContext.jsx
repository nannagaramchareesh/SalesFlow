import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container overlay */}
      <div
        style={{
          position: 'fixed',
          top: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          pointerEvents: 'none',
          maxWidth: '350px',
          width: '100%'
        }}
      >
        {toasts.map((t) => {
          let bg, color, border, icon;
          if (t.type === 'success') {
            bg = 'rgba(240, 253, 244, 0.9)';
            color = '#15803d';
            border = '1px solid #bbf7d0';
            icon = '✅';
          } else if (t.type === 'error') {
            bg = 'rgba(254, 242, 242, 0.9)';
            color = '#b91c1c';
            border = '1px solid #fecaca';
            icon = '❌';
          } else if (t.type === 'warning') {
            bg = 'rgba(255, 251, 235, 0.9)';
            color = '#b45309';
            border = '1px solid #fde68a';
            icon = '⚠️';
          } else {
            bg = 'rgba(240, 249, 255, 0.9)';
            color = '#0369a1';
            border = '1px solid #bae6fd';
            icon = 'ℹ️';
          }

          return (
            <div
              key={t.id}
              style={{
                background: bg,
                color: color,
                border: border,
                padding: '0.85rem 1.25rem',
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                pointerEvents: 'auto',
                backdropFilter: 'blur(8px)',
                animation: 'toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{icon}</span>
              <div style={{ flex: 1, marginRight: '0.5rem' }}>{t.message}</div>
              <button
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  padding: 0,
                  opacity: 0.6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 'auto'
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toast-slide-in {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
