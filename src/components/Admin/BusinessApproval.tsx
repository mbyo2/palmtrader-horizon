
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Eye, FileText, Clock } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface LocalBusiness {
  id: string;
  company_name: string;
  symbol: string;
  sector: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  submitted_by: string;
  created_at: string;
  share_capital: number;
  total_shares: number;
  public_shares_percentage: number;
  total_shareholders: number;
  financial_statements_submitted: boolean;
  admin_notes: string;
}

const BusinessApproval = () => {
  const [businesses, setBusinesses] = useState<LocalBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<LocalBusiness | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const { toast } = useToast();

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
        title: 'Error',
        description: 'Failed to fetch business applications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBusinessStatus = async (
    businessId: string, 
    status: 'approved' | 'rejected',
    notes: string
  ) => {
    try {
      const { error } = await supabase
        .from('local_businesses')
        .update({
          verification_status: status,
          admin_notes: notes,
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Business ${status} successfully`,
      });

      fetchBusinesses();
      setSelectedBusiness(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error updating business status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update business status',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending Review</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div>Loading business applications...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Applications</CardTitle>
          <CardDescription>
            Review and approve local business listing applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Financial Info</TableHead>
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
                        {business.symbol} • {business.sector}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(business.verification_status)}</TableCell>
                  <TableCell>
                    {new Date(business.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Capital: K{business.share_capital?.toLocaleString()}</div>
                      <div>Shares: {business.total_shares?.toLocaleString()}</div>
                      <div>Public: {business.public_shares_percentage}%</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBusiness(business);
                              setAdminNotes(business.admin_notes || '');
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Business Application Review</DialogTitle>
                            <DialogDescription>
                              Review and approve/reject this business application
                            </DialogDescription>
                          </DialogHeader>
                          {selectedBusiness && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold">Company Details</h4>
                                  <p>Name: {selectedBusiness.company_name}</p>
                                  <p>Symbol: {selectedBusiness.symbol}</p>
                                  <p>Sector: {selectedBusiness.sector}</p>
                                </div>
                                <div>
                                  <h4 className="font-semibold">Financial Info</h4>
                                  <p>Share Capital: K{selectedBusiness.share_capital?.toLocaleString()}</p>
                                  <p>Total Shares: {selectedBusiness.total_shares?.toLocaleString()}</p>
                                  <p>Public Shares: {selectedBusiness.public_shares_percentage}%</p>
                                  <p>Shareholders: {selectedBusiness.total_shareholders}</p>
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold mb-2">Admin Notes</h4>
                                <Textarea
                                  value={adminNotes}
                                  onChange={(e) => setAdminNotes(e.target.value)}
                                  placeholder="Add notes about the review..."
                                  rows={3}
                                />
                              </div>

                              <div className="flex gap-2 justify-end">
                                <Button
                                  onClick={() => updateBusinessStatus(selectedBusiness.id, 'rejected', adminNotes)}
                                  variant="destructive"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                                <Button
                                  onClick={() => updateBusinessStatus(selectedBusiness.id, 'approved', adminNotes)}
                                  className="bg-green-500 hover:bg-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessApproval;
