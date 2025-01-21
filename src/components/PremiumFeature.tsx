import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccountStatus } from "@/hooks/useAccountStatus";
import { Crown, Lock } from "lucide-react";

interface PremiumFeatureProps {
  children: ReactNode;
  fallback?: ReactNode;
}

const PremiumFeature = ({ children, fallback }: PremiumFeatureProps) => {
  const { isPremium, isActive } = useAccountStatus();

  if (!isActive()) {
    return (
      <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20">
        <div className="text-center">
          <Lock className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
            Account Not Active
          </h3>
          <p className="text-sm text-yellow-600 dark:text-yellow-300 mt-1">
            Please complete account verification to access this feature.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.href = '/verify'}
          >
            Complete Verification
          </Button>
        </div>
      </Card>
    );
  }

  if (!isPremium()) {
    return fallback || (
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
        <div className="text-center">
          <Crown className="w-8 h-8 mx-auto text-purple-500 mb-2" />
          <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200">
            Premium Feature
          </h3>
          <p className="text-sm text-purple-600 dark:text-purple-300 mt-1">
            Upgrade to Premium to access advanced trading features.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.href = '/upgrade'}
          >
            Upgrade to Premium
          </Button>
        </div>
      </Card>
    );
  }

  return <>{children}</>;
};

export default PremiumFeature;