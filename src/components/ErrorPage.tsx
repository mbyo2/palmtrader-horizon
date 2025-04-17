
import React from 'react';
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCw, Home, ArrowLeft } from "lucide-react";

interface ErrorPageProps {
  statusCode?: number;
  title?: string;
  description?: string;
  error?: Error;
  resetErrorBoundary?: () => void;
}

const ErrorPage: React.FC<ErrorPageProps> = ({
  statusCode = 500,
  title = "Something went wrong",
  description = "We're sorry, but we couldn't process your request. Our team has been notified.",
  error,
  resetErrorBoundary,
}) => {
  const navigate = useNavigate();

  // Determine appropriate imagery based on status code
  const getErrorImage = () => {
    switch (statusCode) {
      case 404:
        return <div className="text-9xl font-bold text-primary/20" aria-hidden="true">404</div>;
      case 403:
        return <div className="text-9xl font-bold text-primary/20" aria-hidden="true">403</div>;
      default:
        return <div className="text-9xl font-bold text-primary/20" aria-hidden="true">500</div>;
    }
  };

  return (
    <div className="container max-w-3xl py-20 mx-auto text-center" role="alert" aria-live="assertive">
      <Card className="p-8 shadow-lg">
        <div className="mb-8" aria-hidden="true">
          {getErrorImage()}
        </div>
        
        <h1 className="text-4xl font-bold mb-4" tabIndex={-1}>
          {title}
        </h1>
        
        <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
          {description}
        </p>
        
        {error && process.env.NODE_ENV === 'development' && (
          <details className="mb-6 text-left mx-auto max-w-lg bg-muted p-4 rounded-md">
            <summary className="cursor-pointer font-medium mb-2">
              Technical Details
            </summary>
            <p className="text-sm overflow-auto whitespace-pre-wrap p-2 bg-background rounded">
              {error.message}
            </p>
            {error.stack && (
              <pre className="text-xs mt-2 overflow-auto p-2 bg-background rounded max-h-40">
                {error.stack}
              </pre>
            )}
          </details>
        )}
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {resetErrorBoundary && (
            <Button 
              onClick={resetErrorBoundary} 
              variant="default" 
              className="gap-2"
              aria-label="Try again"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          
          <Button 
            onClick={() => navigate(-1)} 
            variant="outline" 
            className="gap-2"
            aria-label="Go back to previous page"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          
          <Button 
            onClick={() => navigate("/")} 
            variant="secondary" 
            className="gap-2"
            aria-label="Return to home page"
          >
            <Home className="h-4 w-4" />
            Return to Home
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ErrorPage;
