/**
 * Main application component with modern sidebar layout.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './components/layout/Sidebar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { MarketConfigProvider } from './contexts/MarketConfigContext';
import { Home } from './pages/Home';
import { MarketOverview } from './pages/MarketOverview';
import { BrandProtection } from './pages/BrandProtection';
import { CategoryOpportunities } from './pages/CategoryOpportunities';
import { Config } from './pages/Config';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export { queryClient };

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <MarketConfigProvider>
      <BrowserRouter>
        <div className="min-h-screen flex bg-white">
          {/* Sidebar Navigation */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1" style={{ marginLeft: '240px' }}>
            <main className="min-h-screen p-8">
              <ErrorBoundary>
                <Routes>
                  {/* HOME */}
                  <Route path="/" element={<Home />} />

                  {/* PROTECT - Brand Defense */}
                  <Route path="/protect" element={<BrandProtection />} />

                  {/* DISCOVER - Opportunities */}
                  <Route path="/discover" element={<CategoryOpportunities />} />

                  {/* ANALYZE - Market Intelligence */}
                  <Route path="/analyze" element={<MarketOverview />} />

                  {/* CONFIGURE */}
                  <Route path="/config" element={<Config />} />

                  {/* Legacy redirects for bookmarks */}
                  <Route path="/market-overview" element={<Navigate to="/analyze" replace />} />
                  <Route path="/brand-protection" element={<Navigate to="/protect" replace />} />
                  <Route path="/category-opportunities" element={<Navigate to="/discover" replace />} />
                </Routes>
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </MarketConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
