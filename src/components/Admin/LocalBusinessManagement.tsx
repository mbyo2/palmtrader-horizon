
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Eye, FileText, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LocalBusiness {
  id: string;
  symbol: string;
  company_name: string;
  description: string | null;
  sector: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  documents_submitted: boolean;
  admin_notes: string | null;
  submitted_by: string | null;
  reviewed_by: string | null;
  share_capital: number;
  total_shares: number;
  public_shares_percentage: number;
  total_shareholders: number;
  financial_statements_submitted: boolean;
  management_experience_details: string | null;
  profit_history: any;
  corporate_governance_details: string | null;
  business_operations_details: string | null;
  sponsoring_broker: string | null;
  underwriter: string | null;
}

interface BusinessDocument {
  id: string;
  document_type: string;
  file_path: string;
  submitted_at: string;
  verified: boolean;
  notes: string | null;
}

const LocalBusinessManagement = () => {
  const [businesses, setBusinesses] = useState<LocalBusiness[]>([]);
  const [documents, setDocuments] = useState<Record<string, BusinessDocument[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('local_businesses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBusinesses(data || []);

      // Fetch documents for each business
      for (const business of data || []) {
        const { data: docs, error: docsError } = await supabase
          .from('business_documents')
          .select('*')
          .eq('business_id', business.id);

        if (!docsError && docs) {
          setDocuments(prev => ({
            ...prev,
            [business.id]: docs
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
      toast({
        title: "Error fetching businesses",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateVerificationStatus = async (businessId: string, status: 'pending' | 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('local_businesses')
        .update({ 
          verification_status: status,
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', businessId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: "Business verification status has been updated",
      });

      fetchBusinesses();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error updating status",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const renderDocumentStatus = (businessId: string, documentType: string) => {
    const businessDocs = documents[businessId] || [];
    const doc = businessDocs.find(d => d.document_type === documentType);
    
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

  const updateAdminNotes = async (businessId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('local_businesses')
        .update({ admin_notes: notes })
        .eq('id', businessId);

      if (error) throw error;

      toast({
        title: "Notes updated",
        description: "Admin notes have been saved",
      });

      fetchBusinesses();
    } catch (error) {
      console.error('Error updating notes:', error);
      toast({
        title: "Error updating notes",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin()) {
    return null;
  }

  if (loading) {
    return <div>Loading business management...</div>;
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Local Business Management</h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business Details</TableHead>
              <TableHead>Financial Requirements</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {businesses.map((business) => (
              <TableRow key={business.id}>
                <TableCell>
                  <div className="space-y-2">
                    <div className="font-medium">{business.company_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Symbol: {business.symbol}
                    </div>
                    {business.sector && (
                      <div className="text-sm text-muted-foreground">
                        Sector: {business.sector}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      Share Capital: K{business.share_capital.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Shares: {business.total_shares.toLocaleString()}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <div>Public Shares: {business.public_shares_percentage}%</div>
                    <div>Shareholders: {business.total_shareholders}</div>
                    <div>
                      Financial Statements: 
                      <Badge className={business.financial_statements_submitted ? "bg-green-500 ml-2" : "bg-red-500 ml-2"}>
                        {business.financial_statements_submitted ? "Submitted" : "Missing"}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    {['prospectus', 'accountant_report', 'underwriting_agreement', 'listing_application'].map(docType => (
                      <div key={docType} className="flex items-center justify-between">
                        <span className="capitalize">{docType.replace('_', ' ')}:</span>
                        {renderDocumentStatus(business.id, docType)}
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    defaultValue={business.verification_status}
                    onValueChange={(value: 'pending' | 'approved' | 'rejected') => 
                      updateVerificationStatus(business.id, value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    defaultValue={business.admin_notes || ''}
                    className="mt-2 min-h-[100px]"
                    onBlur={(e) => updateAdminNotes(business.id, e.target.value)}
                    placeholder="Add admin notes..."
                  />
                </TableCell>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default LocalBusinessManagement;
