import { supabase } from "@/integrations/supabase/client";
import { devConsole } from "@/utils/consoleCleanup";

export interface SystemMetric {
  metric_type: string;
  metric_name: string;
  metric_value: number;
  metadata?: any;
  timestamp: string;
}

export interface InfrastructureHealth {
  database: 'healthy' | 'warning' | 'error';
  storage: 'healthy' | 'warning' | 'error';
  api: 'healthy' | 'warning' | 'error';
  payments: 'healthy' | 'warning' | 'error';
  overall: 'healthy' | 'warning' | 'error';
  lastChecked: string;
}

export interface PerformanceMetrics {
  avgResponseTime: number;
  errorRate: number;
  uptime: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}

export class InfrastructureMonitoringService {
  private static readonly METRIC_TYPES = {
    PERFORMANCE: 'performance',
    BUSINESS: 'business',
    SYSTEM: 'system',
    SECURITY: 'security'
  };

  static async recordMetric(
    type: string,
    name: string,
    value: number,
    metadata: any = {}
  ): Promise<void> {
    try {
      await supabase
        .from('system_metrics')
        .insert({
          metric_type: type,
          metric_name: name,
          metric_value: value,
          metadata,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      devConsole.error('Failed to record metric:', error);
    }
  }

  static async getSystemHealth(): Promise<InfrastructureHealth> {
    const health: InfrastructureHealth = {
      database: 'healthy',
      storage: 'healthy', 
      api: 'healthy',
      payments: 'healthy',
      overall: 'healthy',
      lastChecked: new Date().toISOString()
    };

    try {
      // Test database connectivity
      const { error: dbError } = await supabase
        .from('account_details')
        .select('id')
        .limit(1);

      if (dbError) {
        health.database = 'error';
        await this.recordMetric(this.METRIC_TYPES.SYSTEM, 'database_health', 0, { error: dbError.message });
      } else {
        await this.recordMetric(this.METRIC_TYPES.SYSTEM, 'database_health', 1);
      }

      // Test storage connectivity
      try {
        const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
        if (storageError) {
          health.storage = 'error';
          await this.recordMetric(this.METRIC_TYPES.SYSTEM, 'storage_health', 0, { error: storageError.message });
        } else {
          await this.recordMetric(this.METRIC_TYPES.SYSTEM, 'storage_health', 1, { buckets: buckets?.length || 0 });
        }
      } catch (error) {
        health.storage = 'error';
        await this.recordMetric(this.METRIC_TYPES.SYSTEM, 'storage_health', 0, { error: 'Storage test failed' });
      }

      // Check recent system logs for errors
      const { data: recentLogs, error: logsError } = await supabase
        .from('system_logs')
        .select('level')
        .gte('created_at', new Date(Date.now() - 300000).toISOString()) // Last 5 minutes
        .eq('level', 'error');

      if (!logsError && recentLogs && recentLogs.length > 5) {
        health.api = 'warning';
        await this.recordMetric(this.METRIC_TYPES.SYSTEM, 'error_rate', recentLogs.length);
      } else {
        await this.recordMetric(this.METRIC_TYPES.SYSTEM, 'error_rate', recentLogs?.length || 0);
      }

      // Check payment processing health
      const { data: recentPayments, error: paymentsError } = await supabase
        .from('payment_logs')
        .select('status')
        .gte('created_at', new Date(Date.now() - 900000).toISOString()) // Last 15 minutes
        .neq('status', 'completed');

      if (!paymentsError && recentPayments && recentPayments.length > 3) {
        health.payments = 'warning';
        await this.recordMetric(this.METRIC_TYPES.SYSTEM, 'payment_failures', recentPayments.length);
      } else {
        await this.recordMetric(this.METRIC_TYPES.SYSTEM, 'payment_failures', recentPayments?.length || 0);
      }

      // Determine overall health
      const healthStates = [health.database, health.storage, health.api, health.payments];
      if (healthStates.includes('error')) {
        health.overall = 'error';
      } else if (healthStates.includes('warning')) {
        health.overall = 'warning';
      }

      await this.recordMetric(this.METRIC_TYPES.SYSTEM, 'overall_health', 
        health.overall === 'healthy' ? 1 : health.overall === 'warning' ? 0.5 : 0
      );

    } catch (error) {
      devConsole.error('Health check failed:', error);
      health.overall = 'error';
    }

    return health;
  }

  static async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      // Calculate response times from recent logs
      const { data: responseTimes } = await supabase
        .from('payment_logs')
        .select('processing_time_ms')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
        .not('processing_time_ms', 'is', null);

      const avgResponseTime = responseTimes && responseTimes.length > 0
        ? responseTimes.reduce((sum, log) => sum + (log.processing_time_ms || 0), 0) / responseTimes.length
        : 0;

      // Calculate error rate
      const { data: totalRequests } = await supabase
        .from('system_logs')
        .select('id')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString());

      const { data: errorRequests } = await supabase
        .from('system_logs')
        .select('id')
        .eq('level', 'error')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString());

      const errorRate = totalRequests && totalRequests.length > 0
        ? ((errorRequests?.length || 0) / totalRequests.length) * 100
        : 0;

      // Get active user count
      const { data: activeUsers } = await supabase
        .from('account_details')
        .select('id')
        .eq('account_status', 'active');

      const metrics: PerformanceMetrics = {
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Number(errorRate.toFixed(2)),
        uptime: 99.9, // Would be calculated from uptime monitoring
        activeConnections: activeUsers?.length || 0,
        memoryUsage: Math.random() * 80 + 10, // Simulated - would come from server metrics
        cpuUsage: Math.random() * 70 + 5 // Simulated - would come from server metrics
      };

      // Record these metrics
      await Promise.all([
        this.recordMetric(this.METRIC_TYPES.PERFORMANCE, 'avg_response_time', metrics.avgResponseTime),
        this.recordMetric(this.METRIC_TYPES.PERFORMANCE, 'error_rate', metrics.errorRate),
        this.recordMetric(this.METRIC_TYPES.PERFORMANCE, 'active_connections', metrics.activeConnections),
      ]);

      return metrics;

    } catch (error) {
      devConsole.error('Failed to get performance metrics:', error);
      return {
        avgResponseTime: 0,
        errorRate: 0,
        uptime: 0,
        activeConnections: 0,
        memoryUsage: 0,
        cpuUsage: 0
      };
    }
  }

  static async getBusinessMetrics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalTrades: number;
    totalVolume: number;
    revenueToday: number;
  }> {
    try {
      // Get user counts
      const { data: allUsers } = await supabase
        .from('account_details')
        .select('id, account_status');

      const totalUsers = allUsers?.length || 0;
      const activeUsers = allUsers?.filter(u => u.account_status === 'active').length || 0;

      // Get trading metrics
      const { data: trades } = await supabase
        .from('trades')
        .select('total_amount, created_at')
        .eq('status', 'completed');

      const totalTrades = trades?.length || 0;
      const totalVolume = trades?.reduce((sum, trade) => sum + (trade.total_amount || 0), 0) || 0;

      // Get today's revenue (simplified - from completed transactions)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayTransactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'completed')
        .eq('transaction_type', 'deposit')
        .gte('created_at', todayStart.toISOString());

      const revenueToday = todayTransactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

      // Record business metrics
      await Promise.all([
        this.recordMetric(this.METRIC_TYPES.BUSINESS, 'total_users', totalUsers),
        this.recordMetric(this.METRIC_TYPES.BUSINESS, 'active_users', activeUsers),
        this.recordMetric(this.METRIC_TYPES.BUSINESS, 'total_trades', totalTrades),
        this.recordMetric(this.METRIC_TYPES.BUSINESS, 'total_volume', totalVolume),
        this.recordMetric(this.METRIC_TYPES.BUSINESS, 'revenue_today', revenueToday),
      ]);

      return {
        totalUsers,
        activeUsers,
        totalTrades,
        totalVolume,
        revenueToday
      };

    } catch (error) {
      devConsole.error('Failed to get business metrics:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalTrades: 0,
        totalVolume: 0,
        revenueToday: 0
      };
    }
  }

  static async getHistoricalMetrics(
    metricType: string,
    metricName: string,
    hours: number = 24
  ): Promise<SystemMetric[]> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('system_metrics')
        .select('*')
        .eq('metric_type', metricType)
        .eq('metric_name', metricName)
        .gte('timestamp', since.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      return data || [];

    } catch (error) {
      devConsole.error('Failed to get historical metrics:', error);
      return [];
    }
  }

  static async startAutomaticMonitoring(): Promise<void> {
    // Monitor system health every 30 seconds
    setInterval(async () => {
      await this.getSystemHealth();
    }, 30000);

    // Monitor performance every 5 minutes  
    setInterval(async () => {
      await this.getPerformanceMetrics();
    }, 300000);

    // Monitor business metrics every hour
    setInterval(async () => {
      await this.getBusinessMetrics();
    }, 3600000);

    devConsole.log('Automatic infrastructure monitoring started');
  }
}