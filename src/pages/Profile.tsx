import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { usePortfolio } from "@/hooks/usePortfolio";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  Shield, 
  Camera, 
  CheckCircle, 
  XCircle, 
  Clock,
  Award,
  TrendingUp,
  DollarSign
} from "lucide-react";

interface UserProfile {
  display_name?: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  phone?: string;
  investment_experience?: string;
  risk_tolerance?: string;
  investment_goals?: string[];
}

// Component to display activity stats from real data
const ActivityStats = ({ userId }: { userId?: string }) => {
  const { summary, isSummaryLoading } = usePortfolio();
  
  const { data: tradeStats, isLoading: isTradeStatsLoading } = useQuery({
    queryKey: ["tradeStats", userId],
    queryFn: async () => {
      if (!userId) return { totalTrades: 0, successRate: 0 };
      
      const { data: trades, error } = await supabase
        .from('trades')
        .select('id, status, type')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      const totalTrades = trades?.length || 0;
      const completedTrades = trades?.filter(t => t.status === 'completed').length || 0;
      const successRate = totalTrades > 0 ? Math.round((completedTrades / totalTrades) * 100) : 0;
      
      return { totalTrades, successRate };
    },
    enabled: !!userId,
  });

  if (isTradeStatsLoading || isSummaryLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const portfolioValue = summary?.totalValue || 0;
  const gainLossPercent = summary?.gainLossPercentage || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{tradeStats?.totalTrades || 0}</div>
          <p className="text-xs text-muted-foreground">
            All time trades
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">
            <span className={gainLossPercent >= 0 ? "text-green-600" : "text-red-600"}>
              {gainLossPercent >= 0 ? "+" : ""}{gainLossPercent.toFixed(1)}%
            </span> overall
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{tradeStats?.successRate || 0}%</div>
          <p className="text-xs text-muted-foreground">
            Completed trades
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// Component to display recent activity from real data
const RecentActivityList = ({ userId }: { userId?: string }) => {
  const { data: recentActivity, isLoading } = useQuery({
    queryKey: ["recentActivity", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Get recent trades
      const { data: trades } = await supabase
        .from('trades')
        .select('id, symbol, type, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Get recent fund transfers
      const { data: transfers } = await supabase
        .from('fund_transfers')
        .select('id, direction, amount, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Combine and sort
      const activities: Array<{
        id: string;
        type: string;
        description: string;
        status: string;
        created_at: string;
      }> = [];
      
      trades?.forEach(trade => {
        activities.push({
          id: trade.id,
          type: 'trade',
          description: `${trade.type === 'buy' ? 'Bought' : 'Sold'} ${trade.symbol}`,
          status: trade.status,
          created_at: trade.created_at
        });
      });
      
      transfers?.forEach(transfer => {
        activities.push({
          id: transfer.id,
          type: 'transfer',
          description: `${transfer.direction === 'deposit' ? 'Deposited' : 'Withdrew'} $${transfer.amount}`,
          status: transfer.status,
          created_at: transfer.created_at
        });
      });
      
      // Sort by date
      return activities.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 10);
    },
    enabled: !!userId,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled':
      case 'failed': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-4 p-3 border rounded-lg">
                <Skeleton className="h-2 w-2 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your latest account activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivity && recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                <div className={`h-2 w-2 ${getStatusColor(activity.status)} rounded-full`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">{formatTimeAgo(activity.created_at)}</p>
                </div>
                <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'}>
                  {activity.status}
                </Badge>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-4">No recent activity</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const Profile = () => {
  const { isLoading } = useProtectedRoute();
  const { user, accountDetails } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile>({});
  const [saving, setSaving] = useState(false);
  const [completionScore, setCompletionScore] = useState(0);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile(data);
        calculateCompletionScore(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const calculateCompletionScore = (profileData: UserProfile) => {
    const fields = [
      profileData.display_name,
      profileData.first_name,
      profileData.last_name,
      profileData.bio,
      profileData.phone,
      profileData.investment_experience,
      profileData.risk_tolerance
    ];
    
    const completed = fields.filter(field => field && field.length > 0).length;
    const score = Math.round((completed / fields.length) * 100);
    setCompletionScore(score);
  };

  const saveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          ...profile,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully",
      });
      
      calculateCompletionScore(profile);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error saving profile",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
      case 'suspended':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return <div className="container py-6">Loading...</div>;
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src="/placeholder-avatar.jpg" alt="Profile" />
            <AvatarFallback className="text-xl bg-gradient-to-r from-primary to-secondary text-white">
              {accountDetails?.first_name?.[0] || user?.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">
              {profile.display_name || `${accountDetails?.first_name} ${accountDetails?.last_name}` || 'User Profile'}
            </h1>
            <p className="text-muted-foreground">{user?.email}</p>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant={accountDetails?.role === 'premium' ? 'default' : 'secondary'}>
                {accountDetails?.role?.toUpperCase()}
              </Badge>
              {getStatusIcon(accountDetails?.account_status || 'pending')}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Camera className="h-4 w-4 mr-2" />
          Change Photo
        </Button>
      </div>

      {/* Profile Completion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Profile Completion
          </CardTitle>
          <CardDescription>
            Complete your profile to unlock all features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">{completionScore}%</span>
            </div>
            <Progress value={completionScore} className="w-full" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="investment">Investment Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input 
                    id="display_name"
                    value={profile.display_name || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, display_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input 
                    id="first_name"
                    value={profile.first_name || accountDetails?.first_name || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, first_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input 
                    id="last_name"
                    value={profile.last_name || accountDetails?.last_name || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, last_name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea 
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={profile.bio || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                />
              </div>
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Investment Profile</CardTitle>
              <CardDescription>
                Help us understand your investment preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="experience">Investment Experience</Label>
                  <select 
                    id="experience"
                    className="w-full p-2 border rounded-md"
                    value={profile.investment_experience || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, investment_experience: e.target.value }))}
                  >
                    <option value="">Select experience level</option>
                    <option value="beginner">Beginner (0-1 years)</option>
                    <option value="intermediate">Intermediate (2-5 years)</option>
                    <option value="advanced">Advanced (5+ years)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="risk_tolerance">Risk Tolerance</Label>
                  <select 
                    id="risk_tolerance"
                    className="w-full p-2 border rounded-md"
                    value={profile.risk_tolerance || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, risk_tolerance: e.target.value }))}
                  >
                    <option value="">Select risk tolerance</option>
                    <option value="conservative">Conservative</option>
                    <option value="moderate">Moderate</option>
                    <option value="aggressive">Aggressive</option>
                  </select>
                </div>
              </div>
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save Investment Profile'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security and verification status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Email Verification</h4>
                    <p className="text-sm text-muted-foreground">Verify your email address</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {accountDetails?.is_email_verified ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Badge className="bg-green-100 text-green-800">Verified</Badge>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <Button size="sm">Verify Email</Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Phone Verification</h4>
                    <p className="text-sm text-muted-foreground">Verify your phone number</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {accountDetails?.is_phone_verified ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Badge className="bg-green-100 text-green-800">Verified</Badge>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <Button size="sm">Verify Phone</Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">KYC Verification</h4>
                    <p className="text-sm text-muted-foreground">Complete identity verification</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(accountDetails?.kyc_status || 'not_started')}
                    <Badge className={
                      accountDetails?.kyc_status === 'approved' ? 'bg-green-100 text-green-800' :
                      accountDetails?.kyc_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {accountDetails?.kyc_status?.replace('_', ' ').toUpperCase() || 'NOT STARTED'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <ActivityStats userId={user?.id} />
          
          <RecentActivityList userId={user?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;