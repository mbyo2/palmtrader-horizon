
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      errorInfo
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      // Ensure componentStack is provided, with a fallback to errorInfo.componentStack if null
      this.props.onError(error, { 
        componentStack: errorInfo.componentStack || 'No component stack available'
      });
    }

    // Log the error to the console
    console.error('Error caught by ErrorBoundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Check if a custom fallback was provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="p-4 border border-red-500 rounded-md bg-red-50 text-red-800">
          <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
          <details className="whitespace-pre-wrap">
            <summary className="cursor-pointer text-sm font-medium mb-1">Click to see more details</summary>
            <p className="text-sm overflow-auto p-2 bg-red-100 rounded">{this.state.error?.toString()}</p>
            {this.state.errorInfo && (
              <pre className="text-xs mt-2 overflow-auto p-2 bg-red-100 rounded max-h-40">
                {this.state.errorInfo.componentStack}
              </pre>
            )}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
