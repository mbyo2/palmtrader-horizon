import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

const Navbar = () => {
  return (
    <nav className="bg-background border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-primary">PalmCacia</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/markets" className="text-foreground hover:text-primary">Markets</Link>
            <Link to="/watchlist" className="text-foreground hover:text-primary">Watchlist</Link>
            <Link to="/login" className="text-foreground hover:text-primary">Login</Link>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;