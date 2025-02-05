
import { Button } from "@/components/ui/button";
import { TableCell } from "@/components/ui/table";
import { Eye, FileText } from "lucide-react";

const BusinessActions = () => {
  return (
    <TableCell>
      <div className="space-y-2">
        <Button variant="outline" size="sm" className="w-full">
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
        <Button variant="outline" size="sm" className="w-full">
          <FileText className="h-4 w-4 mr-2" />
          View Documents
        </Button>
      </div>
    </TableCell>
  );
};

export default BusinessActions;
