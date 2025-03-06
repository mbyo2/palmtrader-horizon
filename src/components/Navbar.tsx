
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import CurrencySelector from "@/components/CurrencySelector";
import SearchBar from "@/components/Search/SearchBar";
import NotificationsIndicator from "@/components/Notifications/NotificationsIndicator";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { to: "/markets", label: "Markets" },
    { to: "/crypto", label: "Crypto" },
    { to: "/portfolio", label: "Portfolio" },
    { to: "/watchlist", label: "Watchlist" },
    { to: "/ipo", label: "IPO" },
  ];

  return (
    <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">BullTrade</span>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        {!isMobile && (
          <div className="flex items-center justify-between flex-1 gap-4">
            <nav className="flex items-center space-x-4 lg:space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            
            <div className="flex flex-1 items-center justify-end space-x-2">
              <SearchBar />
              <CurrencySelector />
              {user && <NotificationsIndicator />}
              <ThemeToggle />
              {user ? (
                <Button variant="outline" size="sm" onClick={signOut}>
                  Logout
                </Button>
              ) : (
                <Button variant="default" size="sm" asChild>
                  <Link to="/auth">Login</Link>
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* Mobile Navigation */}
        {isMobile && (
          <div className="flex flex-1 items-center justify-end space-x-2">
            {user && <NotificationsIndicator />}
            <ThemeToggle />
            
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 ml-1">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full max-w-[250px] sm:max-w-[300px]">
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-lg font-bold">BullTrade</span>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <div className="my-4">
                    <SearchBar />
                  </div>
                  
                  <div className="my-2">
                    <CurrencySelector />
                  </div>
                  
                  <nav className="flex flex-col space-y-3 mt-4">
                    {navLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="py-2 px-3 text-sm font-medium hover:bg-accent/50 rounded-md transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                  
                  <div className="mt-auto pt-4 border-t">
                    {user ? (
                      <Button variant="outline" className="w-full" onClick={() => {
                        signOut();
                        setIsOpen(false);
                      }}>
                        Logout
                      </Button>
                    ) : (
                      <Button variant="default" className="w-full" asChild onClick={() => setIsOpen(false)}>
                        <Link to="/auth">Login</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
