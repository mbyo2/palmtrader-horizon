import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, LogOut, Crown } from "lucide-react";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "./ui/use-toast";
import CurrencySelector from "./CurrencySelector";
import { Badge } from "./ui/badge";

interface AccountDetails {
  role: 'basic' | 'premium' | 'admin';
  account_status: 'pending' | 'active' | 'restricted' | 'suspended';
}

const Navbar = () => {
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [accountDetails, setAccountDetails] = useState<AccountDetails | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAccountDetails = async (userId: string) => {
      const { data, error } = await supabase
        .from('account_details')
        .select('role, account_status')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching account details:', error);
      } else {
        setAccountDetails(data);
      }
    };

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAccountDetails(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAccountDetails(session.user.id);
      } else {
        setAccountDetails(null);
        if (event === 'SIGNED_OUT') {
          navigate('/auth');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error signing out",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const renderAccountBadge = () => {
    if (!accountDetails) return null;

    if (accountDetails.role === 'premium') {
      return (
        <Badge variant="premium" className="ml-2">
          <Crown className="w-3 h-3 mr-1" />
          Premium
        </Badge>
      );
    }

    if (accountDetails.account_status === 'pending') {
      return (
        <Badge variant="secondary" className="ml-2">
          Pending
        </Badge>
      );
    }

    return null;
  };

  return (
    <nav className="bg-background/80 border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-foreground">
                PalmCacia
              </span>
              {renderAccountBadge()}
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {!isMobile ? (
              <>
                <Link 
                  to="/markets" 
                  className="text-foreground hover:text-primary transition-colors duration-200 font-medium"
                >
                  Markets
                </Link>
                <Link 
                  to="/crypto" 
                  className="text-foreground hover:text-primary transition-colors duration-200 font-medium"
                >
                  Crypto
                </Link>
                {user && accountDetails?.account_status === 'active' && (
                  <>
                    <Link 
                      to="/watchlist" 
                      className="text-foreground hover:text-primary transition-colors duration-200 font-medium"
                    >
                      Watchlist
                    </Link>
                    <Link 
                      to="/portfolio" 
                      className="text-foreground hover:text-primary transition-colors duration-200 font-medium"
                    >
                      Portfolio
                    </Link>
                    {accountDetails.role === 'premium' && (
                      <Link 
                        to="/premium" 
                        className="text-foreground hover:text-primary transition-colors duration-200 font-medium"
                      >
                        Premium
                      </Link>
                    )}
                    <CurrencySelector />
                  </>
                )}
                {user ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="text-foreground hover:text-primary transition-colors duration-200"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                ) : (
                  <Link 
                    to="/auth" 
                    className="text-foreground hover:text-primary transition-colors duration-200 font-medium"
                  >
                    Login
                  </Link>
                )}
              </>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="mr-2"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMobile && isMenuOpen && (
          <div className="px-2 pt-2 pb-3 space-y-1 bg-background/95 backdrop-blur-sm">
            <Link 
              to="/markets" 
              className="block px-3 py-2 rounded-md text-foreground hover:text-primary transition-colors duration-200"
            >
              Markets
            </Link>
            <Link 
              to="/crypto" 
              className="block px-3 py-2 rounded-md text-foreground hover:text-primary transition-colors duration-200"
            >
              Crypto
            </Link>
            {user && accountDetails?.account_status === 'active' && (
              <>
                <Link 
                  to="/watchlist" 
                  className="block px-3 py-2 rounded-md text-foreground hover:text-primary transition-colors duration-200"
                >
                  Watchlist
                </Link>
                <Link 
                  to="/portfolio" 
                  className="block px-3 py-2 rounded-md text-foreground hover:text-primary transition-colors duration-200"
                >
                  Portfolio
                </Link>
                {accountDetails.role === 'premium' && (
                  <Link 
                    to="/premium" 
                    className="block px-3 py-2 rounded-md text-foreground hover:text-primary transition-colors duration-200"
                  >
                    Premium
                  </Link>
                )}
                <div className="px-3 py-2">
                  <CurrencySelector />
                </div>
              </>
            )}
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-start px-3 py-2"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            ) : (
              <Link 
                to="/auth" 
                className="block px-3 py-2 rounded-md text-foreground hover:text-primary transition-colors duration-200"
              >
                Login
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
