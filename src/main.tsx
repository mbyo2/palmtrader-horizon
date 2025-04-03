
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Basic render without StrictMode to avoid double-rendering issues
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

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
