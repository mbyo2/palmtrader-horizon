
import { Badge } from "@/components/ui/badge";
import { TableCell } from "@/components/ui/table";
import { Check, Eye, X } from "lucide-react";

interface BusinessDocument {
  id: string;
  document_type: string;
  file_path: string;
  submitted_at: string;
  verified: boolean;
  notes: string | null;
}

interface DocumentStatusProps {
  businessId: string;
  documents: BusinessDocument[];
}

const DocumentStatus = ({ businessId, documents }: DocumentStatusProps) => {
  const renderDocumentStatus = (documentType: string) => {
    const doc = documents.find(d => d.document_type === documentType);
    
    if (doc) {
      return (
        <Badge className={doc.verified ? "bg-green-500" : "bg-yellow-500"}>
          {doc.verified ? (
            <Check className="h-4 w-4 mr-1" />
          ) : (
            <Eye className="h-4 w-4 mr-1" />
          )}
          {doc.verified ? "Verified" : "Pending Review"}
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        <X className="h-4 w-4 mr-1" />
        Missing
      </Badge>
    );
  };

  return (
    <TableCell>
      <div className="space-y-2">
        {['prospectus', 'accountant_report', 'underwriting_agreement', 'listing_application'].map(docType => (
          <div key={docType} className="flex items-center justify-between">
            <span className="capitalize">{docType.replace('_', ' ')}:</span>
            {renderDocumentStatus(docType)}
          </div>
        ))}
      </div>
    </TableCell>
  );
};

export default DocumentStatus;
