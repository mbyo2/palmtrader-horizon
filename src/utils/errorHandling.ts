
import { toast } from "sonner";

export const logError = (error: Error, info: { componentStack: string }) => {
  console.error("Caught error:", error, info);
  
  // Format stack trace for better readability
  const formattedStack = error.stack?.split('\n').map(line => line.trim()).join('\n');
  
  // Log additional details that might help with debugging
  console.group("Detailed Error Information");
  console.error("Error message:", error.message);
  console.error("Component stack:", info.componentStack);
  console.error("Error stack:", formattedStack);
  console.groupEnd();
  
  // Show user-friendly message based on error type
  if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
    toast.error("Network error. Please check your internet connection.");
  } else if (error.message.includes('rate limit') || error.message.includes('429')) {
    toast.error("API rate limit exceeded. Please wait a moment and try again.");
  } else if (error.message.includes('auth') || error.message.includes('unauthorized')) {
    toast.error("Authentication error. Please sign in again.");
  } else {
    toast.error("Something went wrong. Please try again.");
  }
};

export const handleRejection = (event: PromiseRejectionEvent) => {
  console.error("Unhandled Promise rejection:", event.reason);
  
  // Log detailed information about the rejection
  if (event.reason instanceof Error) {
    console.error("Rejection stack:", event.reason.stack);
    
    // Handle specific promise rejection types
    if (event.reason.message.includes('Failed to fetch')) {
      toast.error("Network error occurred. Please check your connection.");
    } else if (event.reason.message.includes('AbortError')) {
      // Don't show error for intentional request cancellations
      return;
    }
  }
  
  // Prevent the default handling for handled cases
  event.preventDefault();
};

export const setupGlobalErrorHandlers = () => {
  const handleError = (event: ErrorEvent) => {
    console.error("Global error:", event.error);
    
    // Log additional context that might be useful
    console.group("Global Error Details");
    console.error("Message:", event.message);
    console.error("Filename:", event.filename);
    console.error("Line number:", event.lineno);
    console.error("Column number:", event.colno);
    console.error("Error object:", event.error);
    console.groupEnd();
    
    // Don't show toast for script loading errors or syntax errors
    if (event.error instanceof SyntaxError || 
        event.message.includes('Script error') ||
        event.filename?.includes('extension')) {
      return;
    }
    
    toast.error("An unexpected error occurred. Please refresh the page.");
    event.preventDefault();
  };

  // Add event listeners for uncaught errors
  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleRejection);
  
  // Return a cleanup function
  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
  };
};

// Utility function to safely parse JSON with error handling
export const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return fallback;
  }
};

// Function to handle API response errors consistently
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unknown error occurred';
};

// Retry utility for failed operations
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: unknown;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (i === maxRetries) {
        break;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  
  throw lastError;
};
