
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, AlertTriangle, FileText } from "lucide-react";
import { KYCStatus } from "@/services/KYCVerificationService";

interface KYCStatusCardProps {
  kycStatus: KYCStatus | null;
}

const KYCStatusCard = ({ kycStatus }: KYCStatusCardProps) => {
  if (!kycStatus) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getVerificationProgress = () => {
    let completed = 0;
    let total = 4;
    
    if (kycStatus.emailVerified) completed++;
    if (kycStatus.phoneVerified) completed++;
    if (kycStatus.identityVerified) completed++;
    if (kycStatus.addressVerified) completed++;
    
    return (completed / total) * 100;
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'advanced': return 'default';
      case 'intermediate': return 'secondary';
      case 'basic': return 'outline';
      default: return 'destructive';
    }
  };

  const getAMLStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const progress = getVerificationProgress();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            KYC Verification
          </CardTitle>
          <Badge variant={getLevelBadgeVariant(kycStatus.level)}>
            {kycStatus.level.charAt(0).toUpperCase() + kycStatus.level.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Verification Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            {kycStatus.emailVerified ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Clock className="h-4 w-4 text-gray-400" />
            )}
            <span>Email Verified</span>
          </div>

          <div className="flex items-center gap-2">
            {kycStatus.phoneVerified ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Clock className="h-4 w-4 text-gray-400" />
            )}
            <span>Phone Verified</span>
          </div>

          <div className="flex items-center gap-2">
            {kycStatus.identityVerified ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Clock className="h-4 w-4 text-gray-400" />
            )}
            <span>Identity Verified</span>
          </div>

          <div className="flex items-center gap-2">
            {kycStatus.addressVerified ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Clock className="h-4 w-4 text-gray-400" />
            )}
            <span>Address Verified</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {getAMLStatusIcon(kycStatus.amlStatus)}
            <span className="text-sm">AML Status: {kycStatus.amlStatus}</span>
          </div>
          <Badge variant="outline">
            Risk: {kycStatus.riskScore}/100
          </Badge>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Trading Limits</h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-medium">${kycStatus.tradingLimits.dailyLimit.toLocaleString()}</div>
              <div className="text-muted-foreground">Daily</div>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-medium">${kycStatus.tradingLimits.monthlyLimit.toLocaleString()}</div>
              <div className="text-muted-foreground">Monthly</div>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-medium">${kycStatus.tradingLimits.positionLimit.toLocaleString()}</div>
              <div className="text-muted-foreground">Position</div>
            </div>
          </div>
        </div>

        {kycStatus.level === 'none' && (
          <Button className="w-full" variant="outline">
            Start Verification Process
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default KYCStatusCard;
