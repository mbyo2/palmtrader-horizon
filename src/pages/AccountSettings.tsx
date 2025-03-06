
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Check, Loader2, SaveIcon, UserCog, User, Bell, Shield, LogOut } from "lucide-react";

const AccountSettings = () => {
  const { user, accountDetails, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoading } = useProtectedRoute();
  
  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    bio: "",
    email: "",
    phone: "",
    experience: "beginner",
    riskTolerance: "moderate",
    investmentGoals: ["retirement"],
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    marketUpdates: true,
    priceAlerts: true,
    tradeConfirmations: true,
    accountActivity: true,
    marketingCommunications: false,
  });
  
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    loginNotifications: true,
    allowDataCollection: true,
  });
  
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      
      try {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        
        if (profileError && profileError.code !== "PGRST116") {
          throw profileError;
        }
        
        // Fetch user preferences
        const { data: preferencesData, error: preferencesError } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", user.id)
          .single();
        
        if (preferencesError && preferencesError.code !== "PGRST116") {
          throw preferencesError;
        }
        
        // Update profile data state
        if (profileData) {
          setProfileData({
            firstName: profileData.first_name || "",
            lastName: profileData.last_name || "",
            displayName: profileData.display_name || "",
            bio: profileData.bio || "",
            email: user.email || "",
            phone: profileData.phone || "",
            experience: profileData.investment_experience || "beginner",
            riskTolerance: profileData.risk_tolerance || "moderate",
            investmentGoals: profileData.investment_goals || ["retirement"],
          });
        } else {
          // Set email from auth data
          setProfileData(prev => ({
            ...prev,
            email: user.email || "",
          }));
        }
        
        // Update notification settings
        if (preferencesData) {
          setNotificationSettings({
            emailNotifications: preferencesData.email_notifications !== false,
            pushNotifications: preferencesData.push_notifications !== false,
            marketUpdates: preferencesData.market_updates !== false,
            priceAlerts: preferencesData.price_alerts !== false,
            tradeConfirmations: preferencesData.trade_confirmations !== false,
            accountActivity: preferencesData.account_activity !== false,
            marketingCommunications: preferencesData.marketing_communications === true,
          });
          
          setSecuritySettings({
            twoFactorEnabled: preferencesData.two_factor_enabled === true,
            loginNotifications: preferencesData.login_notifications !== false,
            allowDataCollection: preferencesData.allow_data_collection !== false,
          });
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        toast({
          title: "Error",
          description: "Failed to load user settings",
          variant: "destructive",
        });
      }
    };
    
    loadUserData();
  }, [user, toast]);
  
  useEffect(() => {
    setHasChanges(true);
  }, [profileData, notificationSettings, securitySettings]);
  
  if (isLoading) {
    return <div className="container py-10">Loading...</div>;
  }
  
  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from("user_profiles")
        .upsert({
          user_id: user.id,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          display_name: profileData.displayName || `${profileData.firstName} ${profileData.lastName}`,
          bio: profileData.bio,
          phone: profileData.phone,
          investment_experience: profileData.experience,
          risk_tolerance: profileData.riskTolerance,
          investment_goals: profileData.investmentGoals,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      
      if (profileError) throw profileError;
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      
      setHasChanges(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSaveNotifications = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    try {
      // Update user preferences
      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          email_notifications: notificationSettings.emailNotifications,
          push_notifications: notificationSettings.pushNotifications,
          market_updates: notificationSettings.marketUpdates,
          price_alerts: notificationSettings.priceAlerts,
          trade_confirmations: notificationSettings.tradeConfirmations,
          account_activity: notificationSettings.accountActivity,
          marketing_communications: notificationSettings.marketingCommunications,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      
      if (error) throw error;
      
      toast({
        title: "Notification settings updated",
        description: "Your notification preferences have been saved",
      });
      
      setHasChanges(false);
    } catch (error) {
      console.error("Error updating notification settings:", error);
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSaveSecurity = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    try {
      // Update user preferences with security settings
      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          two_factor_enabled: securitySettings.twoFactorEnabled,
          login_notifications: securitySettings.loginNotifications,
          allow_data_collection: securitySettings.allowDataCollection,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      
      if (error) throw error;
      
      toast({
        title: "Security settings updated",
        description: "Your security settings have been saved",
      });
      
      setHasChanges(false);
    } catch (error) {
      console.error("Error updating security settings:", error);
      toast({
        title: "Error",
        description: "Failed to update security settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleInvestmentGoalChange = (goal: string) => {
    const currentGoals = [...profileData.investmentGoals];
    if (currentGoals.includes(goal)) {
      setProfileData({
        ...profileData,
        investmentGoals: currentGoals.filter(g => g !== goal)
      });
    } else {
      setProfileData({
        ...profileData,
        investmentGoals: [...currentGoals, goal]
      });
    }
  };
  
  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    
    try {
      // Delete user data from profile and preferences
      const { error: deleteProfileError } = await supabase
        .from("user_profiles")
        .delete()
        .eq("user_id", user.id);
      
      if (deleteProfileError) throw deleteProfileError;
      
      const { error: deletePreferencesError } = await supabase
        .from("user_preferences")
        .delete()
        .eq("user_id", user.id);
      
      if (deletePreferencesError) throw deletePreferencesError;
      
      // Sign out the user
      await signOut();
      
      // Redirect to home page
      navigate("/");
      
      toast({
        title: "Account deleted",
        description: "Your account has been deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };
  
  return (
    <div className="container py-10">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/4">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="" alt={profileData.displayName || user?.email || ""} />
                  <AvatarFallback className="text-xl">
                    {profileData.firstName && profileData.lastName 
                      ? `${profileData.firstName[0]}${profileData.lastName[0]}`
                      : user?.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="font-medium">
                    {profileData.displayName || `${profileData.firstName} ${profileData.lastName}` || user?.email}
                  </h3>
                  <p className="text-sm text-muted-foreground">{profileData.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {accountDetails?.role === "premium" ? "Premium Member" : "Basic Account"}
                  </p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-1">
                <Button 
                  variant={activeTab === "profile" ? "secondary" : "ghost"} 
                  className="w-full justify-start" 
                  onClick={() => setActiveTab("profile")}
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Button>
                <Button 
                  variant={activeTab === "notifications" ? "secondary" : "ghost"} 
                  className="w-full justify-start" 
                  onClick={() => setActiveTab("notifications")}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </Button>
                <Button 
                  variant={activeTab === "security" ? "secondary" : "ghost"} 
                  className="w-full justify-start" 
                  onClick={() => setActiveTab("security")}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Security
                </Button>
              </div>
              
              <Separator className="my-4" />
              
              <Button 
                variant="ghost" 
                className="w-full justify-start text-destructive hover:text-destructive" 
                onClick={signOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:w-3/4">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>
                  Manage your personal information and investment preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName" 
                        value={profileData.firstName} 
                        onChange={(e) => setProfileData({...profileData, firstName: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        value={profileData.lastName} 
                        onChange={(e) => setProfileData({...profileData, lastName: e.target.value})} 
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input 
                        id="displayName" 
                        value={profileData.displayName} 
                        onChange={(e) => setProfileData({...profileData, displayName: e.target.value})} 
                        placeholder="How you want to be seen by others"
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave blank to use your full name
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        value={profileData.email} 
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">
                        Contact support to change your email
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea 
                      id="bio" 
                      value={profileData.bio} 
                      onChange={(e) => setProfileData({...profileData, bio: e.target.value})} 
                      placeholder="Tell us a bit about yourself as an investor"
                      rows={3}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Investment Profile</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Investment Experience</Label>
                      <RadioGroup 
                        value={profileData.experience} 
                        onValueChange={(value) => setProfileData({...profileData, experience: value})}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="beginner" id="beginner" />
                          <Label htmlFor="beginner">Beginner - New to investing</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="intermediate" id="intermediate" />
                          <Label htmlFor="intermediate">Intermediate - Some experience</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="advanced" id="advanced" />
                          <Label htmlFor="advanced">Advanced - Experienced investor</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Risk Tolerance</Label>
                      <RadioGroup 
                        value={profileData.riskTolerance} 
                        onValueChange={(value) => setProfileData({...profileData, riskTolerance: value})}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="conservative" id="conservative" />
                          <Label htmlFor="conservative">Conservative - Prioritize capital preservation</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="moderate" id="moderate" />
                          <Label htmlFor="moderate">Moderate - Balance growth and risk</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="aggressive" id="aggressive" />
                          <Label htmlFor="aggressive">Aggressive - Maximize growth potential</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Investment Goals (select all that apply)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="retirement" 
                            checked={profileData.investmentGoals.includes("retirement")}
                            onCheckedChange={() => handleInvestmentGoalChange("retirement")} 
                          />
                          <Label htmlFor="retirement">Retirement</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="wealth" 
                            checked={profileData.investmentGoals.includes("wealth")}
                            onCheckedChange={() => handleInvestmentGoalChange("wealth")} 
                          />
                          <Label htmlFor="wealth">Wealth building</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="income" 
                            checked={profileData.investmentGoals.includes("income")}
                            onCheckedChange={() => handleInvestmentGoalChange("income")} 
                          />
                          <Label htmlFor="income">Income generation</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="shortterm" 
                            checked={profileData.investmentGoals.includes("shortterm")}
                            onCheckedChange={() => handleInvestmentGoalChange("shortterm")} 
                          />
                          <Label htmlFor="shortterm">Short-term trading</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-between border-t p-6 bg-muted/30">
                <div>
                  {hasChanges && (
                    <p className="text-sm text-muted-foreground">
                      You have unsaved changes
                    </p>
                  )}
                </div>
                <Button 
                  onClick={handleSaveProfile}
                  disabled={!hasChanges || isSaving}
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!isSaving && <SaveIcon className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          )}
          
          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Manage how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Notification Channels</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="emailNotifications">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch
                        id="emailNotifications"
                        checked={notificationSettings.emailNotifications}
                        onCheckedChange={(checked) => 
                          setNotificationSettings({...notificationSettings, emailNotifications: checked})
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="pushNotifications">Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications on your device
                        </p>
                      </div>
                      <Switch
                        id="pushNotifications"
                        checked={notificationSettings.pushNotifications}
                        onCheckedChange={(checked) => 
                          setNotificationSettings({...notificationSettings, pushNotifications: checked})
                        }
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Notification Types</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="marketUpdates">Market Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Daily market news and analysis
                        </p>
                      </div>
                      <Switch
                        id="marketUpdates"
                        checked={notificationSettings.marketUpdates}
                        onCheckedChange={(checked) => 
                          setNotificationSettings({...notificationSettings, marketUpdates: checked})
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="priceAlerts">Price Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Notifications when stocks hit your target prices
                        </p>
                      </div>
                      <Switch
                        id="priceAlerts"
                        checked={notificationSettings.priceAlerts}
                        onCheckedChange={(checked) => 
                          setNotificationSettings({...notificationSettings, priceAlerts: checked})
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="tradeConfirmations">Trade Confirmations</Label>
                        <p className="text-sm text-muted-foreground">
                          Notifications about executed trades
                        </p>
                      </div>
                      <Switch
                        id="tradeConfirmations"
                        checked={notificationSettings.tradeConfirmations}
                        onCheckedChange={(checked) => 
                          setNotificationSettings({...notificationSettings, tradeConfirmations: checked})
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="accountActivity">Account Activity</Label>
                        <p className="text-sm text-muted-foreground">
                          Login attempts and security alerts
                        </p>
                      </div>
                      <Switch
                        id="accountActivity"
                        checked={notificationSettings.accountActivity}
                        onCheckedChange={(checked) => 
                          setNotificationSettings({...notificationSettings, accountActivity: checked})
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="marketingCommunications">Marketing Communications</Label>
                        <p className="text-sm text-muted-foreground">
                          Promotional offers and updates
                        </p>
                      </div>
                      <Switch
                        id="marketingCommunications"
                        checked={notificationSettings.marketingCommunications}
                        onCheckedChange={(checked) => 
                          setNotificationSettings({...notificationSettings, marketingCommunications: checked})
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-between border-t p-6 bg-muted/30">
                <div>
                  {hasChanges && (
                    <p className="text-sm text-muted-foreground">
                      You have unsaved changes
                    </p>
                  )}
                </div>
                <Button 
                  onClick={handleSaveNotifications}
                  disabled={!hasChanges || isSaving}
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!isSaving && <SaveIcon className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          )}
          
          {/* Security Tab */}
          {activeTab === "security" && (
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account security and data privacy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Account Security</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="twoFactorEnabled">Two-Factor Authentication</Label>
                        <p className="text-sm text-muted-foreground">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <Switch
                        id="twoFactorEnabled"
                        checked={securitySettings.twoFactorEnabled}
                        onCheckedChange={(checked) => 
                          setSecuritySettings({...securitySettings, twoFactorEnabled: checked})
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="loginNotifications">Login Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when someone logs into your account
                        </p>
                      </div>
                      <Switch
                        id="loginNotifications"
                        checked={securitySettings.loginNotifications}
                        onCheckedChange={(checked) => 
                          setSecuritySettings({...securitySettings, loginNotifications: checked})
                        }
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Data & Privacy</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="allowDataCollection">Data Collection</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow us to collect usage data to improve your experience
                        </p>
                      </div>
                      <Switch
                        id="allowDataCollection"
                        checked={securitySettings.allowDataCollection}
                        onCheckedChange={(checked) => 
                          setSecuritySettings({...securitySettings, allowDataCollection: checked})
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 border rounded-md bg-muted/50">
                    <h4 className="text-sm font-medium">Data Export</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      You can request an export of all your data.
                    </p>
                    <Button className="mt-2" variant="outline" size="sm">
                      Request Data Export
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive">
                          {isDeleting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            "Delete Account"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
              <CardFooter className="justify-between border-t p-6 bg-muted/30">
                <div>
                  {hasChanges && (
                    <p className="text-sm text-muted-foreground">
                      You have unsaved changes
                    </p>
                  )}
                </div>
                <Button 
                  onClick={handleSaveSecurity}
                  disabled={!hasChanges || isSaving}
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!isSaving && <SaveIcon className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
