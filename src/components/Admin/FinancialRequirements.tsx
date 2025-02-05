
import { Badge } from "@/components/ui/badge";
import { TableCell } from "@/components/ui/table";

interface FinancialRequirementsProps {
  public_shares_percentage: number;
  total_shareholders: number;
  financial_statements_submitted: boolean;
}

const FinancialRequirements = ({ 
  public_shares_percentage, 
  total_shareholders, 
  financial_statements_submitted 
}: FinancialRequirementsProps) => {
  return (
    <TableCell>
      <div className="space-y-2">
        <div>Public Shares: {public_shares_percentage}%</div>
        <div>Shareholders: {total_shareholders}</div>
        <div>
          Financial Statements: 
          <Badge className={financial_statements_submitted ? "bg-green-500 ml-2" : "bg-red-500 ml-2"}>
            {financial_statements_submitted ? "Submitted" : "Missing"}
          </Badge>
        </div>
      </div>
    </TableCell>
  );
};

export default FinancialRequirements;
