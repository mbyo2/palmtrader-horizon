import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Activity } from 'lucide-react';

interface MonitoringMetric {
  name: string;
  value: number;
  threshold: number;
  status: 'healthy' | 'warning' | 'critical';
  unit: string;
  description: string;
}

interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export const MonitoringDashboard: React.FC = () => {
  // Mock data - in production, this would come from real monitoring services
  const metrics: MonitoringMetric[] = [
    {
      name: 'API Response Time',
      value: 250,
      threshold: 500,
      status: 'healthy',
      unit: 'ms',
      description: 'Average API response time'
    },
    {
      name: 'Database Connections',
      value: 45,
      threshold: 100,
      status: 'healthy',
      unit: 'connections',
      description: 'Active database connections'
    },
    {
      name: 'WebSocket Connections',
      value: 1250,
      threshold: 2000,
      status: 'warning',
      unit: 'connections',
      description: 'Active WebSocket connections'
    },
    {
      name: 'Error Rate',
      value: 0.5,
      threshold: 5,
      status: 'healthy',
      unit: '%',
      description: 'Application error rate'
    },
    {
      name: 'Memory Usage',
      value: 78,
      threshold: 85,
      status: 'warning',
      unit: '%',
      description: 'Server memory utilization'
    },
    {
      name: 'CPU Usage',
      value: 45,
      threshold: 80,
      status: 'healthy',
      unit: '%',
      description: 'Server CPU utilization'
    }
  ];

  const alerts: SystemAlert[] = [
    {
      id: '1',
      type: 'warning',
      message: 'High memory usage detected on server-2',
      timestamp: '2024-01-08T14:30:00Z',
      resolved: false
    },
    {
      id: '2',
      type: 'error',
      message: 'Failed to connect to external price feed',
      timestamp: '2024-01-08T14:15:00Z',
      resolved: true
    },
    {
      id: '3',
      type: 'info',
      message: 'Scheduled maintenance completed successfully',
      timestamp: '2024-01-08T13:00:00Z',
      resolved: true
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">Real-time system health and performance metrics</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          System Operational
        </Badge>
      </div>

      <Tabs defaultValue="metrics" className="w-full">
        <TabsList>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="alerts">System Alerts</TabsTrigger>
          <TabsTrigger value="logs">Recent Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map(metric => (
              <Card key={metric.name}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                    {getStatusIcon(metric.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{metric.value}</span>
                      <span className="text-sm text-muted-foreground">{metric.unit}</span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Current</span>
                        <span>Threshold: {metric.threshold}{metric.unit}</span>
                      </div>
                      <Progress 
                        value={(metric.value / metric.threshold) * 100} 
                        className="h-2"
                      />
                    </div>
                    
                    <p className="text-xs text-muted-foreground">{metric.description}</p>
                    <Badge 
                      variant={metric.status === 'healthy' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Recent system alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className={`flex items-start gap-3 p-3 border rounded-lg ${
                      alert.resolved ? 'opacity-60' : ''
                    }`}
                  >
                    {getAlertIcon(alert.type)}
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={alert.resolved ? 'secondary' : 'destructive'}>
                      {alert.resolved ? 'Resolved' : 'Active'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent System Logs</CardTitle>
              <CardDescription>Latest application and system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 font-mono text-sm">
                <div className="p-2 bg-muted rounded">
                  <span className="text-green-600">[INFO]</span> 2024-01-08 14:35:22 - API request processed successfully
                </div>
                <div className="p-2 bg-muted rounded">
                  <span className="text-blue-600">[DEBUG]</span> 2024-01-08 14:35:20 - WebSocket connection established
                </div>
                <div className="p-2 bg-muted rounded">
                  <span className="text-yellow-600">[WARN]</span> 2024-01-08 14:35:18 - High memory usage detected
                </div>
                <div className="p-2 bg-muted rounded">
                  <span className="text-green-600">[INFO]</span> 2024-01-08 14:35:15 - Database connection pool optimized
                </div>
                <div className="p-2 bg-muted rounded">
                  <span className="text-red-600">[ERROR]</span> 2024-01-08 14:35:10 - Failed to fetch external price data
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};