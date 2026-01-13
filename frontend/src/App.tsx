/**
 * Main application component with modern sidebar layout.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { MarketConfigProvider } from './contexts/MarketConfigContext';
import { MarketOverview } from './pages/MarketOverview';
import { BrandProtection } from './pages/BrandProtection';
import { CategoryOpportunities } from './pages/CategoryOpportunities';

function App() {
  return (
    <MarketConfigProvider>
      <BrowserRouter>
        <div className="min-h-screen flex">
          {/* Sidebar Navigation */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1" style={{ marginLeft: '280px' }}>
            <main className="min-h-screen p-8">
              <ErrorBoundary>
                <Routes>
                  <Route path="/market-overview" element={<MarketOverview />} />
                  <Route path="/brand-protection" element={<BrandProtection />} />
                  <Route path="/category-opportunities" element={<CategoryOpportunities />} />
                  <Route path="/" element={<Navigate to="/market-overview" replace />} />
                </Routes>
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </MarketConfigProvider>
  );
}

export default App;
