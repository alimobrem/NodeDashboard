import { Component, ErrorInfo, ReactNode } from 'react';
import {
  Alert,
  AlertVariant,
  Button,
  Card,
  CardBody,
  Stack,
  StackItem,
  Title,
  CodeBlock,
  CodeBlockCode,
  ExpandableSection,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon, RedoIcon } from '@patternfly/react-icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isExpanded: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isExpanded: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console and call optional error handler
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isExpanded: false,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card>
          <CardBody>
            <Stack hasGutter>
              <StackItem>
                <Alert
                  variant={AlertVariant.danger}
                  title="Something went wrong"
                  customIcon={<ExclamationTriangleIcon />}
                >
                  <Stack hasGutter>
                    <StackItem>
                      The NodeDashboard plugin encountered an unexpected error. You can try
                      refreshing the page or contact your administrator if the problem persists.
                    </StackItem>
                    <StackItem>
                      <Button variant="primary" icon={<RedoIcon />} onClick={this.handleRetry}>
                        Try Again
                      </Button>
                    </StackItem>
                  </Stack>
                </Alert>
              </StackItem>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <StackItem>
                  <ExpandableSection
                    toggleText="Show technical details"
                    onToggle={(_event, isExpanded: boolean) => this.setState({ isExpanded })}
                    isExpanded={this.state.isExpanded}
                  >
                    <Stack hasGutter>
                      <StackItem>
                        <Title headingLevel="h4" size="md">
                          Error Details (Development Mode)
                        </Title>
                      </StackItem>
                      <StackItem>
                        <CodeBlock>
                          <CodeBlockCode>
                            {this.state.error.name}: {this.state.error.message}
                            {'\n\n'}
                            {this.state.error.stack}
                            {this.state.errorInfo?.componentStack &&
                              `\n\nComponent Stack:${this.state.errorInfo.componentStack}`}
                          </CodeBlockCode>
                        </CodeBlock>
                      </StackItem>
                    </Stack>
                  </ExpandableSection>
                </StackItem>
              )}
            </Stack>
          </CardBody>
        </Card>
      );
    }

    return this.props.children;
  }
}
