import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const AnalystRatings = ({ symbol }: { symbol: string }) => {
  const { data: ratings, isLoading } = useQuery({
    queryKey: ["analyst-ratings", symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyst_ratings")
        .select("*")
        .eq("symbol", symbol)
        .order("rating_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const priceTargets = ratings?.map((rating) => ({
    name: rating.analyst_firm,
    target: rating.price_target,
    previous: rating.previous_price_target,
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Analyst Ratings</h3>
      <div className="h-64">
        <ChartContainer
          className="h-full w-full"
          config={{
            target: {
              theme: {
                light: "hsl(var(--primary))",
                dark: "hsl(var(--primary))",
              },
            },
            previous: {
              theme: {
                light: "hsl(var(--muted))",
                dark: "hsl(var(--muted))",
              },
            },
          }}
        >
          <BarChart data={priceTargets} layout="vertical">
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={100} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="previous" name="Previous Target" fill="var(--color-previous)" />
            <Bar dataKey="target" name="Price Target" fill="var(--color-target)" />
          </BarChart>
        </ChartContainer>
      </div>
    </Card>
  );
};

export default AnalystRatings;