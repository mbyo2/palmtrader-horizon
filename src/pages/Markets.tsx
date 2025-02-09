
import AdvancedChart from "@/components/Research/AdvancedChart";
import ResearchTools from "@/components/Research/ResearchTools";

const Markets = () => {
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Markets</h1>
      <div className="space-y-6">
        <AdvancedChart />
        <ResearchTools />
      </div>
    </div>
  );
};

export default Markets;
