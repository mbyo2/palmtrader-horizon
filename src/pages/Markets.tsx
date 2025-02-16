
import { useQuery } from "@tanstack/react-query";
import AdvancedChart from "@/components/Research/AdvancedChart";
import ResearchTools from "@/components/Research/ResearchTools";
import { MarketDataService } from "@/services/MarketDataService";

const Markets = () => {
  const { data: marketData = [] } = useQuery({
    queryKey: ['marketData', 'AAPL'], // Using AAPL as default symbol
    queryFn: () => MarketDataService.fetchHistoricalData('AAPL', 30),
    initialData: []
  });

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Markets</h1>
      <div className="space-y-6">
        <AdvancedChart data={marketData} />
        <ResearchTools />
      </div>
    </div>
  );
};

export default Markets;
