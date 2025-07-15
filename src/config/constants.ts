// Configuration constants for the Node Dashboard plugin

export const DASHBOARD_CONFIG = {
  // Polling intervals (in milliseconds)
  METRICS_POLLING_INTERVAL: 3000,
  EVENTS_POLLING_INTERVAL: 5000,
  LOG_REFRESH_INTERVAL: 30000,

  // UI Configuration
  DEFAULT_DRAWER_WIDTH: 600,
  MIN_DRAWER_WIDTH: 300,
  MAX_DRAWER_WIDTH_PERCENT: 80,

  // Data limits
  MAX_EVENTS_DISPLAYED: 50,
  MAX_LOGS_DISPLAYED: 100,
  MAX_PODS_IN_LOGS: 10,

  // Feature flags
  ENABLE_REAL_TIME_METRICS: true,
  ENABLE_LOG_VIEWER: true,
  ENABLE_DEBUG_MODE: process.env.NODE_ENV === 'development',

  // API endpoints
  ENDPOINTS: {
    NODE_METRICS: '/api/v1/nodes',
    NODE_LOGS: '/api/v1/nodes/{nodeName}/proxy/logs',
    KUBERNETES_METRICS: '/apis/metrics.k8s.io/v1beta1/nodes',
  },

  // Error messages
  ERROR_MESSAGES: {
    METRICS_FETCH_FAILED: 'Unable to fetch node metrics. Please check your connection.',
    LOGS_FETCH_FAILED: 'Unable to fetch node logs. Please verify node access permissions.',
    NODE_NOT_FOUND: 'The selected node could not be found.',
    WEBSOCKET_CONNECTION_FAILED:
      'Real-time updates are unavailable. Data will be refreshed periodically.',
  },

  // Default values
  DEFAULTS: {
    NODE_STATUS: 'Unknown',
    METRIC_VALUE: 0,
    LOG_COMPONENT: 'kubernetes',
    LOG_LEVEL: 'INFO',
  },
} as const;

// Type helper for configuration
export type DashboardConfig = typeof DASHBOARD_CONFIG;
