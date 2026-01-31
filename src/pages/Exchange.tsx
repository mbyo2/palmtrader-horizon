import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WalletOverview } from '@/components/Exchange/WalletOverview';
import { P2PTrading } from '@/components/Exchange/P2PTrading';
import { SpotTrading } from '@/components/Exchange/SpotTrading';
import { ConvertSwap } from '@/components/Exchange/ConvertSwap';
import { EarnStaking } from '@/components/Exchange/EarnStaking';
import { FuturesTrading } from '@/components/Exchange/FuturesTrading';
import { Launchpad } from '@/components/Exchange/Launchpad';
import { 
  Wallet, 
  Users, 
  TrendingUp, 
  ArrowDownUp, 
  Percent, 
  Rocket,
  BarChart3
} from 'lucide-react';

const Exchange = () => {
  const [activeTab, setActiveTab] = useState('wallet');

  const tabs = [
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'spot', label: 'Spot', icon: TrendingUp },
    { id: 'p2p', label: 'P2P', icon: Users },
    { id: 'convert', label: 'Convert', icon: ArrowDownUp },
    { id: 'futures', label: 'Futures', icon: BarChart3 },
    { id: 'earn', label: 'Earn', icon: Percent },
    { id: 'launchpad', label: 'Launchpad', icon: Rocket },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex w-auto min-w-full md:w-full">
            {tabs.map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="flex items-center gap-2 px-4"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="mt-6">
          <TabsContent value="wallet">
            <WalletOverview />
          </TabsContent>

          <TabsContent value="spot">
            <SpotTrading />
          </TabsContent>

          <TabsContent value="p2p">
            <P2PTrading />
          </TabsContent>

          <TabsContent value="convert">
            <ConvertSwap />
          </TabsContent>

          <TabsContent value="futures">
            <FuturesTrading />
          </TabsContent>

          <TabsContent value="earn">
            <EarnStaking />
          </TabsContent>

          <TabsContent value="launchpad">
            <Launchpad />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Exchange;
