
import React, { Component, ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { logError } from "@/utils/errorHandling";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, componentStack: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ componentStack: errorInfo.componentStack });
    
    // Call the onError prop if provided
    if (this.props.onError) {
      this.props.onError(error);
    }
    
    logError(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, componentStack: null });
    window.location.href = "/";
  }

  handleRefresh = (): void => {
    this.setState({ hasError: false, error: null, componentStack: null });
    window.location.reload();
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default fallback UI
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-lg border p-8 shadow-sm bg-background">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 rounded-full bg-destructive/10 p-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="mb-2 text-2xl font-bold">Something went wrong</h2>
              <p className="mb-6 text-muted-foreground">
                An unexpected error occurred. Our team has been notified.
              </p>
              {this.state.error && (
                <div className="mb-6 w-full rounded-md bg-muted p-4 overflow-auto text-left">
                  <code className="text-sm">{this.state.error.toString()}</code>
                  {this.state.componentStack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-muted-foreground">Stack trace</summary>
                      <pre className="mt-2 text-xs overflow-auto max-h-40">
                        {this.state.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              <div className="flex gap-4">
                <Button variant="outline" onClick={this.handleRefresh} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh Page
                </Button>
                <Button onClick={this.handleReset} className="gap-2">
                  <Home className="h-4 w-4" />
                  Return to Home
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
