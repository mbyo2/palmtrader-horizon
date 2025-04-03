
import { Copyright, Github, Twitter, Globe } from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Copyright className="h-4 w-4" />
            <span>{currentYear} Palm Cacia.</span>
          </div>
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Made by{" "}
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
            <a href="/markets" className="hover:text-primary transition-colors">
              Markets
            </a>
            <a href="/portfolio" className="hover:text-primary transition-colors">
              Portfolio
            </a>
            <a href="/watchlist" className="hover:text-primary transition-colors">
              Watchlist
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <a
                    href="https://github.com/palmcacia"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center w-full h-full"
                  >
                    <Github className="h-4 w-4" />
                    <span className="sr-only">GitHub</span>
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>GitHub</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <a
                    href="https://twitter.com/palmcacia"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center w-full h-full"
                  >
                    <Twitter className="h-4 w-4" />
                    <span className="sr-only">Twitter</span>
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Twitter</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <a
                    href="https://palmcacia.com"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center w-full h-full"
                  >
                    <Globe className="h-4 w-4" />
                    <span className="sr-only">Website</span>
                  </a>
                </Button>
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
