import { Card } from "@/components/ui/card";

const MarketOverview = () => {
  const markets = [
    { name: "Lusaka SEC", value: "7,245.32", change: "+1.2%" },
    { name: "NSE", value: "54,123.45", change: "-0.5%" },
    { name: "JSE", value: "68,432.12", change: "+0.8%" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {markets.map((market) => (
        <Card key={market.name} className="p-4">
          <h3 className="font-semibold text-gray-700">{market.name}</h3>
          <p className="text-2xl font-bold">{market.value}</p>
          <span className={`text-sm ${market.change.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
            {market.change}
          </span>
        </Card>
      ))}
    </div>
  );
};

export default MarketOverview;