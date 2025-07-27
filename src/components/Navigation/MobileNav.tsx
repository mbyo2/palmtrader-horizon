
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import NavigationLinks from "./NavigationLinks";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileNav = ({ isOpen, onClose }: MobileNavProps) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-64">
        <div className="py-4">
          <NavigationLinks onItemClick={onClose} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
