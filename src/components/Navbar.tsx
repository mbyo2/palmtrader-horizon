import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";

const Navbar = () => {
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-background/80 border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-foreground">
                PalmCacia
              </span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {!isMobile ? (
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
                  to="/portfolio" 
                  className="text-foreground hover:text-primary transition-colors duration-200 font-medium"
                >
                  Portfolio
                </Link>
                <Link 
                  to="/login" 
                  className="text-foreground hover:text-primary transition-colors duration-200 font-medium"
                >
                  Login
                </Link>
              </>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="mr-2"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMobile && isMenuOpen && (
          <div className="px-2 pt-2 pb-3 space-y-1 bg-background/95 backdrop-blur-sm">
            <Link 
              to="/markets" 
              className="block px-3 py-2 rounded-md text-foreground hover:text-primary transition-colors duration-200"
            >
              Markets
            </Link>
            <Link 
              to="/watchlist" 
              className="block px-3 py-2 rounded-md text-foreground hover:text-primary transition-colors duration-200"
            >
              Watchlist
            </Link>
            <Link 
              to="/portfolio" 
              className="block px-3 py-2 rounded-md text-foreground hover:text-primary transition-colors duration-200"
            >
              Portfolio
            </Link>
            <Link 
              to="/login" 
              className="block px-3 py-2 rounded-md text-foreground hover:text-primary transition-colors duration-200"
            >
              Login
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;