
import React, { Component, ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { logError } from "@/utils/errorHandling";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logError(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  }

  handleRefresh = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
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
                </div>
              )}
              <div className="flex gap-4">
                <Button variant="outline" onClick={this.handleRefresh} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh Page
                </Button>
                <Button onClick={this.handleReset}>Return to Home</Button>
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
