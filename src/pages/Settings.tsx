
import React, { useState } from 'react';
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { Settings as SettingsIcon, User, Bell, Shield, CreditCard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Settings = () => {
  const { isLoading } = useProtectedRoute();
  const { user, accountDetails, refetchAccountDetails } = useAuth();
  
  const [firstName, setFirstName] = useState(accountDetails?.first_name || '');
  const [lastName, setLastName] = useState(accountDetails?.last_name || '');
  const [phoneNumber, setPhoneNumber] = useState(accountDetails?.phone_number || '');
  const [isSaving, setIsSaving] = useState(false);
  
  // Notification preferences
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [tradeConfirmations, setTradeConfirmations] = useState(true);
  const [marketUpdates, setMarketUpdates] = useState(true);

  // Update state when accountDetails changes
  React.useEffect(() => {
    if (accountDetails) {
      setFirstName(accountDetails.first_name || '');
      setLastName(accountDetails.last_name || '');
      setPhoneNumber(accountDetails.phone_number || '');
    }
  }, [accountDetails]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('account_details')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      refetchAccountDetails?.();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = () => {
    // In a real app, this would save to the database
    toast.success('Notification preferences saved');
  };

  if (isLoading) {
    return <div className="container py-6">Loading...</div>;
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center space-x-3">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>
      
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  defaultValue={user?.email || ''} 
                  disabled 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <Button onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified about your account activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Price Alerts</Label>
                  <div className="text-sm text-muted-foreground">
                    Get notified when your stocks hit target prices
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Trade Confirmations</Label>
                  <div className="text-sm text-muted-foreground">
                    Receive confirmations for all your trades
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Market Updates</Label>
                  <div className="text-sm text-muted-foreground">
                    Daily market news and updates
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <Button onClick={handleSaveNotifications}>Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security and authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Change Password</Label>
                  <div className="flex space-x-2 mt-2">
                    <Input type="password" placeholder="Current password" />
                    <Input type="password" placeholder="New password" />
                    <Button>Update</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <div className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </div>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
              <CardDescription>
                Manage your subscription and payment methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold mb-2">Free Account</h3>
                <p className="text-muted-foreground mb-4">
                  You're currently on our free plan with zero trading fees
                </p>
                <Button variant="outline">Upgrade to Premium</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
