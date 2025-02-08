
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

interface IPOListing {
  id: string;
  company_name: string;
  symbol: string;
  description: string | null;
  sector: string | null;
  issue_price_min: number;
  issue_price_max: number;
  total_shares: number;
  retail_allocation_percentage: number;
  subscription_start_date: string;
  subscription_end_date: string;
  listing_date: string | null;
  minimum_lot_size: number;
  status: 'upcoming' | 'open' | 'closed' | 'listed' | 'withdrawn';
}

const IPO = () => {
  const { user, requireAuth } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ipoListings, setIpoListings] = useState<IPOListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    requireAuth(async () => {
      try {
        const { data, error } = await supabase
          .from('ipo_listings')
          .select('*')
          .order('subscription_start_date', { ascending: true });

        if (error) throw error;
        
        // Ensure the status is of the correct type
        const typedData = data?.map(item => ({
          ...item,
          status: item.status as IPOListing['status']
        })) || [];
        
        setIpoListings(typedData);
      } catch (error) {
        console.error('Error fetching IPO listings:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load IPO listings. Please try again later.",
        });
      } finally {
        setLoading(false);
      }
    });
  }, [requireAuth]);

  const getStatusBadgeVariant = (status: IPOListing['status']) => {
    switch (status) {
      case 'open':
        return 'default';
      case 'upcoming':
        return 'secondary';
      case 'closed':
        return 'destructive';
      case 'listed':
        return 'outline';
      case 'withdrawn':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Initial Public Offerings</h1>
        <p>Loading IPO listings...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Initial Public Offerings</h1>
      
      {ipoListings.length === 0 ? (
        <p>No IPO listings available at the moment.</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Price Range</TableHead>
                <TableHead>Lot Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscription Period</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ipoListings.map((ipo) => (
                <TableRow key={ipo.id}>
                  <TableCell className="font-medium">{ipo.company_name}</TableCell>
                  <TableCell>{ipo.symbol}</TableCell>
                  <TableCell>
                    ${ipo.issue_price_min.toFixed(2)} - ${ipo.issue_price_max.toFixed(2)}
                  </TableCell>
                  <TableCell>{ipo.minimum_lot_size}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(ipo.status)}>
                      {ipo.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(ipo.subscription_start_date), 'MMM d, yyyy')} - 
                    {format(new Date(ipo.subscription_end_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/ipo/${ipo.id}`)}
                      disabled={ipo.status !== 'open'}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default IPO;
