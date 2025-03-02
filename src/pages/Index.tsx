
import { MarketOverview } from "@/components/MarketOverview";
import { StockList } from "@/components/StockList";
import PortfolioPerformance from "@/components/Dashboard/PortfolioPerformance";
import { MarketNews } from "@/components/Research/MarketNews";
import { PopularStocks } from "@/components/Social/PopularStocks";

export default function Index() {
  return (
    <div className="container py-6 space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-6">
        <div className="md:col-span-4">
          <PortfolioPerformance />
        </div>
        <div className="md:col-span-2">
          <PopularStocks />
        </div>
      </div>
      
      <MarketOverview />
      
      <div className="grid gap-6 md:grid-cols-6">
        <div className="md:col-span-4">
          <StockList />
        </div>
        <div className="md:col-span-2">
          <MarketNews />
        </div>
      </div>
    </div>
  );
}
