import * as React from 'react';
import {
  Alert,
  AlertVariant,
  Button,
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
  Title,
  PageSection,
  Stack,
  StackItem,
  CodeBlock,
  CodeBlockCode,
  ExpandableSection,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon, RedoIcon } from '@patternfly/react-icons';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service (in production)
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    // In a real application, this would send the error to a logging service
    // like Sentry, LogRocket, or Bugsnag
    console.log('Reporting error to tracking service:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} reset={this.handleReset} />;
      }

      // Default error UI
      return (
        <PageSection>
          <Card>
            <CardBody>
              <EmptyState>
                <ExclamationTriangleIcon color="#c9190b" style={{ fontSize: '4rem' }} />
                <Title headingLevel="h2" size="lg">
                  Something went wrong
                </Title>
                <EmptyStateBody>
                  <Stack hasGutter>
                    <StackItem>
                      <Alert
                        variant={AlertVariant.danger}
                        title="Application Error"
                        style={{ textAlign: 'left' }}
                      >
                        <p>
                          The Node Dashboard encountered an unexpected error. This has been
                          automatically reported to our team.
                        </p>
                        <p style={{ marginTop: '8px' }}>
                          <strong>Error ID:</strong> {this.state.errorId}
                        </p>
                      </Alert>
                    </StackItem>

                    <StackItem>
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <Button variant="primary" onClick={this.handleReset} icon={<RedoIcon />}>
                          Try Again
                        </Button>
                        <Button variant="secondary" onClick={this.handleReload}>
                          Reload Page
                        </Button>
                      </div>
                    </StackItem>

                    {process.env.NODE_ENV === 'development' && this.state.error && (
                      <StackItem>
                        <ExpandableSection
                          toggleText="Developer Details"
                          style={{ textAlign: 'left', maxWidth: '600px' }}
                        >
                          <Stack hasGutter>
                            <StackItem>
                              <strong>Error Message:</strong>
                              <CodeBlock>
                                <CodeBlockCode>{this.state.error.message}</CodeBlockCode>
                              </CodeBlock>
                            </StackItem>

                            {this.state.error.stack && (
                              <StackItem>
                                <strong>Stack Trace:</strong>
                                <CodeBlock>
                                  <CodeBlockCode>{this.state.error.stack}</CodeBlockCode>
                                </CodeBlock>
                              </StackItem>
                            )}

                            {this.state.errorInfo?.componentStack && (
                              <StackItem>
                                <strong>Component Stack:</strong>
                                <CodeBlock>
                                  <CodeBlockCode>
                                    {this.state.errorInfo.componentStack}
                                  </CodeBlockCode>
                                </CodeBlock>
                              </StackItem>
                            )}
                          </Stack>
                        </ExpandableSection>
                      </StackItem>
                    )}
                  </Stack>
                </EmptyStateBody>
              </EmptyState>
            </CardBody>
          </Card>
        </PageSection>
      );
    }

    return this.props.children;
  }
}
