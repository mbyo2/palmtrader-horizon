
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BusinessDetails from "./BusinessDetails";
import FinancialRequirements from "./FinancialRequirements";
import DocumentStatus from "./DocumentStatus";
import BusinessActions from "./BusinessActions";

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
                <BusinessDetails
                  company_name={business.company_name}
                  symbol={business.symbol}
                  sector={business.sector}
                  share_capital={business.share_capital}
                  total_shares={business.total_shares}
                />
                <FinancialRequirements
                  public_shares_percentage={business.public_shares_percentage}
                  total_shareholders={business.total_shareholders}
                  financial_statements_submitted={business.financial_statements_submitted}
                />
                <DocumentStatus
                  businessId={business.id}
                  documents={documents[business.id] || []}
                />
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
                <BusinessActions />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default LocalBusinessManagement;

