import { Copyright, Github, Twitter, Globe } from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex flex-col items-center justify-between gap-4 py-6 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-4 md:flex-row md:gap-2 md:px-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Copyright className="h-4 w-4" />
            <span>{currentYear} PalmCacia</span>
          </div>
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
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
        <div className="flex flex-col md:flex-row items-center gap-4">
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link to="/markets" className="hover:text-primary transition-colors">
              Markets
            </Link>
            <Link to="/portfolio" className="hover:text-primary transition-colors">
              Portfolio
            </Link>
            <Link to="/watchlist" className="hover:text-primary transition-colors">
              Watchlist
            </Link>
            <Link to="/about" className="hover:text-primary transition-colors">
              About
            </Link>
            <Link to="/contact" className="hover:text-primary transition-colors">
              Contact
            </Link>
            <Link to="/terms" className="hover:text-primary transition-colors">
              Terms
            </Link>
            <Link to="/cookies" className="hover:text-primary transition-colors">
              Cookies
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {/* GitHub */}
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://github.com/palmcacia"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="ghost" size="icon">
                    <Github className="h-4 w-4" />
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
                  <Button variant="ghost" size="icon">
                    <Twitter className="h-4 w-4" />
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
                  <Button variant="ghost" size="icon">
                    <Globe className="h-4 w-4" />
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
