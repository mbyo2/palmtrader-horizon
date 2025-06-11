
import React from 'react';
import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NavigationLinks } from './NavigationLinks';

export const MobileNav = () => {
  return (
    <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
      <div className="flex flex-col space-y-3">
        <Link to="/" className="flex items-center space-x-2">
          <span className="font-bold">PalmCacia</span>
        </Link>
      </div>
      <ScrollArea className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
        <div className="flex flex-col space-y-2">
          <NavigationLinks />
        </div>
      </ScrollArea>
    </div>
  );
};
