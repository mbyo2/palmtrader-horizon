import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
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
import { Check, X, Eye } from "lucide-react";
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
}

const LocalBusinessManagement = () => {
  const [businesses, setBusinesses] = useState<LocalBusiness[]>([]);
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
              <TableHead>Business</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Admin Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {businesses.map((business) => (
              <TableRow key={business.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{business.company_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Symbol: {business.symbol}
                    </div>
                    {business.sector && (
                      <div className="text-sm text-muted-foreground">
                        Sector: {business.sector}
                      </div>
                    )}
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
                </TableCell>
                <TableCell>
                  {business.documents_submitted ? (
                    <Badge className="bg-green-500">
                      <Check className="h-4 w-4 mr-1" />
                      Submitted
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <X className="h-4 w-4 mr-1" />
                      Missing
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Textarea
                    defaultValue={business.admin_notes || ''}
                    className="min-h-[100px]"
                    onBlur={(e) => updateAdminNotes(business.id, e.target.value)}
                    placeholder="Add admin notes..."
                  />
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View Documents
                  </Button>
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