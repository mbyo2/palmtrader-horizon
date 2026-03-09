
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import EnhancedErrorBoundary from './components/EnhancedErrorBoundary.tsx';
import { logError } from './utils/errorHandling.ts';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HelmetProvider } from 'react-helmet-async';
import { devConsole } from '@/utils/consoleCleanup';

// Inject axe-core in development mode only
if (process.env.NODE_ENV === 'development') {
  import('@axe-core/react').then(({ default: axe }) => {
    axe(React, ReactDOM, 1000);
    devConsole.log('Accessibility testing enabled with axe-core');
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <EnhancedErrorBoundary
        onError={(error) => {
          if (process.env.NODE_ENV === 'development') {
            devConsole.error("Root level error caught:", error);
          }
          logError(error, { componentStack: "Root level error" });
        }}
      >
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </EnhancedErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>,
);
