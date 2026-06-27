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
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <UIProvider>
        <DataProvider>
          <ConfirmProvider>
            <AppLayout>
              <AppInit />
              <Suspense fallback={<div className="p-6 text-center">Chargement...</div>}>
                <AppContent />
              </Suspense>
            </AppLayout>
          </ConfirmProvider>
        </DataProvider>
      </UIProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
