
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import EnhancedErrorBoundary from './components/EnhancedErrorBoundary.tsx';
import { logError } from './utils/errorHandling.ts';
import { TooltipProvider } from '@/components/ui/tooltip';

// Inject axe-core in development mode only
if (process.env.NODE_ENV === 'development') {
  // Dynamic import to not include in production
  import('@axe-core/react').then(({ default: axe }) => {
    axe(React, ReactDOM, 1000);
    // Only log in development
    console.log('Accessibility testing enabled with axe-core');
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EnhancedErrorBoundary
      onError={(error) => {
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.error("Root level error caught:", error);
        }
        logError(error, { componentStack: "Root level error" });
      }}
    >
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </EnhancedErrorBoundary>
  </React.StrictMode>,
);
