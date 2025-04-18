
import { memo } from "react";
import StockCard, { Stock } from "./StockCard";

interface MobileListProps {
  stocks: Stock[];
}

const MobileList = memo(({ stocks }: MobileListProps) => {
  return (
    <div className="space-y-2">
      {stocks.map(stock => (
        <StockCard key={stock.symbol} stock={stock} />
      ))}
    </div>
  );
});

MobileList.displayName = 'MobileList';

export default MobileList;
