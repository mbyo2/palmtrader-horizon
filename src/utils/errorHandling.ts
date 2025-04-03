
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
  
  // Log to your analytics service here
  // You could add code to send to a service like Sentry, LogRocket, etc.
  
  // Show user-friendly message
  toast.error("Something went wrong. Our team has been notified.");
};

export const handleRejection = (event: PromiseRejectionEvent) => {
  console.error("Unhandled Promise rejection:", event.reason);
  
  // Log detailed information about the rejection
  if (event.reason instanceof Error) {
    console.error("Rejection stack:", event.reason.stack);
  }
  
  // Add appropriate user feedback
  toast.error("An operation failed. Please try again.");
  
  // Prevent the default handling
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
    
    toast.error("Something went wrong. Please try refreshing the page.");
    
    // Only prevent default for errors we can handle
    if (event.error && !(event.error instanceof SyntaxError)) {
      event.preventDefault();
    }
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
  return 'An unknown error occurred';
};
