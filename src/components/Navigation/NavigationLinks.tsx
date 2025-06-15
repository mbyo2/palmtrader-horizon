import { Home, TrendingUp, PieChart, CreditCard, Shield, Settings, Building, Star, Bitcoin, Rocket, Globe } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface NavigationLinksProps {
  onItemClick: () => void;
}

export const NavigationLinks = ({ onItemClick }: NavigationLinksProps) => {
  const { user, accountDetails } = useAuth();
  const location = useLocation();

  const isAdmin = accountDetails?.role === 'admin';

  const navigationItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/markets", label: "Markets", icon: TrendingUp },
    ...(user ? [
      { to: "/portfolio", label: "Portfolio", icon: PieChart },
      { to: "/transfers", label: "Transfers", icon: CreditCard },
      { to: "/kyc", label: "KYC", icon: Shield },
      { to: "/banking", label: "Banking", icon: Building },
      { to: "/watchlist", label: "Watchlist", icon: Star },
      { to: "/crypto", label: "Crypto", icon: Bitcoin },
      { to: "/ipo", label: "IPO", icon: Rocket },
      { to: "/african-markets", label: "African Markets", icon: Globe },
    ] : []),
    ...(isAdmin ? [
      { to: "/admin", label: "Admin", icon: Settings },
    ] : []),
  ];

  return (
    <div className="flex flex-col space-y-1">
      {navigationItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onItemClick}
          className={({ isActive }) =>
            cn(
              "group flex items-center space-x-2 rounded-md p-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground",
              isActive
                ? "bg-secondary text-foreground"
                : "text-muted-foreground"
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
