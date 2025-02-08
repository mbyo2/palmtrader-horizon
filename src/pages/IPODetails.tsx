
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { FileText } from "lucide-react";

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

interface IPOApplication {
  id: string;
  shares_applied: number;
  price_per_share: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'allocated';
  payment_status: 'pending' | 'completed' | 'refunded';
}

const IPODetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user, requireAuth } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [ipo, setIpo] = useState<IPOListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [existingApplication, setExistingApplication] = useState<IPOApplication | null>(null);
  const [lots, setLots] = useState(1);
  
  useEffect(() => {
    requireAuth(async () => {
      if (!id) return;
      
      try {
        // Fetch IPO details
        const { data: ipoData, error: ipoError } = await supabase
          .from('ipo_listings')
          .select('*')
          .eq('id', id)
          .single();

        if (ipoError) throw ipoError;
        setIpo(ipoData as IPOListing);

        // Check for existing application
        const { data: appData, error: appError } = await supabase
          .from('ipo_applications')
          .select('*')
          .eq('ipo_id', id)
          .eq('user_id', user?.id)
          .maybeSingle();

        if (appError) throw appError;
        if (appData) setExistingApplication(appData as IPOApplication);

      } catch (error) {
        console.error('Error fetching IPO details:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load IPO details. Please try again later.",
        });
        navigate('/ipo');
      } finally {
        setLoading(false);
      }
    });
  }, [id, requireAuth, user?.id]);

  const handleApply = async () => {
    if (!ipo || !user) return;

    const shares = lots * ipo.minimum_lot_size;
    const price_per_share = ipo.issue_price_max; // Using max price for calculation
    const total_amount = shares * price_per_share;

    try {
      const { error } = await supabase
        .from('ipo_applications')
        .insert({
          user_id: user.id,
          ipo_id: ipo.id,
          shares_applied: shares,
          price_per_share,
          total_amount,
        });

      if (error) throw error;

      toast({
        title: "Application Submitted",
        description: "Your IPO application has been submitted successfully.",
      });

      // Refresh the application data
      const { data } = await supabase
        .from('ipo_applications')
        .select('*')
        .eq('ipo_id', id)
        .eq('user_id', user.id)
        .single();

      setExistingApplication(data as IPOApplication);
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit your application. Please try again.",
      });
    }
  };

  if (loading || !ipo) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">IPO Details</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Button
        variant="outline"
        onClick={() => navigate('/ipo')}
        className="mb-6"
      >
        ← Back to IPO Listings
      </Button>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{ipo.company_name}</CardTitle>
                <CardDescription>{ipo.symbol}</CardDescription>
              </div>
              <Badge
                variant={ipo.status === 'open' ? 'default' : 'secondary'}
              >
                {ipo.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <FileText className="mt-1" />
              <div className="flex-1">
                <h3 className="font-medium">Description</h3>
                <p className="text-sm text-muted-foreground">{ipo.description || 'No description available.'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium">Sector</h3>
                <p className="text-sm text-muted-foreground">{ipo.sector || 'N/A'}</p>
              </div>
              <div>
                <h3 className="font-medium">Price Range</h3>
                <p className="text-sm text-muted-foreground">
                  ${ipo.issue_price_min.toFixed(2)} - ${ipo.issue_price_max.toFixed(2)}
                </p>
              </div>
              <div>
                <h3 className="font-medium">Total Shares</h3>
                <p className="text-sm text-muted-foreground">{ipo.total_shares.toLocaleString()}</p>
              </div>
              <div>
                <h3 className="font-medium">Retail Allocation</h3>
                <p className="text-sm text-muted-foreground">{ipo.retail_allocation_percentage}%</p>
              </div>
              <div>
                <h3 className="font-medium">Minimum Lot Size</h3>
                <p className="text-sm text-muted-foreground">{ipo.minimum_lot_size} shares</p>
              </div>
              <div>
                <h3 className="font-medium">Subscription Period</h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(ipo.subscription_start_date), 'MMM d, yyyy')} - 
                  {format(new Date(ipo.subscription_end_date), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>IPO Application</CardTitle>
            <CardDescription>
              Apply for shares in {ipo.company_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {existingApplication ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <h3 className="font-medium mb-2">Your Application Details</h3>
                  <div className="space-y-2">
                    <p className="text-sm">Shares Applied: {existingApplication.shares_applied}</p>
                    <p className="text-sm">Price per Share: ${existingApplication.price_per_share.toFixed(2)}</p>
                    <p className="text-sm">Total Amount: ${existingApplication.total_amount.toFixed(2)}</p>
                    <p className="text-sm">Status: {existingApplication.status.toUpperCase()}</p>
                    <p className="text-sm">Payment Status: {existingApplication.payment_status.toUpperCase()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lots">Number of Lots</Label>
                  <Input
                    id="lots"
                    type="number"
                    min={1}
                    value={lots}
                    onChange={(e) => setLots(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <p className="text-sm text-muted-foreground">
                    {lots * ipo.minimum_lot_size} shares total
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Estimated Cost</h3>
                  <p className="text-sm text-muted-foreground">
                    Maximum Cost: ${(lots * ipo.minimum_lot_size * ipo.issue_price_max).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Minimum Cost: ${(lots * ipo.minimum_lot_size * ipo.issue_price_min).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            {!existingApplication && (
              <Button
                className="w-full"
                onClick={handleApply}
                disabled={ipo.status !== 'open'}
              >
                Apply for IPO
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default IPODetails;
