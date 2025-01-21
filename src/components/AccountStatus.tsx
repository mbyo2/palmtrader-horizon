import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "./ui/use-toast";
import { Crown, ShieldAlert, ShieldCheck, Clock } from "lucide-react";

interface AccountDetails {
  role: 'basic' | 'premium' | 'admin';
  account_status: 'pending' | 'active' | 'restricted' | 'suspended';
  kyc_status: 'not_started' | 'pending' | 'approved' | 'rejected';
}

const AccountStatus = () => {
  const [accountDetails, setAccountDetails] = useState<AccountDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccountDetails();
  }, []);

  const fetchAccountDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('account_details')
        .select('role, account_status, kyc_status')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setAccountDetails(data);
    } catch (error) {
      console.error('Error fetching account details:', error);
      toast({
        title: "Error loading account status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!accountDetails) return null;

    switch (accountDetails.account_status) {
      case 'active':
        return (
          <Badge className="ml-2" variant="default">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="ml-2" variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'restricted':
      case 'suspended':
        return (
          <Badge className="ml-2" variant="destructive">
            <ShieldAlert className="w-3 h-3 mr-1" />
            {accountDetails.account_status.charAt(0).toUpperCase() + 
             accountDetails.account_status.slice(1)}
          </Badge>
        );
    }
  };

  const getRoleBadge = () => {
    if (!accountDetails) return null;

    if (accountDetails.role === 'premium') {
      return (
        <Badge variant="premium" className="ml-2">
          <Crown className="w-3 h-3 mr-1" />
          Premium
        </Badge>
      );
    }
    return null;
  };

  if (loading) {
    return <div>Loading account status...</div>;
  }

  if (!accountDetails) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold">Account Status</h3>
            {getStatusBadge()}
            {getRoleBadge()}
          </div>
        </div>
        
        {accountDetails.account_status === 'pending' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Your account is pending verification. Some features may be limited until your account is verified.
            </p>
            <Button 
              variant="outline" 
              className="mt-2"
              onClick={() => window.location.href = '/verify'}
            >
              Complete Verification
            </Button>
          </div>
        )}
        
        {(accountDetails.account_status === 'restricted' || 
          accountDetails.account_status === 'suspended') && (
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              Your account has been {accountDetails.account_status}. 
              Please contact support for assistance.
            </p>
            <Button 
              variant="outline" 
              className="mt-2"
              onClick={() => window.location.href = '/support'}
            >
              Contact Support
            </Button>
          </div>
        )}
        
        {accountDetails.role === 'basic' && 
         accountDetails.account_status === 'active' && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg">
            <p className="text-sm text-purple-800 dark:text-purple-200">
              Upgrade to Premium for advanced trading features and real-time market data.
            </p>
            <Button 
              variant="outline" 
              className="mt-2"
              onClick={() => window.location.href = '/upgrade'}
            >
              Upgrade to Premium
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AccountStatus;