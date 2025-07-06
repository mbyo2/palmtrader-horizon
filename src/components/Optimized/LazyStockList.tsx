import { lazy, Suspense, memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load heavy components
const VirtualList = lazy(() => import("../StockList/VirtualList"));
const MobileList = lazy(() => import("../StockList/MobileList"));

interface LazyStockListProps {
  stocks: any[];
  isMobile: boolean;
}

const LazyStockList = memo(({ stocks, isMobile }: LazyStockListProps) => {
  const ListComponent = isMobile ? MobileList : VirtualList;
  
  return (
    <Suspense 
      fallback={
        <div className="space-y-2">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      }
    >
      <ListComponent stocks={stocks} />
    </Suspense>
  );
});

LazyStockList.displayName = 'LazyStockList';

export default LazyStockList;