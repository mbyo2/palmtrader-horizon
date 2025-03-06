
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, Line, ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface PortfolioPerformanceProps {
  portfolioData: any[];
  totalValue: number;
}

const PortfolioPerformance = ({ portfolioData, totalValue }: PortfolioPerformanceProps) => {
  // Mock performance data - in a real app, this would come from backend
  const performanceData = [
    { name: "Jan", value: 10000, change: 500 },
    { name: "Feb", value: 11000, change: 1000 },
    { name: "Mar", value: 10500, change: -500 },
    { name: "Apr", value: 11200, change: 700 },
    { name: "May", value: 12100, change: 900 },
    { name: "Jun", value: 12800, change: 700 },
    { name: "Jul", value: 13100, change: 300 },
    { name: "Aug", value: 14000, change: 900 },
    { name: "Sep", value: 13800, change: -200 },
    { name: "Oct", value: 14500, change: 700 },
    { name: "Nov", value: 15200, change: 700 },
    { name: "Dec", value: 16000, change: 800 },
  ];

  // Calculate total gain/loss
  const initialValue = performanceData[0].value;
  const currentValue = performanceData[performanceData.length - 1].value;
  const totalGain = currentValue - initialValue;
  const totalGainPercentage = ((currentValue - initialValue) / initialValue) * 100;
  
  if (portfolioData.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center p-6">
        <p className="text-lg text-center text-muted-foreground">No portfolio data available</p>
        <p className="text-sm text-center text-muted-foreground mt-2">
          Add positions to your portfolio to see performance data
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold mr-2">${totalGain.toLocaleString()}</div>
              <Badge variant={totalGain >= 0 ? "success" : "destructive"}>
                {totalGain >= 0 ? "+" : ""}{totalGainPercentage.toFixed(2)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Number of Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioData.length}</div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend />
                <Bar dataKey="change" name="Monthly Change" fill="#8884d8" />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  name="Portfolio Value" 
                  stroke="#10b981" 
                  dot={{ r: 4 }} 
                  activeDot={{ r: 8 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioPerformance;
