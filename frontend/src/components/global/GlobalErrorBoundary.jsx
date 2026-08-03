import React from 'react';
import { logger } from '../../utils/logger';

/**
 * GlobalErrorBoundary
 *
 * Triggered when:
 *   - Any React component in the subtree throws an unhandled JS error during render,
 *     lifecycle methods, or constructor.
 *
 * Usage: Wrap <Providers /> in index.jsx at the root level.
 * Uses branded fallback UI matching the landing design system without importing
 * router-dependent components (safe for use above RouterProvider).
 */
export default class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    logger.error('[GlobalErrorBoundary] Unhandled render error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleClearAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch { /* storage access denied */ }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error } = this.state;
    const isDev = import.meta.env.DEV;

    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 50%, #f0f9ff 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* Ambient background blur blobs */}
        <div style={{
          position: 'fixed', top: '-20%', left: '-10%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'rgba(37,99,235,0.06)', filter: 'blur(80px)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'fixed', bottom: '-20%', right: '-10%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'rgba(8,179,197,0.06)', filter: 'blur(80px)',
          pointerEvents: 'none',
        }} />

        <div style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(226,232,240,0.8)',
          boxShadow: '0 20px 50px -12px rgba(37,99,235,0.12)',
          borderRadius: '24px',
          padding: '40px 36px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          position: 'relative',
          zIndex: 10,
        }}>
          {/* Logo */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              background: 'white',
              border: '1px solid rgba(226,232,240,0.8)',
              borderRadius: '16px', padding: '8px 16px',
              boxShadow: '0 4px 15px rgba(37,99,235,0.08)',
            }}>
              <img
                src="/nearby_locator_standalone_icon.png"
                alt="Nearby Locator"
                style={{ width: '28px', height: '28px', objectFit: 'contain' }}
              />
              <span style={{
                color: '#0f172a', fontSize: '15px', fontWeight: 800,
                letterSpacing: '-0.02em', fontFamily: "'Geist', sans-serif",
              }}>
                Nearby <span style={{ color: '#2563eb' }}>Locator</span>
              </span>
            </div>
          </div>

          {/* Error icon */}
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: '#fff1f2', border: '1px solid #fecdd3',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 4px 16px rgba(225,29,72,0.12)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: '22px', fontWeight: 700, color: '#0f172a',
            fontFamily: "'Geist', sans-serif", letterSpacing: '-0.02em',
            marginBottom: '10px',
          }}>
            Something went wrong
          </h1>
          <p style={{
            fontSize: '14px', color: '#475569', lineHeight: 1.6,
            marginBottom: '24px', maxWidth: '360px', margin: '0 auto 24px',
          }}>
            An unexpected error occurred in the application. Your data is safe.
            Reloading the page usually resolves this.
          </p>

          {/* Dev error details */}
          {isDev && error && (
            <div style={{
              background: '#fff1f2', border: '1px solid #fecdd3',
              borderRadius: '16px', padding: '14px', marginBottom: '24px',
              textAlign: 'left', fontSize: '11px', color: '#9f1239',
              fontFamily: 'monospace', wordBreak: 'break-all', maxHeight: '120px',
              overflowY: 'auto',
            }}>
              <strong>DEV:</strong> {error.toString()}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={this.handleReload}
              style={{
                height: '48px', width: '100%', borderRadius: '12px', border: 'none',
                background: '#2563eb',
                color: 'white', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer', display: 'flex', itemsCenter: 'center',
                justifyContent: 'center', gap: '8px',
                boxShadow: '0 8px 20px -6px rgba(37,99,235,0.4)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1d4ed8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#2563eb'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
              </svg>
              Reload Application
            </button>

            <button
              onClick={this.handleGoHome}
              style={{
                height: '44px', width: '100%', borderRadius: '12px',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                color: '#334155', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
            >
              Return to Home
            </button>

            <button
              onClick={this.handleClearAndReload}
              style={{
                background: 'none', border: 'none', color: '#64748b',
                fontSize: '12px', cursor: 'pointer', padding: '4px',
                textDecoration: 'underline', fontFamily: 'inherit',
              }}
            >
              Clear cache &amp; reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
