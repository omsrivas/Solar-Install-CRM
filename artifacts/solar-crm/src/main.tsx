import { Component, type ReactNode, type ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { getAuthToken } from './lib/tokenStore';
import App from './App';
import './index.css';

// Wire Firebase token into every API request.
// AuthContext keeps this store current via onIdTokenChanged.
// The frontend always calls relative /api/* paths — each deployment platform
// (Replit dev-proxy, Vercel rewrite, Hostinger NGINX) owns its own /api proxy.
setAuthTokenGetter(getAuthToken);

// ── Global error boundary ─────────────────────────────────────────────────────
//
// Without this, any unhandled error thrown during React rendering (e.g.
// Firebase init failure, missing env var, broken import) silently unmounts
// the entire tree and leaves a completely blank/white page with no feedback.
// This boundary catches those errors and renders a minimal diagnostic screen.
interface ErrorBoundaryState { error: Error | null }

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to the browser console so developers can inspect it.
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '40px 24px',
          maxWidth: 600,
          margin: '80px auto',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
            Application failed to load
          </h1>
          <p style={{ color: '#475569', margin: '0 0 20px', fontSize: 14 }}>
            An error occurred during startup. Check the browser console for details.
          </p>
          <pre style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '12px 16px',
            textAlign: 'left',
            fontSize: 12,
            color: '#dc2626',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20,
              padding: '8px 24px',
              background: '#0f172a',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
