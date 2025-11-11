import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

interface ErrorData {
  date: string;
  errors: number;
  warnings: number;
  total: number;
  errorRate: number;
}

export const ErrorRateChart = () => {
  const [data, setData] = useState<ErrorData[]>([]);
  const [errorSummary, setErrorSummary] = useState({ errors: 0, warnings: 0, info: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchErrorData();
    fetchErrorSummary();
  }, []);

  const fetchErrorData = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const { data: logs } = await supabase
        .from('system_logs')
        .select('created_at, level')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (!logs) {
        setData([]);
        return;
      }

      // Group by date
      const groupedData = logs.reduce((acc, log) => {
        const date = new Date(log.created_at).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = { errors: 0, warnings: 0, total: 0 };
        }
        acc[date].total += 1;
        if (log.level === 'error') acc[date].errors += 1;
        if (log.level === 'warn') acc[date].warnings += 1;
        return acc;
      }, {} as Record<string, { errors: number; warnings: number; total: number }>);

      const chartData = Object.entries(groupedData).map(([date, stats]) => ({
        date,
        errors: stats.errors,
        warnings: stats.warnings,
        total: stats.total,
        errorRate: Number(((stats.errors / stats.total) * 100).toFixed(2)),
      }));

      setData(chartData);
    } catch (error) {
      console.error('Error fetching error data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchErrorSummary = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: logs } = await supabase
        .from('system_logs')
        .select('level')
        .gte('created_at', today.toISOString());

      if (!logs) return;

      const summary = logs.reduce((acc, log) => {
        if (log.level === 'error') acc.errors += 1;
        else if (log.level === 'warn') acc.warnings += 1;
        else acc.info += 1;
        return acc;
      }, { errors: 0, warnings: 0, info: 0 });

      setErrorSummary(summary);
    } catch (error) {
      console.error('Error fetching error summary:', error);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Errors Today</CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{errorSummary.errors}</div>
          <p className="text-xs text-muted-foreground">Critical issues</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Warnings Today</CardTitle>
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{errorSummary.warnings}</div>
          <p className="text-xs text-muted-foreground">Non-critical issues</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Info Logs Today</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{errorSummary.info}</div>
          <p className="text-xs text-muted-foreground">Informational logs</p>
        </CardContent>
      </Card>

      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Error Rate Over Time</CardTitle>
          <CardDescription>Percentage of errors in total logs</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">Loading...</div>
          ) : data.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No error data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="errorRate" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  name="Error Rate (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Error & Warning Distribution</CardTitle>
          <CardDescription>Daily breakdown of system issues</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[250px] flex items-center justify-center">Loading...</div>
          ) : data.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="errors" fill="hsl(var(--destructive))" name="Errors" />
                <Bar dataKey="warnings" fill="hsl(var(--warning))" name="Warnings" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
