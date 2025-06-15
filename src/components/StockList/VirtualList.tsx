import { memo } from "react";
import { FixedSizeList as List } from "react-window";
import EnhancedStockCard from "./EnhancedStockCard";

interface VirtualListProps {
  stocks: Stock[];
}

const VirtualList = memo(({ stocks }: VirtualListProps) => {
  const Row = memo(({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <EnhancedStockCard stock={stocks[index]} />
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
