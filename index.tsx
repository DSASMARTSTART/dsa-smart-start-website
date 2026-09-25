
import './index.css'; // Tailwind (build-time) + app base styles — replaces the CDN dev script
import { i18nReady } from './lib/i18n'; // i18n must be imported before React renders
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import { LiveLearningProvider } from './components/live-learning/LiveLearningContext';

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-black">
    <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// The HTML loading state remains visible while the two startup namespaces load.
// The backend bounds failed/stalled downloads and falls back to bundled English.
i18nReady.then(() => {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <LiveLearningProvider>
                <App />
              </LiveLearningProvider>
            </AuthProvider>
          </QueryClientProvider>
        </Suspense>
      </ErrorBoundary>
    </React.StrictMode>
  );
});
