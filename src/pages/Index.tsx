import Navbar from "@/components/Navbar";
import MarketOverview from "@/components/MarketOverview";
import StockList from "@/components/StockList";

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Market Overview</h1>
        <MarketOverview />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Popular Stocks</h2>
        <StockList />
      </main>
    </div>
  );
};

export default Index;