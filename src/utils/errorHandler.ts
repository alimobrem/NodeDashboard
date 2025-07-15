// Production-grade error handling utilities

import { config } from '../config/production';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  NETWORK = 'network',
  API = 'api',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  PERMISSION = 'permission',
  RESOURCE = 'resource',
  SYSTEM = 'system',
  USER_INPUT = 'user_input',
}

export interface StructuredError {
  id: string;
  timestamp: number;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  stack?: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  retryable: boolean;
}

export interface RetryOptions {
  maxAttempts: number;
  delay: number;
  backoff: 'linear' | 'exponential';
  retryCondition?: (error: Error) => boolean;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

// Circuit breaker for API calls
class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'closed',
  };

  private readonly threshold = config.api.circuitBreakerThreshold;
  private readonly timeout = 60000; // 1 minute

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state.state === 'open') {
      if (Date.now() - this.state.lastFailureTime > this.timeout) {
        this.state.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.state = {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed',
    };
  }

  private onFailure(): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failures >= this.threshold) {
      this.state.state = 'open';
    }
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }
}

// Global circuit breaker instance
const circuitBreaker = new CircuitBreaker();

// Error logger with structured logging
export class ErrorLogger {
  static log(error: StructuredError): void {
    // In production, this would integrate with your logging service
    // (e.g., DataDog, New Relic, CloudWatch, etc.)
    
    if (config.monitoring.enableErrorTracking) {
      // Format for structured logging
      const logEntry = {
        timestamp: new Date(error.timestamp).toISOString(),
        level: this.severityToLogLevel(error.severity),
        message: error.message,
        error_id: error.id,
        category: error.category,
        severity: error.severity,
        context: error.context,
        stack: error.stack,
        user_id: error.userId,
        session_id: error.sessionId,
        correlation_id: error.correlationId,
        retryable: error.retryable,
      };

      // Log to console in development, send to service in production
      if (process.env.NODE_ENV === 'production') {
        // Send to logging service
        this.sendToLoggingService(logEntry);
      } else {
        console.error('🚨 Error:', logEntry);
      }

      // Send alerts for high/critical errors
      if (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL) {
        this.sendAlert(error);
      }
    }
  }

  private static severityToLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'info';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.CRITICAL:
        return 'fatal';
      default:
        return 'error';
    }
  }

  private static sendToLoggingService(logEntry: unknown): void {
    // Implement integration with your logging service
    // Example: POST to logging endpoint
    if (config.monitoring.metricsEndpoint) {
      fetch(`${config.monitoring.metricsEndpoint}/errors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry),
      }).catch(() => {
        // Fallback to console if logging service is unavailable
        console.error('Failed to send error to logging service:', logEntry);
      });
    }
  }

  private static sendAlert(error: StructuredError): void {
    if (config.monitoring.alertingEnabled) {
      // Implement alerting logic (email, Slack, PagerDuty, etc.)
      console.warn('🚨 ALERT: Critical error detected:', error.message);
    }
  }
}

// Enhanced error creation utility
export class ErrorFactory {
  static create(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context?: Record<string, unknown>,
    originalError?: Error,
  ): StructuredError {
    const error: StructuredError = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      message,
      category,
      severity,
      context,
      stack: originalError?.stack || new Error().stack,
      retryable: this.isRetryable(category, severity),
    };

    // Add session context if available
    if (typeof window !== 'undefined') {
      error.sessionId = this.getSessionId();
    }

    ErrorLogger.log(error);
    return error;
  }

  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static getSessionId(): string {
    // Implement session ID retrieval
    return 'session_' + Math.random().toString(36).substr(2, 9);
  }

  private static isRetryable(category: ErrorCategory, severity: ErrorSeverity): boolean {
    // Network and API errors are typically retryable
    if (category === ErrorCategory.NETWORK || category === ErrorCategory.API) {
      return severity !== ErrorSeverity.CRITICAL;
    }

    // Resource errors might be retryable
    if (category === ErrorCategory.RESOURCE) {
      return severity === ErrorSeverity.LOW || severity === ErrorSeverity.MEDIUM;
    }

    // Other categories are typically not retryable
    return false;
  }
}

// Retry mechanism with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const {
    maxAttempts = config.api.retryAttempts,
    delay = config.api.retryDelay,
    backoff = 'exponential',
    retryCondition = (error: Error) => {
      // Default: retry on network errors
      return error.message.includes('fetch') || error.message.includes('network');
    },
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if condition is not met
      if (!retryCondition(lastError)) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Calculate delay based on backoff strategy
      const currentDelay = backoff === 'exponential' 
        ? delay * Math.pow(2, attempt - 1)
        : delay * attempt;

      // Log retry attempt
      ErrorFactory.create(
        `Retrying operation (attempt ${attempt}/${maxAttempts})`,
        ErrorCategory.API,
        ErrorSeverity.LOW,
        { attempt, delay: currentDelay, error: lastError.message },
      );

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }

  throw lastError || new Error('Operation failed after all retry attempts');
}

// API request wrapper with circuit breaker and retry
export async function safeApiCall<T>(
  operation: () => Promise<T>,
  context?: Record<string, unknown>,
): Promise<T> {
  try {
    return await circuitBreaker.execute(() =>
      withRetry(operation, {
        retryCondition: (error: Error) => {
          // Retry on network errors and 5xx status codes
          return (
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('50') // 5xx errors
          );
        },
      }),
    );
  } catch (error) {
    const structuredError = ErrorFactory.create(
      `API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ErrorCategory.API,
      ErrorSeverity.HIGH,
      { ...context, circuitBreakerState: circuitBreaker.getState() },
      error instanceof Error ? error : undefined,
    );

    throw new Error(structuredError.message);
  }
}

// Input validation with error handling
export function validateInput<T>(
  value: unknown,
  validator: (value: unknown) => value is T,
  fieldName: string,
): T {
  if (!validator(value)) {
    throw ErrorFactory.create(
      `Invalid input for field: ${fieldName}`,
      ErrorCategory.VALIDATION,
      ErrorSeverity.MEDIUM,
      { fieldName, value },
    );
  }
  return value;
}

// Graceful degradation utility
export async function withFallback<T>(
  primaryOperation: () => Promise<T>,
  fallbackOperation: () => Promise<T>,
  context?: Record<string, unknown>,
): Promise<T> {
  try {
    return await primaryOperation();
  } catch (error) {
    ErrorFactory.create(
      'Primary operation failed, falling back',
      ErrorCategory.SYSTEM,
      ErrorSeverity.MEDIUM,
      { ...context, error: error instanceof Error ? error.message : 'Unknown error' },
    );

    return await fallbackOperation();
  }
}

// Export circuit breaker for external monitoring
export { circuitBreaker }; 