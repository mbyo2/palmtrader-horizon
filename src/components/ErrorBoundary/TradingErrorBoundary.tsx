import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

export class TradingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Trading component error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({ errorInfo });

    // Show user-friendly error message
    const errorMessage = this.getUserFriendlyErrorMessage(error);
    toast.error(errorMessage, {
      duration: 5000,
    });
  }

  getUserFriendlyErrorMessage(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Connection issue detected. Please check your internet connection.';
    }
    
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return 'Your session has expired. Please log in again.';
    }
    
    if (message.includes('insufficient') || message.includes('balance')) {
      return 'Insufficient funds for this transaction.';
    }
    
    if (message.includes('market') || message.includes('price')) {
      return 'Unable to fetch market data. Please try again.';
    }
    
    if (message.includes('order') || message.includes('trade')) {
      return 'Order processing failed. Your funds are safe.';
    }
    
    return 'An unexpected error occurred. Please try again.';
  }

  handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount >= 3) {
      toast.error('Maximum retry attempts reached. Please refresh the page.', {
        duration: 5000,
      });
      return;
    }

    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: retryCount + 1 
    });
    
    toast.success('Retrying...', { duration: 2000 });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, retryCount } = this.state;
      const canRetry = retryCount < 3;

      return (
        <Card className="w-full border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Trading Error
            </CardTitle>
            <CardDescription>
              {error ? this.getUserFriendlyErrorMessage(error) : 'An error occurred while processing your trading request.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {canRetry ? (
                <Button onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again {retryCount > 0 && `(${retryCount}/3)`}
                </Button>
              ) : (
                <Button onClick={this.handleRefresh} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh Page
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Go Back
              </Button>
            </div>
            
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Technical Details (Development Only)
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded-md overflow-auto text-xs">
                  {error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
