
import { Link } from "react-router-dom";
import { BarChart3, Activity, TrendingUp, DollarSign } from "lucide-react";

interface NavigationLinksProps {
  onClick?: () => void;
}

export const NavigationLinks = ({ onClick }: NavigationLinksProps) => {
  const navLinks = [
    { to: "/markets", label: "Markets", icon: <BarChart3 className="h-4 w-4 mr-2" /> },
    { to: "/crypto", label: "Crypto", icon: <Activity className="h-4 w-4 mr-2" /> },
    { to: "/portfolio", label: "Portfolio", icon: <TrendingUp className="h-4 w-4 mr-2" /> },
    { to: "/watchlist", label: "Watchlist", icon: <DollarSign className="h-4 w-4 mr-2" /> },
    { to: "/ipo", label: "IPO", icon: <BarChart3 className="h-4 w-4 mr-2" /> },
  ];

  return (
    <>
      {navLinks.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className="py-2 px-3 text-sm font-medium hover:bg-accent/50 rounded-md transition-colors flex items-center"
          onClick={onClick}
        >
          {link.icon}
          <span>{link.label}</span>
        </Link>
      ))}
    </>
  );
};
