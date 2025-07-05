
import React from 'react';
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { Settings as SettingsIcon, User, Bell, Shield, CreditCard } from "lucide-react";

const Settings = () => {
  const { isLoading } = useProtectedRoute();
  const { user, accountDetails } = useAuth();

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
                    defaultValue={accountDetails?.first_name || ''} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    defaultValue={accountDetails?.last_name || ''} 
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
                  defaultValue={accountDetails?.phone_number || ''} 
                />
              </div>
              <Button>Save Changes</Button>
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
              <Button>Save Preferences</Button>
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
