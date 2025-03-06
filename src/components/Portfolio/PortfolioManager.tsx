
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import PortfolioSummary from "./PortfolioSummary";
import PortfolioPositions from "./PortfolioPositions";
import PortfolioAllocation from "./PortfolioAllocation";
import PortfolioPerformance from "./PortfolioPerformance";
import { ReloadIcon } from "lucide-react";
import { toast } from "sonner";

const PortfolioManager = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("summary");
  
  const { 
    data: portfolioData, 
    isLoading, 
    isError, 
    refetch,
    isFetching 
  } = useQuery({
    queryKey: ["portfolio", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("portfolio")
        .select("*")
        .eq("user_id", user.id);
        
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Calculate total portfolio value
  const totalValue = portfolioData?.reduce(
    (sum, position) => sum + (position.shares * position.average_price),
    0
  ) || 0;
  
  const handleRefresh = () => {
    refetch();
    toast.success("Portfolio data refreshed");
  };
  
  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <p className="text-destructive mb-2">Failed to load portfolio data</p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Portfolio Manager</CardTitle>
          <CardDescription>Manage and track your investments</CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isFetching}
        >
          {isFetching ? (
            <ReloadIcon className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <ReloadIcon className="h-4 w-4 mr-1" />
          )}
          Refresh
        </Button>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-[100px]" />
              <Skeleton className="h-[100px]" />
              <Skeleton className="h-[100px]" />
            </div>
          </div>
        ) : (
          <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="positions">Positions</TabsTrigger>
              <TabsTrigger value="allocation">Allocation</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary">
              <PortfolioSummary 
                portfolioData={portfolioData || []}
                totalValue={totalValue}
              />
            </TabsContent>
            
            <TabsContent value="positions">
              <PortfolioPositions 
                portfolioData={portfolioData || []}
                onRefresh={refetch}
              />
            </TabsContent>
            
            <TabsContent value="allocation">
              <PortfolioAllocation 
                portfolioData={portfolioData || []}
                totalValue={totalValue}
              />
            </TabsContent>
            
            <TabsContent value="performance">
              <PortfolioPerformance
                portfolioData={portfolioData || []}
                totalValue={totalValue}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default PortfolioManager;
