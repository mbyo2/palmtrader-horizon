import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";

const Navbar = () => {
  const isMobile = useIsMobile();

  return (
    <nav className="bg-background border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
                PalmCacia
              </span>
            </Link>
          </div>
          <div className="flex items-center space-x-4 sm:space-x-6">
            {!isMobile && (
              <>
                <Link 
                  to="/markets" 
                  className="text-foreground hover:text-primary transition-colors duration-200 font-medium"
                >
                  Markets
                </Link>
                <Link 
                  to="/watchlist" 
                  className="text-foreground hover:text-primary transition-colors duration-200 font-medium"
                >
                  Watchlist
                </Link>
                <Link 
                  to="/login" 
                  className="text-foreground hover:text-primary transition-colors duration-200 font-medium"
                >
                  Login
                </Link>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;