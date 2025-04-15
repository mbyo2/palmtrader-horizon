
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { logError } from './utils/errorHandling.ts';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary
      onError={(error) => {
        console.error("Root level error caught:", error);
        logError(error, { componentStack: "Root level error" });
      }}
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
