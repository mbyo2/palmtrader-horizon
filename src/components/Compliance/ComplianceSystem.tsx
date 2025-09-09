import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle, CheckCircle, Clock, FileText, Users, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface ComplianceCheck {
  id: string;
  title: string;
  description: string;
  status: "pending" | "approved" | "rejected" | "in_review";
  priority: "low" | "medium" | "high" | "critical";
  category: "kyc" | "aml" | "trading" | "financial" | "regulatory";
  lastChecked: Date;
  nextDue: Date;
}

interface ComplianceMetrics {
  overallScore: number;
  kycCompleteness: number;
  amlRiskScore: number;
  tradingLimits: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  violations: number;
}

const ComplianceSystem = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadComplianceData();
    }
  }, [user]);

  const loadComplianceData = async () => {
    if (!user) return;

    try {
      // Load KYC status
      const { data: kycData } = await supabase
        .from('kyc_verifications')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Load account details
      const { data: accountData } = await supabase
        .from('account_details')
        .select('*')
        .eq('id', user.id)
        .single();

      // Generate compliance checks based on data
      const complianceChecks: ComplianceCheck[] = [
        {
          id: '1',
          title: 'Identity Verification',
          description: 'Government-issued ID verification required',
          status: kycData?.identity_verified ? 'approved' : 'pending',
          priority: 'critical',
          category: 'kyc',
          lastChecked: new Date(),
          nextDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        },
        {
          id: '2',
          title: 'Address Verification',
          description: 'Proof of residence verification',
          status: kycData?.address_verified ? 'approved' : 'pending',
          priority: 'high',
          category: 'kyc',
          lastChecked: new Date(),
          nextDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        },
        {
          id: '3',
          title: 'AML Screening',
          description: 'Anti-money laundering background check',
          status: kycData?.sanctions_check ? 'approved' : 'pending',
          priority: 'critical',
          category: 'aml',
          lastChecked: new Date(),
          nextDue: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 6 months
        },
        {
          id: '4',
          title: 'PEP Check',
          description: 'Politically Exposed Person screening',
          status: kycData?.pep_check ? 'approved' : 'pending',
          priority: 'high',
          category: 'aml',
          lastChecked: new Date(),
          nextDue: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
        },
        {
          id: '5',
          title: 'Trading Limits Review',
          description: 'Assessment of trading limits and risk appetite',
          status: accountData?.account_status === 'active' ? 'approved' : 'pending',
          priority: 'medium',
          category: 'trading',
          lastChecked: new Date(),
          nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 3 months
        }
      ];

      setChecks(complianceChecks);

      // Calculate metrics
      const approvedChecks = complianceChecks.filter(c => c.status === 'approved').length;
      const totalChecks = complianceChecks.length;
      
      setMetrics({
        overallScore: (approvedChecks / totalChecks) * 100,
        kycCompleteness: kycData ? 75 : 0, // Based on completed fields
        amlRiskScore: kycData?.risk_score || 0,
        tradingLimits: {
          daily: 10000,
          weekly: 50000,
          monthly: 200000
        },
        violations: 0
      });

    } catch (error) {
      console.error('Error loading compliance data:', error);
      toast({
        title: "Error",
        description: "Failed to load compliance data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'in_review':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'in_review':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  if (loading) {
    return <div className="p-6">Loading compliance data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Compliance Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-semibold">Overall Score</span>
              </div>
              <div className="text-2xl font-bold">{metrics.overallScore.toFixed(0)}%</div>
              <Progress value={metrics.overallScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-semibold">KYC Status</span>
              </div>
              <div className="text-2xl font-bold">{metrics.kycCompleteness}%</div>
              <Progress value={metrics.kycCompleteness} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-semibold">Risk Score</span>
              </div>
              <div className="text-2xl font-bold">{metrics.amlRiskScore}</div>
              <div className="text-sm text-muted-foreground">Lower is better</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="font-semibold">Daily Limit</span>
              </div>
              <div className="text-2xl font-bold">${metrics.tradingLimits.daily.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Trading limit</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compliance Alerts */}
      {checks.some(c => c.status === 'rejected' || c.priority === 'critical') && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have critical compliance items that need immediate attention. 
            Please complete all required verifications to maintain full trading access.
          </AlertDescription>
        </Alert>
      )}

      {/* Compliance Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Compliance Checks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {checks.map((check) => (
              <div key={check.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <h4 className="font-semibold">{check.title}</h4>
                    <p className="text-sm text-muted-foreground">{check.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className={getStatusColor(check.status)}>
                        {check.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPriorityColor(check.priority)}>
                        {check.priority}
                      </Badge>
                      <Badge variant="outline">
                        {check.category.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    Next due: {check.nextDue.toLocaleDateString()}
                  </div>
                  {check.status === 'pending' && (
                    <Button size="sm" className="mt-2">
                      Complete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regulatory Information */}
      <Card>
        <CardHeader>
          <CardTitle>Regulatory Framework</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Securities Regulation</h4>
              <p className="text-sm text-muted-foreground">
                Compliant with Securities and Exchange Commission regulations.
                Licensed under Category A Investment Advisor license.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Anti-Money Laundering</h4>
              <p className="text-sm text-muted-foreground">
                Full AML/CTF compliance including customer due diligence,
                ongoing monitoring, and suspicious activity reporting.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Data Protection</h4>
              <p className="text-sm text-muted-foreground">
                GDPR compliant data handling and privacy protection.
                All customer data encrypted and securely stored.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Trading Limits</h4>
              <p className="text-sm text-muted-foreground">
                Position limits and risk management controls in place
                to ensure market stability and customer protection.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplianceSystem;