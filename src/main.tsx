
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { TooltipProvider } from './components/ui/tooltip';

// Set up error tracking for rendering errors
const handleRenderError = (error: Error) => {
  console.error('Render error caught:', error);
  // This could report to an error tracking service in production
};

// Render with StrictMode to catch potential issues
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <React.ErrorBoundary fallback={
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Fatal Application Error</h2>
        <p>The application couldn't start properly. Please try refreshing the page.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Refresh Page
        </button>
      </div>
    }
    onError={handleRenderError}>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </React.ErrorBoundary>
  </React.StrictMode>
);

// Register service worker - moved after render to prioritize UI
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful:', registration.scope);
      })
      .catch(error => {
        console.error('ServiceWorker registration failed:', error);
      });
  });
}
