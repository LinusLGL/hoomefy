import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { HauntedExperienceProvider } from './features/haunting/HauntedExperienceProvider';
import { bootstrapHaunting } from './features/haunting/bootstrap';
import './styles/globals.css';
import './styles/haunted.css';
import './styles/elegant.css';
import './styles/haunted-landing.css';
import './styles/haunted-holywater.css';
import './styles/haunted-ritual.css';

// Inject both palettes and set the persisted experience before the first paint,
// so there is never a flash of the wrong theme.
bootstrapHaunting();

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <HauntedExperienceProvider>
          <App />
        </HauntedExperienceProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
