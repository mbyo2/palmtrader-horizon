
import { Home, TrendingUp, PieChart, CreditCard, Shield, Settings, Building, Star, Bitcoin, Rocket, Globe, User, HelpCircle, Wallet, BarChart3, ChevronDown } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavigationLinksProps {
  onItemClick: () => void;
}

const NavigationLinks = ({ onItemClick }: NavigationLinksProps) => {
  const { user, isAdmin } = useAuth();

  // Primary items always visible in desktop nav
  const primaryItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/markets", label: "Markets", icon: TrendingUp },
    { to: "/research", label: "Research", icon: BarChart3 },
    ...(user ? [
      { to: "/portfolio", label: "Portfolio", icon: PieChart },
      { to: "/crypto", label: "Crypto", icon: Bitcoin },
      { to: "/exchange", label: "Exchange", icon: Wallet },
    ] : []),
  ];

  // Secondary items shown in "More" dropdown on desktop, inline on mobile
  const secondaryItems = user ? [
    { to: "/transfers", label: "Transfers", icon: CreditCard },
    { to: "/banking", label: "Banking", icon: Building },
    { to: "/watchlist", label: "Watchlist", icon: Star },
    { to: "/ipo", label: "IPO", icon: Rocket },
    { to: "/african-markets", label: "African Markets", icon: Globe },
    { to: "/verification", label: "Verification", icon: Shield },
    { to: "/profile", label: "Profile", icon: User },
    { to: "/settings", label: "Settings", icon: Settings },
    ...(isAdmin() ? [{ to: "/admin", label: "Admin", icon: Settings }] : []),
    { to: "/help", label: "Help", icon: HelpCircle },
  ] : [
    { to: "/help", label: "Help", icon: HelpCircle },
  ];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "group flex items-center space-x-3 rounded-lg px-4 py-3 lg:px-3 lg:py-2 text-sm font-medium transition-all duration-200 hover:bg-accent hover:text-accent-foreground",
      isActive
        ? "bg-accent text-accent-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground"
    );

  return (
    <>
      {/* Desktop: primary links + More dropdown */}
      <div className="hidden lg:flex items-center space-x-1">
        {primaryItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onItemClick}
            className={linkClass}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {secondaryItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center space-x-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200">
                <span>More</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {secondaryItems.map((item) => (
                <DropdownMenuItem key={item.to} asChild>
                  <NavLink
                    to={item.to}
                    onClick={onItemClick}
                    className="flex items-center space-x-3 w-full"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Mobile: all items inline */}
      <div className="flex flex-col lg:hidden space-y-1">
        {[...primaryItems, ...secondaryItems].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onItemClick}
            className={linkClass}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </>
  );
};

export default NavigationLinks;
