
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SearchBar from "@/components/Search/SearchBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import NotificationsIndicator from "@/components/Notifications/NotificationsIndicator";
import CurrencySelector from "@/components/CurrencySelector";
import { Settings, LogOut } from "lucide-react";
import { useState } from "react";
import { NavigationLinks } from "./NavigationLinks";

interface MobileNavProps {
  user: any;
  signOut: () => void;
  accountDetails: any;
  getInitials: () => string;
  currency: string;
  setCurrency: (value: string) => void;
}

const MobileNav = ({ user, signOut, accountDetails, getInitials, currency, setCurrency }: MobileNavProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-1 items-center justify-end space-x-2">
      <div className="flex-1 max-w-[160px]">
        <SearchBar />
      </div>
      {user && <NotificationsIndicator />}
      <ThemeToggle />
      
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full max-w-[250px] sm:max-w-[300px]">
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-bold">PalmCacia</span>
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
              <NavigationLinks onClick={() => setIsOpen(false)} />
              
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
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => {
                    signOut();
                    setIsOpen(false);
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Logout</span>
                </Button>
              ) : (
                <Button variant="default" className="w-full" asChild>
                  <Link to="/auth" onClick={() => setIsOpen(false)}>Login</Link>
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileNav;
