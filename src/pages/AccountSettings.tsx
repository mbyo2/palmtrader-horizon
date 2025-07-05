
import React from 'react';
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { User, Shield, CheckCircle, XCircle, Clock } from "lucide-react";

const AccountSettings = () => {
  const { isLoading } = useProtectedRoute();
  const { user, accountDetails } = useAuth();

  if (isLoading) {
    return <div className="container py-6">Loading...</div>;
  }

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center space-x-3">
        <User className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Account Settings</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile Information</span>
            </CardTitle>
            <CardDescription>
              Your basic account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Name</div>
              <div className="text-lg">
                {accountDetails?.first_name} {accountDetails?.last_name}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Email</div>
              <div className="text-lg">{user?.email}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Phone</div>
              <div className="text-lg">
                {accountDetails?.phone_number || 'Not provided'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Account Role</div>
              <Badge variant="secondary" className="mt-1">
                {accountDetails?.role?.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Account Status</span>
            </CardTitle>
            <CardDescription>
              Current verification and account status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Account Status</span>
              <div className="flex items-center space-x-2">
                {getStatusIcon(accountDetails?.account_status || 'pending')}
                <Badge className={getStatusColor(accountDetails?.account_status || 'pending')}>
                  {accountDetails?.account_status?.toUpperCase()}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">KYC Verification</span>
              <div className="flex items-center space-x-2">
                {getStatusIcon(accountDetails?.kyc_status || 'not_started')}
                <Badge className={getStatusColor(accountDetails?.kyc_status || 'not_started')}>
                  {accountDetails?.kyc_status?.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Email Verified</span>
              <div className="flex items-center space-x-2">
                {accountDetails?.is_email_verified ? 
                  <CheckCircle className="h-4 w-4 text-green-500" /> : 
                  <XCircle className="h-4 w-4 text-red-500" />
                }
                <Badge className={accountDetails?.is_email_verified ? 
                  'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }>
                  {accountDetails?.is_email_verified ? 'VERIFIED' : 'UNVERIFIED'}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Phone Verified</span>
              <div className="flex items-center space-x-2">
                {accountDetails?.is_phone_verified ? 
                  <CheckCircle className="h-4 w-4 text-green-500" /> : 
                  <XCircle className="h-4 w-4 text-red-500" />
                }
                <Badge className={accountDetails?.is_phone_verified ? 
                  'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }>
                  {accountDetails?.is_phone_verified ? 'VERIFIED' : 'UNVERIFIED'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountSettings;
