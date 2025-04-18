
import { memo } from "react";
import { FixedSizeList as List } from "react-window";
import StockCard, { Stock } from "./StockCard";

interface VirtualListProps {
  stocks: Stock[];
}

const VirtualList = memo(({ stocks }: VirtualListProps) => {
  const Row = memo(({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <StockCard stock={stocks[index]} />
    </div>
  ));

  Row.displayName = 'Row';

  return (
    <div className="h-[600px] content-visibility-auto">
      <List
        height={600}
        itemCount={stocks.length}
        itemSize={100}
        width="100%"
        overscanCount={2}
      >
        {Row}
      </List>
    </div>
  );
});

VirtualList.displayName = 'VirtualList';

export default VirtualList;
