
import { toast } from "sonner";

export const logError = (error: Error, info: { componentStack: string }) => {
  console.error("Caught error:", error, info);
  
  // Log to your analytics service here
  
  // Show user-friendly message
  toast.error("Something went wrong. Our team has been notified.");
};

export const handleRejection = (event: PromiseRejectionEvent) => {
  console.error("Unhandled Promise rejection:", event.reason);
  
  // Add appropriate user feedback
  toast.error("An operation failed. Please try again.");
  
  // Prevent the default handling
  event.preventDefault();
};

export const setupGlobalErrorHandlers = () => {
  const handleError = (event: ErrorEvent) => {
    console.error("Global error:", event.error);
    toast.error("Something went wrong. Please try refreshing the page.");
    event.preventDefault();
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleRejection);
  
  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
  };
};
