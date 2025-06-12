
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AfricanMarketOverview from "@/components/African/AfricanMarketOverview";
import GovernmentSecurities from "@/components/African/GovernmentSecurities";
import MobileMoneyForm from "@/components/Banking/MobileMoneyForm";

const AfricanMarkets = () => {
  return (
    <div className="container py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">African Markets</h1>
          <p className="text-muted-foreground">
            Access local African markets, government securities, and mobile money services
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Market Overview</TabsTrigger>
            <TabsTrigger value="securities">Government Securities</TabsTrigger>
            <TabsTrigger value="mobile-money">Mobile Money</TabsTrigger>
            <TabsTrigger value="commodities">Commodities</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AfricanMarketOverview />
          </TabsContent>

          <TabsContent value="securities">
            <GovernmentSecurities />
          </TabsContent>

          <TabsContent value="mobile-money">
            <div className="max-w-md mx-auto">
              <MobileMoneyForm />
            </div>
          </TabsContent>

          <TabsContent value="commodities">
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold">Commodity Trading</h3>
              <p className="text-muted-foreground mt-2">
                Copper, gold, and agricultural commodity trading coming soon
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AfricanMarkets;
