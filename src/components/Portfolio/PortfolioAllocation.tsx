
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { supabase } from "@/integrations/supabase/client";

interface PortfolioAllocationProps {
  portfolioData: Array<{
    symbol: string;
    shares: number;
    average_price: number;
  }>;
  totalValue: number;
}

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", 
  "#82CA9D", "#FFC658", "#8DD1E1", "#A4DE6C", "#D0ED57"
];

const PortfolioAllocation = ({ portfolioData, totalValue }: PortfolioAllocationProps) => {
  // Fetch company information for better sector categorization
  const { data: companyInfo, isLoading } = useQuery({
    queryKey: ["companyInfo", portfolioData.map(item => item.symbol).join(',')],
    queryFn: async () => {
      if (portfolioData.length === 0) return [];
      
      const { data, error } = await supabase
        .from("company_fundamentals")
        .select("symbol, name, sector, industry")
        .in("symbol", portfolioData.map(item => item.symbol));
        
      if (error) throw error;
      return data || [];
    },
    enabled: portfolioData.length > 0,
  });
  
  // Calculate allocation by position
  const positionAllocation = portfolioData.map(position => {
    const positionValue = position.shares * position.average_price;
    const percentage = (positionValue / totalValue) * 100;
    const company = companyInfo?.find(c => c.symbol === position.symbol);
    
    return {
      name: position.symbol,
      value: parseFloat(percentage.toFixed(2)),
      amount: positionValue,
      fullName: company?.name || position.symbol,
    };
  }).sort((a, b) => b.value - a.value);
  
  // Calculate allocation by sector
  const calculateSectorAllocation = () => {
    const sectorMap = new Map<string, number>();
    
    portfolioData.forEach(position => {
      const positionValue = position.shares * position.average_price;
      const company = companyInfo?.find(c => c.symbol === position.symbol);
      const sector = company?.sector || "Other";
      
      const currentValue = sectorMap.get(sector) || 0;
      sectorMap.set(sector, currentValue + positionValue);
    });
    
    return Array.from(sectorMap.entries())
      .map(([sector, amount]) => ({
        name: sector,
        value: parseFloat(((amount / totalValue) * 100).toFixed(2)),
        amount,
      }))
      .sort((a, b) => b.value - a.value);
  };
  
  const sectorAllocation = calculateSectorAllocation();
  
  // Custom tooltip for the pie charts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded p-2 shadow">
          <p className="font-medium">{payload[0].name}</p>
          <p>${payload[0].payload.amount.toFixed(2)}</p>
          <p>{payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };
  
  // Custom legend for the pie charts
  const renderLegendItem = (props: any) => {
    const { payload } = props;
    
    return (
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-sm">
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center">
            <div
              className="w-3 h-3 mr-1"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.value} ({entry.payload.value}%)</span>
          </li>
        ))}
      </ul>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">Allocation by Position</h3>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : totalValue === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No portfolio data to display
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={positionAllocation}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    nameKey="name"
                    labelLine={false}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      value,
                      name,
                    }) => {
                      if (value < 5) return null;
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 25;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text
                          x={x}
                          y={y}
                          className="text-xs"
                          textAnchor={x > cx ? 'start' : 'end'}
                          dominantBaseline="central"
                        >
                          {name} ({value}%)
                        </text>
                      );
                    }}
                  >
                    {positionAllocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderLegendItem} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">Allocation by Sector</h3>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : totalValue === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No portfolio data to display
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorAllocation}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    nameKey="name"
                    labelLine={false}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      value,
                      name,
                    }) => {
                      if (value < 5) return null;
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 25;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text
                          x={x}
                          y={y}
                          className="text-xs"
                          textAnchor={x > cx ? 'start' : 'end'}
                          dominantBaseline="central"
                        >
                          {name} ({value}%)
                        </text>
                      );
                    }}
                  >
                    {sectorAllocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderLegendItem} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
      
      <Card className="p-4">
        <h3 className="text-lg font-medium mb-4">Detailed Allocation</h3>
        <div className="space-y-2">
          {isLoading ? (
            Array(5).fill(0).map((_, index) => (
              <div key={index} className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <div className="flex-1 mx-4">
                  <Skeleton className="h-4 w-full" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))
          ) : totalValue === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              No portfolio data to display
            </div>
          ) : (
            positionAllocation.map((position, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="w-24 font-medium">{position.name}</div>
                <div className="flex-1 mx-4 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${position.value}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                </div>
                <div className="w-16 text-right">{position.value}%</div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default PortfolioAllocation;
