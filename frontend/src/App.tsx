/**
 * Main App Component
 * Wraps the application with all AI-native providers
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AIProvider } from './lib/ai-native/core/AIProvider';
import DynamicThemeProvider from './lib/ai-native/theme/DynamicThemeProvider';
import AccessibilityProvider from './lib/ai-native/accessibility/AccessibilityProvider';
import InternationalizationProvider from './lib/ai-native/i18n/InternationalizationProvider';

// Import pages
import Homepage from './pages/index';
import DashboardItems from './pages/dashboard/items';
import DashboardItemsV2 from './pages/dashboard/items-v2';
import DashboardSales from './pages/dashboard/sales';
import DashboardSettings from './pages/dashboard/settings';
import AIInteractionsDemo from './pages/ai-interactions-demo';
import MarketingHomepage from './pages/index-v3';

// Error Boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '50px', 
          textAlign: 'center',
          background: '#0A0E21',
          color: '#fff',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <h1 style={{ color: '#FF6B6B' }}>Something went wrong</h1>
          <p style={{ color: '#888', marginTop: '20px' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '30px',
              padding: '12px 24px',
              background: '#4870FF',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading Component
const LoadingScreen: React.FC = () => (
  <div style={{
    position: 'fixed',
    inset: 0,
    background: '#0A0E21',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  }}>
    <div style={{
      width: '60px',
      height: '60px',
      border: '3px solid rgba(72, 112, 255, 0.2)',
      borderTopColor: '#4870FF',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    }} />
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
    <p style={{ color: '#888', marginTop: '20px' }}>Loading AI Systems...</p>
  </div>
);

// App Component
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <React.Suspense fallback={<LoadingScreen />}>
        <InternationalizationProvider>
          <AccessibilityProvider>
            <AIProvider>
              <DynamicThemeProvider>
                <Router>
                  <Routes>
                    {/* Main Homepage */}
                    <Route path="/" element={<Homepage />} />
                    
                    {/* Dashboard Routes */}
                    <Route path="/dashboard">
                      <Route path="items" element={<DashboardItems />} />
                      <Route path="items-v2" element={<DashboardItemsV2 />} />
                      <Route path="sales" element={<DashboardSales />} />
                      <Route path="settings" element={<DashboardSettings />} />
                    </Route>
                    
                    {/* Demo Pages */}
                    <Route path="/demo/interactions" element={<AIInteractionsDemo />} />
                    <Route path="/marketing" element={<MarketingHomepage />} />
                    
                    {/* 404 Page */}
                    <Route
                      path="*"
                      element={
                        <div style={{
                          minHeight: '100vh',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#0A0E21',
                          color: '#fff',
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <h1 style={{ 
                              fontSize: '120px', 
                              margin: 0,
                              background: 'linear-gradient(135deg, #4870FF 0%, #00F6FF 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                            }}>
                              404
                            </h1>
                            <p style={{ fontSize: '24px', margin: '20px 0' }}>
                              Page not found
                            </p>
                            <a
                              href="/"
                              style={{
                                display: 'inline-block',
                                padding: '12px 24px',
                                background: '#4870FF',
                                color: '#fff',
                                textDecoration: 'none',
                                borderRadius: '8px',
                                marginTop: '20px',
                              }}
                            >
                              Go Home
                            </a>
                          </div>
                        </div>
                      }
                    />
                  </Routes>
                </Router>
              </DynamicThemeProvider>
            </AIProvider>
          </AccessibilityProvider>
        </InternationalizationProvider>
      </React.Suspense>
    </ErrorBoundary>
  );
};

export default App;