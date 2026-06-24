import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from './App.jsx';
import { initAuthListener } from './lib/firebase.js';
import './styles/tokens.css';
import './styles/components.css';

// Start Firebase auth listener before first render so authStore.status is
// resolved as quickly as possible (avoids a flash of the loading state).
initAuthListener();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time of 60 s — avoids refetching on every tab focus during dev
      staleTime: 60_000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
