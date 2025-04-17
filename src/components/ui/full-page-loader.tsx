
import { LoadingSpinner } from "./loading-spinner";

export function FullPageLoader() {
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="alert"
      aria-busy="true"
    >
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-lg text-muted-foreground animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}
