import { NavLink } from "react-router-dom";
import { Home, TrendingUp, ArrowLeftRight, PieChart, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Binance-app style bottom tab bar for mobile (hidden on lg+ where the
 * top navigation takes over). Pure navigation chrome — no feature logic.
 */
const tabs = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/markets", label: "Markets", icon: TrendingUp, end: false },
  { to: "/exchange", label: "Trade", icon: ArrowLeftRight, end: false },
  { to: "/portfolio", label: "Portfolio", icon: PieChart, end: false },
  { to: "/banking", label: "Wallet", icon: Wallet, end: false },
];

const MobileTabBar = () => {
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-50 lg:hidden border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5">
        {tabs.map((tab) => (
          <NavLink
            key={tab.label}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <tab.icon className="h-5 w-5" />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileTabBar;
