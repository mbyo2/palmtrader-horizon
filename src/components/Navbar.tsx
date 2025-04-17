
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import CurrencySelector from "@/components/CurrencySelector";
import SearchBar from "@/components/Search/SearchBar";
import NotificationsIndicator from "@/components/Notifications/NotificationsIndicator";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { NavigationLinks } from "./Navigation/NavigationLinks";
import MobileNav from "./Navigation/MobileNav";
import UserMenu from "./Navigation/UserMenu";

const Navbar = () => {
  const { user, accountDetails, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [currency, setCurrency] = useState("USD");

  const getInitials = () => {
    if (!user) return "PC";
    
    if (user.user_metadata?.first_name && user.user_metadata?.last_name) {
      return `${user.user_metadata.first_name[0]}${user.user_metadata.last_name[0]}`;
    }
    
    return user.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 md:mr-6 flex">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-lg md:text-xl font-bold">PalmCacia</span>
          </Link>
        </div>
        
        {!isMobile ? (
          <div className="flex items-center justify-between flex-1 gap-4">
            <nav className="flex items-center space-x-2 lg:space-x-6">
              <NavigationLinks />
            </nav>
            
            <div className="flex flex-1 items-center justify-end space-x-2">
              <div className="hidden lg:block w-[200px]">
                <SearchBar />
              </div>
              <CurrencySelector value={currency} onChange={setCurrency} />
              {user && <NotificationsIndicator />}
              <ThemeToggle />
              <UserMenu user={user} signOut={signOut} getInitials={getInitials} />
            </div>
          </div>
        ) : (
          <MobileNav 
            user={user}
            signOut={signOut}
            accountDetails={accountDetails}
            getInitials={getInitials}
            currency={currency}
            setCurrency={setCurrency}
          />
        )}
      </div>
    </header>
  );
};

export default Navbar;
