import React, { Suspense, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import { UIProvider } from './context/UIContext';
import { DataProvider } from './context/DataContext';
import { ConfirmProvider } from './context/ConfirmContext';
import AppContent from './pages/AppContent';
import { useAuthStore } from './stores/useAuthStore';
import { useCurrencyStore } from './stores/useCurrencyStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { ErrorBoundaryFallback } from './components/ErrorBoundaryFallback';

const queryClient = new QueryClient();

// Root-level effect component — runs once on mount, outside any provider
const AppInit = () => {
  const initSession = useAuthStore((s) => s.initSession);
  const fetchRatesIfStale = useCurrencyStore((s) => s.fetchRatesIfStale);

  useEffect(() => {
    initSession();
    fetchRatesIfStale();
  }, []);

  return null;
};

const App = () => (
  <Sentry.ErrorBoundary
    fallback={({ error, resetError }) => (
      <ErrorBoundaryFallback error={error as Error} resetError={resetError} />
    )}
  >
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <UIProvider>
          <DataProvider>
            <ConfirmProvider>
              <AppLayout>
                <AppInit />
                <Suspense fallback={<div className="p-6 text-center">Chargement...</div>}>
                  {import.meta.env.DEV && (
                    <button
                       type="button"
                       onClick={() => { throw new Error("Test Sentry Frontend Component Crash"); }}
                       style={{ position: 'fixed', bottom: '10px', left: '10px', zIndex: 99999, padding: '6px 12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                     >
                       Trigger Dev Error
                     </button>
                  )}
                  <AppContent />
                </Suspense>
              </AppLayout>
            </ConfirmProvider>
          </DataProvider>
        </UIProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </Sentry.ErrorBoundary>
);

export default App;
