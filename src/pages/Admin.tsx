import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';
import { SuperUserDashboard } from "@/components/Admin/SuperUserDashboard";
import { Button } from '@/components/ui/button';

const Admin = () => {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Small delay to ensure roles are loaded
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading || isChecking) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Authentication Required
            </CardTitle>
            <CardDescription>
              Please sign in to access the admin panel.
            </CardDescription>
          </CardHeader>
          <div className="p-6 pt-0">
            <Button onClick={() => navigate('/auth')} className="w-full">
              Sign In
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access the admin panel. 
              Only users with the admin role can view this page.
            </CardDescription>
          </CardHeader>
          <div className="p-6 pt-0">
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              Return to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <SuperUserDashboard />;
};

export default Admin;
