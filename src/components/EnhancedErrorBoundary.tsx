
import React, { Component, ErrorInfo, ReactNode } from 'react';
import ErrorPage from './ErrorPage';
import { logError } from '../utils/errorHandling';

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

class EnhancedErrorBoundary extends Component<Props, State> {
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
    } else {
      // Default error handling
      logError(error, { 
        componentStack: errorInfo.componentStack || 'No component stack available'
      });
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Check if a custom fallback was provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Use our enhanced ErrorPage component as the default fallback
      return (
        <ErrorPage 
          statusCode={500}
          title="Something went wrong"
          description="We're sorry, but we encountered an error. Our team has been notified."
          error={this.state.error || undefined}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;
