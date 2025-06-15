
import { memo } from "react";
import EnhancedStockCard from "./EnhancedStockCard";
import type { Stock } from "./EnhancedStockCard";

interface MobileListProps {
  stocks: Stock[];
}

const MobileList = memo(({ stocks }: MobileListProps) => {
  return (
    <div className="space-y-2">
      {stocks.map(stock => (
        <EnhancedStockCard key={stock.symbol} stock={stock} />
      ))}
    </div>
  );
});

MobileList.displayName = 'MobileList';

export default MobileList;
