
import { Home, TrendingUp, PieChart, CreditCard, Shield, Settings, Building, Star, Bitcoin, Rocket, Globe, User, Bell, HelpCircle } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface NavigationLinksProps {
  onItemClick: () => void;
}

export const NavigationLinks = ({ onItemClick }: NavigationLinksProps) => {
  const { user, accountDetails } = useAuth();

  const isAdmin = accountDetails?.role === 'admin';

  const navigationItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/markets", label: "Markets", icon: TrendingUp },
    ...(user ? [
      { to: "/portfolio", label: "Portfolio", icon: PieChart },
      { to: "/transfers", label: "Transfers", icon: CreditCard },
      { to: "/banking", label: "Banking", icon: Building },
      { to: "/watchlist", label: "Watchlist", icon: Star },
      { to: "/crypto", label: "Crypto", icon: Bitcoin },
      { to: "/ipo", label: "IPO", icon: Rocket },
      { to: "/african-markets", label: "African Markets", icon: Globe },
      { to: "/kyc", label: "KYC", icon: Shield },
      { to: "/account-settings", label: "Profile", icon: User },
      { to: "/settings", label: "Settings", icon: Settings },
    ] : []),
    ...(isAdmin ? [
      { to: "/admin", label: "Admin", icon: Settings },
    ] : []),
    { to: "/help", label: "Help", icon: HelpCircle },
  ];

  return (
    <div className="flex flex-col lg:flex-row space-y-1 lg:space-y-0 lg:space-x-1">
      {navigationItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onItemClick}
          className={({ isActive }) =>
            cn(
              "group flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-accent hover:text-accent-foreground",
              isActive
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )
          }
        >
          <item.icon className="h-4 w-4" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
};
