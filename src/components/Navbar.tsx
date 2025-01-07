import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-primary">PalmCacia</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/markets" className="text-gray-700 hover:text-primary">Markets</Link>
            <Link to="/watchlist" className="text-gray-700 hover:text-primary">Watchlist</Link>
            <Link to="/login" className="text-gray-700 hover:text-primary">Login</Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;