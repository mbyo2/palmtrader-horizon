import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavigationLinks } from "@/components/Navigation/NavigationLinks";
import { MobileNav } from "@/components/Navigation/MobileNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Menu, Bell, Star, Settings, LogOut, User, Wallet } from "lucide-react";

const Navbar = () => {
  const { user, signOut, accountDetails } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <h1 className="text-2xl font-bold gradient-text">Palm Cacia</h1>
            </Link>
            
            <div className="hidden lg:block ml-12">
              <div className="flex items-center space-x-1">
                <NavigationLinks onItemClick={() => {}} />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <ThemeToggle />
                
                <Button variant="ghost" size="sm" className="relative hover:bg-accent">
                  <Bell className="h-4 w-4" />
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-primary">
                    3
                  </Badge>
                </Button>
                
                <Button variant="ghost" size="sm" asChild className="hover:bg-accent">
                  <Link to="/watchlist">
                    <Star className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Watchlist</span>
                  </Link>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:ring-2 hover:ring-primary/20">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
                        <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-white font-semibold">
                          {accountDetails?.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64" align="end" forceMount>
                    <div className="flex items-center justify-start gap-3 p-3">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-semibold text-sm">
                          {accountDetails?.first_name || "User"}
                        </p>
                        <p className="w-[200px] truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/portfolio" className="w-full flex items-center py-2">
                        <Wallet className="mr-3 h-4 w-4" />
                        Portfolio
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/account-settings" className="w-full flex items-center py-2">
                        <User className="mr-3 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="w-full flex items-center py-2">
                        <Settings className="mr-3 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()} className="text-red-600 focus:text-red-600 py-2">
                      <LogOut className="mr-3 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <ThemeToggle />
                <Button variant="ghost" asChild className="hover:bg-accent">
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                  <Link to="/auth">Get Started</Link>
                </Button>
              </div>
            )}

            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="hover:bg-accent"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <MobileNav 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />
    </nav>
  );
};

export default Navbar;
