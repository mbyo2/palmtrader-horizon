
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();
  
  return (
    <div className="container max-w-3xl py-20 mx-auto text-center">
      <div className="mb-8">
        <div className="text-9xl font-bold text-primary/20">404</div>
      </div>
      
      <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
      <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
        The page you are looking for doesn't exist or has been moved to another URL.
      </p>
      
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Button onClick={() => navigate(-1)} variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>
        <Button onClick={() => navigate("/")} className="gap-2">
          <Home className="h-4 w-4" />
          Return to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
