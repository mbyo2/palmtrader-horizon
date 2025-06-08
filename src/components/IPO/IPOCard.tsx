
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Users } from "lucide-react";
import { IPOListing } from "@/services/IPOService";
import { format } from "date-fns";

interface IPOCardProps {
  ipo: IPOListing;
  onApply?: (ipo: IPOListing) => void;
  hasApplied?: boolean;
}

const IPOCard = ({ ipo, onApply, hasApplied }: IPOCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'default';
      case 'upcoming':
        return 'secondary';
      case 'closed':
        return 'destructive';
      case 'listed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const isSubscriptionOpen = ipo.status === 'open' && 
    new Date() >= new Date(ipo.subscription_start_date) && 
    new Date() <= new Date(ipo.subscription_end_date);

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">{ipo.company_name}</h3>
          <p className="text-muted-foreground">{ipo.symbol}</p>
        </div>
        <Badge variant={getStatusColor(ipo.status)}>
          {ipo.status.toUpperCase()}
        </Badge>
      </div>

      {ipo.description && (
        <p className="text-sm text-muted-foreground mb-4">{ipo.description}</p>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Price Range</p>
            <p className="font-medium">${ipo.issue_price_min} - ${ipo.issue_price_max}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Min Lot Size</p>
            <p className="font-medium">{ipo.minimum_lot_size} shares</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">Subscription Period</p>
          <p className="text-sm font-medium">
            {format(new Date(ipo.subscription_start_date), 'MMM d, yyyy')} - 
            {format(new Date(ipo.subscription_end_date), 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Total Shares:</span>
          <span>{ipo.total_shares.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Retail Allocation:</span>
          <span>{ipo.retail_allocation_percentage}%</span>
        </div>
        {ipo.sector && (
          <div className="flex justify-between text-sm">
            <span>Sector:</span>
            <span>{ipo.sector}</span>
          </div>
        )}
      </div>

      {onApply && (
        <div className="mt-6">
          {hasApplied ? (
            <Button disabled className="w-full">
              Application Submitted
            </Button>
          ) : (
            <Button 
              onClick={() => onApply(ipo)}
              disabled={!isSubscriptionOpen}
              className="w-full"
            >
              {isSubscriptionOpen ? 'Apply Now' : 'Subscription Closed'}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

export default IPOCard;
