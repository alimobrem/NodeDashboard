import React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  Title,
  Button,
  Alert,
  AlertActionCloseButton,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';

interface NodeErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface NodeErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

class NodeErrorBoundary extends React.Component<NodeErrorBoundaryProps, NodeErrorBoundaryState> {
  constructor(props: NodeErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<NodeErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    console.error('Node Dashboard Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;

      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} retry={this.handleRetry} />;
      }

      return (
        <EmptyState>
          <ExclamationTriangleIcon size={24} style={{ marginBottom: '1rem' }} />
          <Title headingLevel="h4" size="lg">
            Something went wrong
          </Title>
          <EmptyStateBody>
            An error occurred while loading the node dashboard. This might be due to:
            <ul style={{ textAlign: 'left', marginTop: '1rem' }}>
              <li>Network connectivity issues</li>
              <li>Kubernetes API server problems</li>
              <li>Invalid cluster configuration</li>
              <li>Insufficient permissions</li>
            </ul>
          </EmptyStateBody>
          <Button variant="primary" onClick={this.handleRetry}>
            Try Again
          </Button>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Alert
              variant="danger"
              title="Development Error Details"
              actionClose={
                <AlertActionCloseButton
                  onClose={() => {
                    // Handle close if needed - for now just no-op
                  }}
                />
              }
              style={{ marginTop: '1rem', textAlign: 'left' }}
            >
              <pre style={{ fontSize: '0.8rem', overflow: 'auto' }}>
                {this.state.error.message}
                {this.state.errorInfo?.componentStack}
              </pre>
            </Alert>
          )}
        </EmptyState>
      );
    }

    return this.props.children;
  }
}

export default NodeErrorBoundary;
