interface PerformanceMetrics {
  componentRenders: Map<string, number>;
  apiCalls: Map<string, { count: number; totalTime: number }>;
  memoryUsage: number;
  wsConnections: number;
  cacheHitRate: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private startTime: number;
  private observers: Map<string, PerformanceObserver> = new Map();

  private constructor() {
    this.metrics = {
      componentRenders: new Map(),
      apiCalls: new Map(),
      memoryUsage: 0,
      wsConnections: 0,
      cacheHitRate: 0.85
    };
    this.startTime = Date.now();
    this.initializeObservers();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeObservers() {
    // Observe long tasks
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            console.warn(`Long task detected: ${entry.duration}ms`, entry);
          }
        }
      });

      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (e) {
        console.log('Long task observer not supported');
      }

      // Observe layout shifts
      const layoutShiftObserver = new PerformanceObserver((list) => {
        let cumulativeScore = 0;
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            cumulativeScore += (entry as any).value;
          }
        }
        if (cumulativeScore > 0.1) {
          console.warn(`Layout shift detected: ${cumulativeScore}`);
        }
      });

      try {
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('layout-shift', layoutShiftObserver);
      } catch (e) {
        console.log('Layout shift observer not supported');
      }
    }

    // Monitor memory usage
    setInterval(() => {
      if ('memory' in performance) {
        this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
      }
    }, 10000);
  }

  trackComponentRender(componentName: string) {
    const current = this.metrics.componentRenders.get(componentName) || 0;
    this.metrics.componentRenders.set(componentName, current + 1);
  }

  trackApiCall(endpoint: string, duration: number) {
    const current = this.metrics.apiCalls.get(endpoint) || { count: 0, totalTime: 0 };
    this.metrics.apiCalls.set(endpoint, {
      count: current.count + 1,
      totalTime: current.totalTime + duration
    });
  }

  updateWebSocketConnections(count: number) {
    this.metrics.wsConnections = count;
  }

  updateCacheHitRate(rate: number) {
    this.metrics.cacheHitRate = rate;
  }

  getMetrics(): PerformanceMetrics & { uptime: number } {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime
    };
  }

  // Performance recommendations
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Check for excessive re-renders
    this.metrics.componentRenders.forEach((count, component) => {
      if (count > 100) {
        recommendations.push(`${component} has rendered ${count} times - consider memoization`);
      }
    });

    // Check API performance
    this.metrics.apiCalls.forEach((stats, endpoint) => {
      const avgTime = stats.totalTime / stats.count;
      if (avgTime > 1000) {
        recommendations.push(`${endpoint} averaging ${avgTime}ms - consider caching`);
      }
    });

    // Check memory usage
    if (this.metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push('High memory usage detected - check for memory leaks');
    }

    // Check cache hit rate
    if (this.metrics.cacheHitRate < 0.7) {
      recommendations.push('Low cache hit rate - optimize caching strategy');
    }

    return recommendations;
  }

  // Export metrics for monitoring dashboard
  exportMetrics() {
    const metrics = this.getMetrics();
    const recommendations = this.getRecommendations();
    
    return {
      timestamp: new Date().toISOString(),
      metrics,
      recommendations,
      performance: {
        fcp: this.getFirstContentfulPaint(),
        lcp: this.getLargestContentfulPaint(),
        cls: this.getCumulativeLayoutShift(),
        fid: this.getFirstInputDelay()
      }
    };
  }

  private getFirstContentfulPaint(): number {
    const entries = performance.getEntriesByName('first-contentful-paint');
    return entries.length > 0 ? entries[0].startTime : 0;
  }

  private getLargestContentfulPaint(): number {
    const entries = performance.getEntriesByType('largest-contentful-paint');
    return entries.length > 0 ? entries[entries.length - 1].startTime : 0;
  }

  private getCumulativeLayoutShift(): number {
    const entries = performance.getEntriesByType('layout-shift');
    return entries.reduce((cls, entry) => {
      if (!(entry as any).hadRecentInput) {
        return cls + (entry as any).value;
      }
      return cls;
    }, 0);
  }

  private getFirstInputDelay(): number {
    const entries = performance.getEntriesByType('first-input');
    return entries.length > 0 ? (entries[0] as any).processingStart - entries[0].startTime : 0;
  }

  // Clean up observers
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const monitor = PerformanceMonitor.getInstance();
  
  // Track component renders
  monitor.trackComponentRender(componentName);
  
  return {
    trackApiCall: (endpoint: string, duration: number) => 
      monitor.trackApiCall(endpoint, duration),
    getMetrics: () => monitor.getMetrics(),
    getRecommendations: () => monitor.getRecommendations()
  };
}

export const performanceMonitor = PerformanceMonitor.getInstance();