
import { Badge } from "@/components/ui/badge";
import { TableCell } from "@/components/ui/table";

interface BusinessDetailsProps {
  company_name: string;
  symbol: string;
  sector: string | null;
  share_capital: number;
  total_shares: number;
}

const BusinessDetails = ({ company_name, symbol, sector, share_capital, total_shares }: BusinessDetailsProps) => {
  return (
    <TableCell>
      <div className="space-y-2">
        <div className="font-medium">{company_name}</div>
        <div className="text-sm text-muted-foreground">
          Symbol: {symbol}
        </div>
        {sector && (
          <div className="text-sm text-muted-foreground">
            Sector: {sector}
          </div>
        )}
        <div className="text-sm text-muted-foreground">
          Share Capital: K{share_capital.toLocaleString()}
        </div>
        <div className="text-sm text-muted-foreground">
          Total Shares: {total_shares.toLocaleString()}
        </div>
      </div>
    </TableCell>
  );
};

export default BusinessDetails;
