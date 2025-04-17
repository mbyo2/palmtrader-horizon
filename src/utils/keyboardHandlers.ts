
// Keyboard event handler types
export type KeyboardEventHandler = (event: KeyboardEvent) => void;

/**
 * Creates a keyboard event handler for the Escape key
 * @param callback Function to call when Escape key is pressed
 * @returns Event handler function
 */
export const createEscapeHandler = (callback: () => void): KeyboardEventHandler => {
  return (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      callback();
    }
  };
};

/**
 * Creates a keyboard event handler for the Enter or Space key
 * @param callback Function to call when Enter or Space key is pressed
 * @returns Event handler function
 */
export const createActivationHandler = (callback: () => void): KeyboardEventHandler => {
  return (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      // Prevent default space bar scrolling behavior
      if (event.key === ' ') {
        event.preventDefault();
      }
      callback();
    }
  };
};

/**
 * Creates a keyboard event handler for arrow keys
 * @param callbacks Object with functions for each arrow key
 * @returns Event handler function
 */
export const createArrowKeyHandler = (callbacks: {
  up?: () => void;
  down?: () => void;
  left?: () => void;
  right?: () => void;
}): KeyboardEventHandler => {
  return (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        if (callbacks.up) {
          event.preventDefault();
          callbacks.up();
        }
        break;
      case 'ArrowDown':
        if (callbacks.down) {
          event.preventDefault();
          callbacks.down();
        }
        break;
      case 'ArrowLeft':
        if (callbacks.left) {
          event.preventDefault();
          callbacks.left();
        }
        break;
      case 'ArrowRight':
        if (callbacks.right) {
          event.preventDefault();
          callbacks.right();
        }
        break;
    }
  };
};

/**
 * Hook to trap focus within a set of elements
 * @param containerId ID of the container element
 * @param active Whether the trap is active
 */
export const setupFocusTrap = (containerId: string, active: boolean): () => void => {
  if (!active) return () => {};
  
  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const focusableElements = container.querySelectorAll(
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
};
