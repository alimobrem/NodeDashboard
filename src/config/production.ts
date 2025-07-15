// Production configuration for Node Dashboard Plugin

export interface ProductionConfig {
  // Feature flags
  features: {
    enableRealTimeMetrics: boolean;
    enableLogViewer: boolean;
    enableAdvancedFiltering: boolean;
    enableMetricsHistory: boolean;
    enableNodeComparison: boolean;
  };

  // API configuration
  api: {
    retryAttempts: number;
    retryDelay: number;
    timeout: number;
    rateLimitThreshold: number;
    circuitBreakerThreshold: number;
  };

  // Polling intervals (milliseconds)
  polling: {
    metrics: number;
    events: number;
    logs: number;
    healthCheck: number;
  };

  // UI configuration
  ui: {
    maxNodesDisplayed: number;
    maxEventsDisplayed: number;
    maxLogsDisplayed: number;
    drawerDefaultWidth: number;
    refreshIntervalMin: number;
    refreshIntervalMax: number;
  };

  // Security settings
  security: {
    enableCSRFProtection: boolean;
    enableRateLimiting: boolean;
    maxRequestsPerMinute: number;
    sessionTimeout: number;
    enableAuditLogging: boolean;
  };

  // Performance optimization
  performance: {
    enableVirtualization: boolean;
    enableMemoization: boolean;
    enableLazyLoading: boolean;
    debounceDelay: number;
    maxConcurrentRequests: number;
  };

  // Monitoring and observability
  monitoring: {
    enableMetrics: boolean;
    enableErrorTracking: boolean;
    enablePerformanceTracking: boolean;
    metricsEndpoint?: string;
    alertingEnabled: boolean;
  };
}

// Environment-specific configurations
const productionConfig: ProductionConfig = {
  features: {
    enableRealTimeMetrics: true,
    enableLogViewer: true,
    enableAdvancedFiltering: true,
    enableMetricsHistory: true,
    enableNodeComparison: false, // Resource intensive - disabled in production
  },

  api: {
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
    timeout: 30000, // 30 seconds
    rateLimitThreshold: 100, // requests per minute
    circuitBreakerThreshold: 5, // failed requests before opening circuit
  },

  polling: {
    metrics: 5000, // 5 seconds (less frequent than dev)
    events: 10000, // 10 seconds
    logs: 30000, // 30 seconds
    healthCheck: 60000, // 1 minute
  },

  ui: {
    maxNodesDisplayed: 1000,
    maxEventsDisplayed: 100,
    maxLogsDisplayed: 500,
    drawerDefaultWidth: 600,
    refreshIntervalMin: 5000,
    refreshIntervalMax: 300000, // 5 minutes max
  },

  security: {
    enableCSRFProtection: true,
    enableRateLimiting: true,
    maxRequestsPerMinute: 100,
    sessionTimeout: 3600000, // 1 hour
    enableAuditLogging: true,
  },

  performance: {
    enableVirtualization: true,
    enableMemoization: true,
    enableLazyLoading: true,
    debounceDelay: 300,
    maxConcurrentRequests: 10,
  },

  monitoring: {
    enableMetrics: true,
    enableErrorTracking: true,
    enablePerformanceTracking: true,
    metricsEndpoint: process.env.METRICS_ENDPOINT,
    alertingEnabled: true,
  },
};

const developmentConfig: ProductionConfig = {
  ...productionConfig,
  polling: {
    metrics: 3000, // Faster polling for development
    events: 5000,
    logs: 15000,
    healthCheck: 30000,
  },
  security: {
    ...productionConfig.security,
    enableCSRFProtection: false, // Easier for development
    enableRateLimiting: false,
  },
  monitoring: {
    ...productionConfig.monitoring,
    alertingEnabled: false, // No alerts in development
  },
};

// Configuration selector based on environment
export const getConfig = (): ProductionConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return productionConfig;
    case 'development':
    case 'test':
    default:
      return developmentConfig;
  }
};

// Export the active configuration
export const config = getConfig();

// Configuration validation
export const validateConfig = (config: ProductionConfig): string[] => {
  const errors: string[] = [];

  if (config.polling.metrics < 1000) {
    errors.push('Metrics polling interval should be at least 1 second');
  }

  if (config.api.timeout < 5000) {
    errors.push('API timeout should be at least 5 seconds');
  }

  if (config.ui.maxNodesDisplayed > 10000) {
    errors.push('Max nodes displayed should not exceed 10,000 for performance');
  }

  return errors;
};

// Runtime configuration checker
export const checkConfigHealth = (): { isHealthy: boolean; errors: string[] } => {
  const errors = validateConfig(config);
  return {
    isHealthy: errors.length === 0,
    errors,
  };
}; 