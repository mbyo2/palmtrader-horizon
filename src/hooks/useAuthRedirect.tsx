
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

export const useAuthRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleAuthRequired = (message: string = "Please sign in to continue") => {
    localStorage.setItem('redirectAfterLogin', location.pathname);
    navigate('/auth');
    toast({
      title: "Authentication required",
      description: message,
    });
  };

  return { handleAuthRequired };
};
