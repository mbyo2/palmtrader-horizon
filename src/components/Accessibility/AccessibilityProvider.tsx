
import React, { createContext, useContext, useRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface AccessibilityContextType {
  focusMainContent: () => void;
  setFocusTrap: (enabled: boolean) => void;
  isFocusTrapEnabled: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mainContentRef = useRef<HTMLElement | null>(null);
  const [isFocusTrapEnabled, setIsFocusTrapEnabled] = useState(false);
  const location = useLocation();

  // Find and set the main content element reference
  useEffect(() => {
    mainContentRef.current = document.querySelector('main');
  }, []);

  // Focus management for route changes
  useEffect(() => {
    // When route changes, focus on the main content
    focusMainContent();
    
    // Announce page change to screen readers
    const pageTitle = document.title;
    const announcer = document.getElementById('route-announcer');
    
    if (announcer) {
      announcer.textContent = `Navigated to ${pageTitle}`;
    }
  }, [location.pathname]);

  // Focus trap handling for modals and dialogs
  useEffect(() => {
    if (!isFocusTrapEnabled) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      // Focus trap logic would go here
      // This is a simplified implementation
      const focusableElements = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isFocusTrapEnabled]);

  const focusMainContent = () => {
    if (mainContentRef.current) {
      // Set tabindex to make it focusable if not already
      if (!mainContentRef.current.hasAttribute('tabindex')) {
        mainContentRef.current.setAttribute('tabindex', '-1');
      }
      
      // Focus the element without visual indication
      mainContentRef.current.focus({ preventScroll: false });
    }
  };

  return (
    <AccessibilityContext.Provider 
      value={{ 
        focusMainContent, 
        setFocusTrap: setIsFocusTrapEnabled,
        isFocusTrapEnabled
      }}
    >
      {/* Hidden element for screen readers to announce route changes */}
      <div 
        id="route-announcer" 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
      />
      
      {/* Skip to main content link */}
      <a 
        href="#main" 
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground focus:top-0 focus:left-0 focus:outline-primary" 
        onClick={(e) => {
          e.preventDefault();
          focusMainContent();
        }}
      >
        Skip to main content
      </a>
      
      {children}
    </AccessibilityContext.Provider>
  );
};

export default AccessibilityProvider;
