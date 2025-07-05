import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Shield, 
  AlertTriangle,
  Activity,
  FileText,
  Settings
} from "lucide-react";
import UserManagement from "./UserManagement";
import SystemMonitoring from "./SystemMonitoring";
import BusinessApproval from "./BusinessApproval";
import ContentModeration from "./ContentModeration";

export const SuperUserDashboard = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const systemStats = [
    { title: "Total Users", value: "2,543", icon: Users, change: "+12%" },
    { title: "Total Volume", value: "$1.2M", icon: TrendingUp, change: "+8%" },
    { title: "Revenue", value: "$45K", icon: DollarSign, change: "+15%" },
    { title: "Active Trades", value: "89", icon: Activity, change: "+5%" },
  ];

  const createAdminUser = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Create user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (authError) throw authError;

      // Update their role to admin
      if (authData.user) {
        const { error: updateError } = await supabase
          .from('account_details')
          .update({ role: 'admin', account_status: 'active' })
          .eq('id', authData.user.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Admin user created",
        description: "New admin user has been created successfully",
      });
    } catch (error) {
      console.error('Error creating admin user:', error);
      toast({
        title: "Error creating admin user",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Super User Dashboard</h1>
          <p className="text-muted-foreground">Complete system administration and monitoring</p>
        </div>
        <Badge variant="secondary" className="bg-red-100 text-red-800">
          <Shield className="h-4 w-4 mr-1" />
          Super Admin
        </Badge>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {systemStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">{stat.change}</span> from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="system">
          <SystemMonitoring />
        </TabsContent>

        <TabsContent value="business">
          <BusinessApproval />
        </TabsContent>

        <TabsContent value="content">
          <ContentModeration />
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                System Reports
              </CardTitle>
              <CardDescription>
                Generate and download system reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <FileText className="h-6 w-6 mb-2" />
                  User Activity Report
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <TrendingUp className="h-6 w-6 mb-2" />
                  Trading Volume Report
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <DollarSign className="h-6 w-6 mb-2" />
                  Financial Report
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Shield className="h-6 w-6 mb-2" />
                  Compliance Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure system-wide settings and create admin users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Create Admin User</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email</Label>
                    <Input id="admin-email" type="email" placeholder="admin@palmcacia.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <Input id="admin-password" type="password" placeholder="Secure password" />
                  </div>
                </div>
                <Button 
                  onClick={() => {
                    const email = (document.getElementById('admin-email') as HTMLInputElement)?.value;
                    const password = (document.getElementById('admin-password') as HTMLInputElement)?.value;
                    if (email && password) {
                      createAdminUser(email, password);
                    }
                  }}
                  disabled={loading}
                >
                  Create Admin User
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">System Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Trading Hours</Label>
                    <Input defaultValue="9:00 AM - 4:00 PM" />
                  </div>
                  <div className="space-y-2">
                    <Label>Market Status</Label>
                    <Input defaultValue="Open" />
                  </div>
                  <div className="space-y-2">
                    <Label>Maintenance Mode</Label>
                    <Input defaultValue="Disabled" />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Daily Volume</Label>
                    <Input defaultValue="$10,000,000" />
                  </div>
                </div>
                <Button>Save Configuration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};