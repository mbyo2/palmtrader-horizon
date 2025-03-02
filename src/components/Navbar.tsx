
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import CurrencySelector from "@/components/CurrencySelector";
import SearchBar from "@/components/Search/SearchBar";

const Navbar = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">BullTrade</span>
          </Link>
        </div>
        <div className="flex items-center justify-between flex-1 gap-4">
          <nav className="flex items-center space-x-4 lg:space-x-6 hidden sm:flex">
            <Link
              to="/markets"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Markets
            </Link>
            <Link
              to="/crypto"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Crypto
            </Link>
            <Link
              to="/portfolio"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Portfolio
            </Link>
            <Link
              to="/watchlist"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Watchlist
            </Link>
            <Link
              to="/ipo"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              IPO
            </Link>
          </nav>
          
          <div className="flex flex-1 items-center justify-end space-x-2">
            <SearchBar />
            <CurrencySelector />
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
      </div>
    </header>
  );
};

export default Navbar;
