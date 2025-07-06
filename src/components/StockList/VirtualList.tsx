
import { memo, useMemo, useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import EnhancedStockCard from "./EnhancedStockCard";
import type { Stock } from "./EnhancedStockCard";

interface VirtualListProps {
  stocks: Stock[];
}

const VirtualList = memo(({ stocks }: VirtualListProps) => {
  // Memoize the row component with optimized props
  const Row = memo(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const stock = stocks[index];
    
    // Early return if stock doesn't exist
    if (!stock) return null;

    return (
      <div 
        style={style}
        data-index={index}
        className="will-change-transform"
      >
        <EnhancedStockCard stock={stock} />
      </div>
    );
  });

  Row.displayName = 'OptimizedRow';

  // Memoize list dimensions for stability
  const listConfig = useMemo(() => ({
    height: Math.min(600, stocks.length * 100),
    itemCount: stocks.length,
    itemSize: 100,
    overscanCount: Math.min(5, Math.ceil(stocks.length * 0.1)) // Adaptive overscan
  }), [stocks.length]);

  // Optimize rendering with intersection observer pattern
  const getItemKey = useCallback((index: number) => {
    return stocks[index]?.symbol || `item-${index}`;
  }, [stocks]);

  return (
    <div 
      className="h-[600px] contain-layout contain-style"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 600px' }}
    >
      <List
        height={listConfig.height}
        itemCount={listConfig.itemCount}
        itemSize={listConfig.itemSize}
        width="100%"
        overscanCount={listConfig.overscanCount}
        itemKey={getItemKey}
        useIsScrolling={true}
        initialScrollOffset={0}
      >
        {Row}
      </List>
    </div>
  );
});

VirtualList.displayName = 'VirtualList';

export default VirtualList;
