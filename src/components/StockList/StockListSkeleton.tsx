
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const StockListSkeleton = () => {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex justify-between items-center">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
