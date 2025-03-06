import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import CurrencySelector from "@/components/CurrencySelector";
import SearchBar from "@/components/Search/SearchBar";
import NotificationsIndicator from "@/components/Notifications/NotificationsIndicator";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, X, User, Settings, LogOut } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const { user, accountDetails, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [currency, setCurrency] = useState("USD");

  const navLinks = [
    { to: "/markets", label: "Markets" },
    { to: "/crypto", label: "Crypto" },
    { to: "/portfolio", label: "Portfolio" },
    { to: "/watchlist", label: "Watchlist" },
    { to: "/ipo", label: "IPO" },
  ];

  const getInitials = () => {
    if (!user) return "BT";
    
    if (user.user_metadata?.first_name && user.user_metadata?.last_name) {
      return `${user.user_metadata.first_name[0]}${user.user_metadata.last_name[0]}`;
    }
    
    return user.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">BullTrade</span>
          </Link>
        </div>
        
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
              <CurrencySelector value={currency} onChange={setCurrency} />
              {user && <NotificationsIndicator />}
              <ThemeToggle />
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ""} />
                        <AvatarFallback>{getInitials()}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user.user_metadata?.full_name || user.email}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/portfolio" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>My Portfolio</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={signOut}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="default" size="sm" asChild>
                  <Link to="/auth">Login</Link>
                </Button>
              )}
            </div>
          </div>
        )}
        
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
                  
                  {user && (
                    <div className="flex items-center space-x-3 mb-6">
                      <Avatar>
                        <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ""} />
                        <AvatarFallback>{getInitials()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {user.user_metadata?.full_name || user.email?.split("@")[0]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {accountDetails?.role === "premium" ? "Premium Account" : "Basic Account"}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="my-4">
                    <SearchBar />
                  </div>
                  
                  <div className="my-2">
                    <CurrencySelector value={currency} onChange={setCurrency} />
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
                    
                    {user && (
                      <>
                        <div className="h-px bg-border my-2" />
                        <Link
                          to="/settings"
                          className="py-2 px-3 text-sm font-medium hover:bg-accent/50 rounded-md transition-colors flex items-center"
                          onClick={() => setIsOpen(false)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Account Settings
                        </Link>
                      </>
                    )}
                  </nav>
                  
                  <div className="mt-auto pt-4 border-t">
                    {user ? (
                      <Button variant="outline" className="w-full" onClick={() => {
                        signOut();
                        setIsOpen(false);
                      }}>
                        <LogOut className="h-4 w-4 mr-2" />
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
