import { Copyright, Github, Twitter, Globe } from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex flex-col items-center justify-between gap-4 py-6 md:h-24 md:flex-row md:py-0 px-4">
        <div className="flex flex-col items-center gap-2 md:gap-4 md:flex-row md:px-0">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Copyright className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>{currentYear} PalmCacia</span>
          </div>
          <p className="text-center text-xs sm:text-sm leading-loose text-muted-foreground md:text-left">
            Built with care by{" "}
            <a
              href="https://mabvutobanda.online"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4 hover:text-primary"
            >
              Mabvuto Banda
            </a>
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4">
          <nav className="flex flex-wrap justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            <Link to="/markets" className="hover:text-primary transition-colors whitespace-nowrap">
              Markets
            </Link>
            <Link to="/portfolio" className="hover:text-primary transition-colors whitespace-nowrap">
              Portfolio
            </Link>
            <Link to="/watchlist" className="hover:text-primary transition-colors whitespace-nowrap">
              Watchlist
            </Link>
            <Link to="/about" className="hover:text-primary transition-colors whitespace-nowrap">
              About
            </Link>
            <Link to="/contact" className="hover:text-primary transition-colors whitespace-nowrap">
              Contact
            </Link>
            <Link to="/terms" className="hover:text-primary transition-colors whitespace-nowrap">
              Terms
            </Link>
            <Link to="/cookies" className="hover:text-primary transition-colors whitespace-nowrap">
              Cookies
            </Link>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            {/* GitHub */}
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://github.com/palmcacia"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Github className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="sr-only">GitHub</span>
                  </Button>
                </a>
              </TooltipTrigger>
              <TooltipContent>GitHub</TooltipContent>
            </Tooltip>
            
            {/* Twitter */}
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://twitter.com/palmcacia"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Twitter className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="sr-only">Twitter</span>
                  </Button>
                </a>
              </TooltipTrigger>
              <TooltipContent>Twitter</TooltipContent>
            </Tooltip>
            
            {/* Website */}
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://palmcacia.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="sr-only">Website</span>
                  </Button>
                </a>
              </TooltipTrigger>
              <TooltipContent>Website</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
