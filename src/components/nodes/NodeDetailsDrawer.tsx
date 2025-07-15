import React, { useState, useEffect } from 'react';
import {
  Title,
  Tabs,
  Tab,
  TabTitleText,
  Grid,
  GridItem,
  Card,
  CardTitle,
  CardBody,
  Badge,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Alert,
  AlertVariant,
  Flex,
  FlexItem,
  Stack,
  StackItem,

  Button,
  FormSelect,
  FormSelectOption,
  Spinner,
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,

} from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import {
  ServerIcon,
  InfoCircleIcon,
  CheckCircleIcon,
  TimesCircleIcon,
  ExclamationTriangleIcon,
  BellIcon,
  TagIcon,
  CubesIcon,
  ListIcon,
  MonitoringIcon,
  FilterIcon,
  MemoryIcon,
  NetworkIcon,
  TimesIcon,
} from '@patternfly/react-icons';
import type { NodeDetail, NodeCondition } from '../../types';
import { useNodeLogs, type NodeLogEntry } from '../../hooks';

interface NodeDetailsDrawerProps {
  node: NodeDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

const NodeDetailsDrawer: React.FC<NodeDetailsDrawerProps> = ({ node, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [drawerWidth, setDrawerWidth] = useState<number>(600);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [selectedLogType, setSelectedLogType] = useState<string>('all');

  // Real-time logs fetching
  const {
    logs: realLogs,
    isLoading: isLogsLoading,
    error: logsError,
    availablePaths,
    selectedPath,
    setSelectedPath,
    availableLogFiles,
    selectedLogFile,
    setSelectedLogFile,
    refetchLogs
  } = useNodeLogs(node?.name || '', node?.labels || {});

  // Debug: Track node prop changes (simplified)
  React.useEffect(() => {
    if (node && isOpen) {
      console.log(`🔍 Drawer Node Updated: ${node.name} - CPU: ${node?.metrics?.cpu?.current?.toFixed(1)}%, Memory: ${node?.metrics?.memory?.current?.toFixed(1)}%`);
    }
  }, [node?.metrics?.cpu?.current, node?.metrics?.memory?.current, node?.name, isOpen]);

  // Always call hooks first, then handle conditional rendering at the end

  // Helper function to safely format dates
  const formatDate = (dateValue: string | number | Date | null | undefined): string => {
    if (!dateValue) return 'N/A';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  // Reset tab when node changes
  useEffect(() => {
    if (node && isOpen) {
      setActiveTab('overview');
    }
  }, [node?.name, isOpen]);

  // Resize handlers with proper cleanup
  useEffect(() => {
    const handleResize = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setDrawerWidth(Math.max(400, Math.min(1200, newWidth)));
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
    };

    // Only set up event listeners if the component is active and user is resizing
    if (node && isOpen && isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', handleResizeEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, node, isOpen]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const formatMemoryForDisplay = (memoryValue: string): string => {
    if (memoryValue.endsWith('Ki')) {
      const kb = parseInt(memoryValue.slice(0, -2));
      return `${(kb / 1024 / 1024).toFixed(1)} GB`;
    }
    if (memoryValue.endsWith('Mi')) {
      const mb = parseInt(memoryValue.slice(0, -2));
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    if (memoryValue.endsWith('Gi')) {
      const gb = parseInt(memoryValue.slice(0, -2));
      return `${gb} GB`;
    }
    return memoryValue;
  };

  const getConditionIcon = (condition: NodeCondition) => {
    switch (condition.status) {
      case 'True':
        return <CheckCircleIcon style={{ color: '#3e8635' }} />;
      case 'False':
        return <TimesCircleIcon style={{ color: '#c9190b' }} />;
      default:
        return <ExclamationTriangleIcon style={{ color: '#f0ab00' }} />;
    }
  };

  const getConditionVariant = (condition: NodeCondition): AlertVariant => {
    if (condition.type === 'Ready' && condition.status === 'True') return AlertVariant.success;
    if (condition.type === 'Ready' && condition.status === 'False') return AlertVariant.danger;
    if (
      condition.status === 'True' &&
      ['MemoryPressure', 'DiskPressure', 'PIDPressure'].includes(condition.type)
    ) {
      return AlertVariant.warning;
    }
    return AlertVariant.info;
  };

  const getLogLevelIcon = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return <TimesCircleIcon style={{ color: '#c9190b' }} />;
      case 'warning':
        return <ExclamationTriangleIcon style={{ color: '#f0ab00' }} />;
      case 'info':
        return <InfoCircleIcon style={{ color: '#0066cc' }} />;
      default:
        return <InfoCircleIcon style={{ color: '#6a6e73' }} />;
    }
  };

  const getLogTypeIcon = (component: string) => {
    switch (component.toLowerCase()) {
      case 'kubelet':
        return <ServerIcon style={{ color: '#0066cc' }} />;
      case 'containerd':
      case 'container-runtime':
        return <CubesIcon style={{ color: '#0066cc' }} />;
      case 'systemd':
        return <MonitoringIcon style={{ color: '#0066cc' }} />;
      case 'kube-scheduler':
        return <FilterIcon style={{ color: '#0066cc' }} />;
      case 'controller-manager':
        return <TagIcon style={{ color: '#0066cc' }} />;
      case 'network':
        return <NetworkIcon style={{ color: '#0066cc' }} />;
      case 'kernel':
        return <MonitoringIcon style={{ color: '#0066cc' }} />;
      default:
        return <ListIcon style={{ color: '#6a6e73' }} />;
    }
  };



  // Filter real logs based on selected log type (for compatibility with old filtering)
  const filteredLogs = selectedLogType === 'all' 
    ? realLogs
    : realLogs.filter((log: NodeLogEntry) => log?.component?.toLowerCase() === selectedLogType.toLowerCase());

  // Conditional rendering at the end - after all hooks have been called
  if (!node || !isOpen) {
    return null;
  }

  // Side drawer styles - slides in from the right
  // OpenShift Console masthead height is typically 56px
  const mastheadHeight = '56px';

  const overlayStyles: React.CSSProperties = {
    position: 'fixed',
    top: mastheadHeight,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    opacity: isOpen ? 1 : 0,
    visibility: isOpen ? 'visible' : 'hidden',
    transition: 'opacity 0.3s ease, visibility 0.3s ease',
  };

  const drawerStyles: React.CSSProperties = {
    position: 'fixed',
    top: mastheadHeight,
    right: 0,
    bottom: 0,
    width: `${drawerWidth}px`,
    backgroundColor: '#fff',
    boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.1)',
    zIndex: 1001,
    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
    transition: isResizing ? 'none' : 'transform 0.3s ease-in-out',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const resizeHandleStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '4px',
    backgroundColor: isResizing ? '#0066cc' : 'transparent',
    cursor: 'col-resize',
    zIndex: 1002,
    transition: 'background-color 0.2s ease',
  };

  const headerStyles: React.CSSProperties = {
    borderBottom: '1px solid #e8e8e8',
    padding: '32px 32px 20px 32px',
    backgroundColor: '#f8f9fa',
    flexShrink: 0,
  };

  const contentStyles: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: '24px 32px 32px 32px',
  };

  const tabContentStyles: React.CSSProperties = {
    padding: '24px 0',
    minHeight: '200px',
  };

  const getPodStatusColor = (status: string) => {
    switch (status) {
      case 'Running':
        return 'green';
      case 'Pending':
        return 'orange';
      case 'Failed':
        return 'red';
      case 'Completed':
        return 'purple';
      case 'Unknown':
        return 'grey';
      default:
        return 'grey';
    }
  };

  return (
    <>
      {/* Overlay */}
      <div style={overlayStyles} onClick={onClose} />

      {/* Side Drawer */}
      <div style={drawerStyles}>
        {/* Resize Handle */}
        <div
          style={resizeHandleStyles}
          onMouseDown={handleResizeStart}
          onMouseEnter={(e) => {
            if (!isResizing) {
              (e.target as HTMLElement).style.backgroundColor = '#0066cc40';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
            }
          }}
        />

        <div style={headerStyles}>
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
            <FlexItem>
              <Title headingLevel="h2" size="lg">
                <ServerIcon style={{ marginRight: '8px', color: '#0066cc' }} />
                {node?.name || 'Unknown Node'}
              </Title>
              <div style={{ marginTop: '8px', fontSize: '0.875rem', color: '#6a6e73' }}>
                {node?.role || 'N/A'} • {node?.zone || 'N/A'} • {node?.instanceType || 'N/A'}
              </div>
            </FlexItem>
            <FlexItem>
              <Button variant="plain" onClick={onClose}>
                <TimesIcon />
              </Button>
            </FlexItem>
          </Flex>
        </div>

        <div style={contentStyles}>
          <Tabs
            activeKey={activeTab}
            onSelect={(_event, tabIndex) => setActiveTab(tabIndex as string)}
          >
            {/* Overview Tab */}
            <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
              <div style={tabContentStyles}>
                <Grid hasGutter>
                  <GridItem span={6}>
                    <Card>
                      <CardTitle>
                        <Title headingLevel="h3" size="lg">
                          <InfoCircleIcon style={{ marginRight: '8px', color: '#0066cc' }} />
                          System Information
                        </Title>
                      </CardTitle>
                      <CardBody>
                        <DescriptionList>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Container Runtime</DescriptionListTerm>
                            <DescriptionListDescription>
                              {node?.containerRuntime || 'N/A'}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Operating System</DescriptionListTerm>
                            <DescriptionListDescription>
                              {node?.operatingSystem || 'N/A'}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Architecture</DescriptionListTerm>
                            <DescriptionListDescription>
                              {node?.architecture || 'N/A'}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Kubernetes Version</DescriptionListTerm>
                            <DescriptionListDescription>
                              {node?.version || 'N/A'}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Node Age</DescriptionListTerm>
                            <DescriptionListDescription>
                              {node?.age || 'N/A'}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Uptime</DescriptionListTerm>
                            <DescriptionListDescription>
                              {node?.uptime || 'N/A'}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        </DescriptionList>
                      </CardBody>
                    </Card>
                  </GridItem>

                  <GridItem span={6}>
                    <Card>
                      <CardTitle>
                        <Title headingLevel="h3" size="lg">
                          <MemoryIcon style={{ marginRight: '8px', color: '#0066cc' }} />
                          Resource Allocation
                        </Title>
                      </CardTitle>
                      <CardBody>
                        <DescriptionList>
                          <DescriptionListGroup>
                            <DescriptionListTerm>CPU</DescriptionListTerm>
                            <DescriptionListDescription>
                              {node?.allocatableResources?.cpu || 'N/A'}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Memory</DescriptionListTerm>
                            <DescriptionListDescription>
                              {node?.allocatableResources?.memory
                                ? formatMemoryForDisplay(node?.allocatableResources?.memory || '')
                                : 'N/A'}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Pods</DescriptionListTerm>
                            <DescriptionListDescription>
                              {node?.allocatableResources?.pods || 'N/A'}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Current CPU Usage</DescriptionListTerm>
                            <DescriptionListDescription>
                              {node?.metrics?.cpu?.current?.toFixed(1) || 'N/A'}%
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Current Memory Usage</DescriptionListTerm>
                            <DescriptionListDescription>
                              {node?.metrics?.memory?.current?.toFixed(1) || 'N/A'}%
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Running Pods</DescriptionListTerm>
                            <DescriptionListDescription>
                              {(node?.pods || []).filter((p) => p?.status === 'Running').length} /{' '}
                              {(node?.pods || []).length}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        </DescriptionList>
                      </CardBody>
                    </Card>
                  </GridItem>

                  <GridItem span={12}>
                    <Card>
                      <CardTitle>
                        <Title headingLevel="h3" size="lg">
                          <NetworkIcon style={{ marginRight: '8px', color: '#0066cc' }} />
                          Network Information
                        </Title>
                      </CardTitle>
                      <CardBody>
                        <Grid hasGutter>
                          <GridItem span={4}>
                            <DescriptionList>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Internal IP</DescriptionListTerm>
                                <DescriptionListDescription>
                                  {node?.networkInfo?.internalIP || 'Not available'}
                                </DescriptionListDescription>
                              </DescriptionListGroup>
                            </DescriptionList>
                          </GridItem>
                          <GridItem span={4}>
                            <DescriptionList>
                              <DescriptionListGroup>
                                <DescriptionListTerm>External IP</DescriptionListTerm>
                                <DescriptionListDescription>
                                  {node?.networkInfo?.externalIP || 'Not available'}
                                </DescriptionListDescription>
                              </DescriptionListGroup>
                            </DescriptionList>
                          </GridItem>
                          <GridItem span={4}>
                            <DescriptionList>
                              <DescriptionListGroup>
                                <DescriptionListTerm>Hostname</DescriptionListTerm>
                                <DescriptionListDescription>
                                  {node?.networkInfo?.hostname || 'Not available'}
                                </DescriptionListDescription>
                              </DescriptionListGroup>
                            </DescriptionList>
                          </GridItem>
                        </Grid>
                      </CardBody>
                    </Card>
                  </GridItem>
                </Grid>
              </div>
            </Tab>

            {/* Conditions Tab */}
            <Tab eventKey="conditions" title={<TabTitleText>Conditions</TabTitleText>}>
              <div style={tabContentStyles}>
                <Stack hasGutter>
                  {(node?.conditions || []).map((condition, index) => (
                    <StackItem key={index}>
                      <Alert
                        variant={getConditionVariant(condition)}
                        title={
                          <Flex alignItems={{ default: 'alignItemsCenter' }}>
                            <FlexItem>{getConditionIcon(condition)}</FlexItem>
                            <FlexItem style={{ marginLeft: '8px' }}>
                              {condition.type}: {condition.status}
                            </FlexItem>
                          </Flex>
                        }
                        style={{ marginBottom: '16px' }}
                      >
                        <DescriptionList>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Reason</DescriptionListTerm>
                            <DescriptionListDescription>
                              {condition.reason || 'N/A'}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Message</DescriptionListTerm>
                            <DescriptionListDescription>
                              {condition.message || 'N/A'}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Last Transition</DescriptionListTerm>
                            <DescriptionListDescription>
                              {formatDate(condition.lastTransitionTime)}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        </DescriptionList>
                      </Alert>
                    </StackItem>
                  ))}
                </Stack>
              </div>
            </Tab>

            {/* Pods Tab */}
            <Tab
              eventKey="pods"
              title={<TabTitleText>Pods ({(node?.pods || []).length})</TabTitleText>}
            >
              <div style={tabContentStyles}>
                <Card>
                  <CardTitle>
                    <Title headingLevel="h3" size="lg">
                      <CubesIcon style={{ marginRight: '8px', color: '#0066cc' }} />
                      Running Pods
                    </Title>
                  </CardTitle>
                  <CardBody>
                    {(node?.pods || []).length === 0 ? (
                      <Alert variant={AlertVariant.info} title="No Running Pods">
                        This node currently has no running pods.
                      </Alert>
                    ) : (
                      <Table aria-label="Pods table">
                        <Thead>
                          <Tr>
                            <Th>Pod Name</Th>
                            <Th>Namespace</Th>
                            <Th>Status</Th>
                            <Th>CPU</Th>
                            <Th>Memory</Th>
                            <Th>Containers</Th>
                            <Th>Restarts</Th>
                            <Th>Age</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {(node?.pods || []).map((pod, index) => (
                            <Tr key={index}>
                              <Td>{pod?.name || 'N/A'}</Td>
                              <Td>
                                <Badge color="blue">{pod?.namespace || 'N/A'}</Badge>
                              </Td>
                              <Td>
                                <Badge color={getPodStatusColor(pod?.status || 'Unknown')}>
                                  {pod?.status || 'Unknown'}
                                </Badge>
                              </Td>
                              <Td>{pod?.cpuUsage?.toFixed(2) || 'N/A'}%</Td>
                              <Td>{pod?.memoryUsage?.toFixed(2) || 'N/A'}%</Td>
                              <Td>
                                {pod?.readyContainers || 0}/{pod?.containers || 0}
                              </Td>
                              <Td>{pod?.restarts || 0}</Td>
                              <Td>{formatDate(pod?.age)}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    )}
                  </CardBody>
                </Card>
              </div>
            </Tab>

            {/* Events Tab */}
            <Tab
              eventKey="events"
              title={<TabTitleText>Events ({(node?.events || []).length})</TabTitleText>}
            >
              <div style={tabContentStyles}>
                <Card>
                  <CardTitle>
                    <Title headingLevel="h3" size="lg">
                      <BellIcon style={{ marginRight: '8px', color: '#0066cc' }} />
                      Recent Events
                    </Title>
                  </CardTitle>
                  <CardBody>
                    <Table aria-label="Node Events">
                      <Thead>
                        <Tr>
                          <Th>Type</Th>
                          <Th>Reason</Th>
                          <Th>Message</Th>
                          <Th>Count</Th>
                          <Th>Time</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {(node?.events || []).slice(0, 20).map((event, index) => (
                          <Tr key={index}>
                            <Td>
                              <Badge color={event?.type === 'Warning' ? 'red' : 'green'}>
                                {event?.type || 'Unknown'}
                              </Badge>
                            </Td>
                            <Td>{event?.reason || 'N/A'}</Td>
                            <Td style={{ maxWidth: '400px', wordBreak: 'break-word' }}>
                              {event?.message || 'N/A'}
                            </Td>
                            <Td>
                              <Badge>{event?.count || 0}</Badge>
                            </Td>
                            <Td>{formatDate(event?.timestamp)}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                    {(node?.events || []).length > 20 && (
                      <div style={{ marginTop: '16px', textAlign: 'center', color: '#6a6e73' }}>
                        Showing first 20 of {(node?.events || []).length} events
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            </Tab>

            {/* Taints Tab */}
            <Tab eventKey="taints" title={<TabTitleText>Taints & Labels</TabTitleText>}>
              <div style={tabContentStyles}>
                <Grid hasGutter>
                  <GridItem span={6}>
                    <Card>
                      <CardTitle>
                        <Title headingLevel="h3" size="lg">
                          <TagIcon style={{ marginRight: '8px', color: '#0066cc' }} />
                          Taints ({(node?.taints || []).length})
                        </Title>
                      </CardTitle>
                      <CardBody>
                        {(node?.taints || []).length === 0 ? (
                          <Alert variant={AlertVariant.info} title="No Taints">
                            This node has no taints configured. All pods that tolerate the
                            node&apos;s constraints can be scheduled here.
                          </Alert>
                        ) : (
                          <Stack hasGutter>
                            {(node?.taints || []).map((taint, index) => (
                              <StackItem key={index}>
                                <Alert
                                  variant={AlertVariant.warning}
                                  title={`${taint?.key || 'Unknown'}=${taint?.value || 'N/A'}`}
                                >
                                  <DescriptionList>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>Effect</DescriptionListTerm>
                                      <DescriptionListDescription>
                                        <Badge color="orange">{taint?.effect || 'N/A'}</Badge>
                                      </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    {taint?.timeAdded && (
                                      <DescriptionListGroup>
                                        <DescriptionListTerm>Time Added</DescriptionListTerm>
                                        <DescriptionListDescription>
                                          {formatDate(taint.timeAdded)}
                                        </DescriptionListDescription>
                                      </DescriptionListGroup>
                                    )}
                                  </DescriptionList>
                                </Alert>
                              </StackItem>
                            ))}
                          </Stack>
                        )}
                      </CardBody>
                    </Card>
                  </GridItem>

                  <GridItem span={6}>
                    <Card>
                      <CardTitle>
                        <Title headingLevel="h3" size="lg">
                          <FilterIcon style={{ marginRight: '8px', color: '#0066cc' }} />
                          Labels ({Object.keys(node?.labels || {}).length})
                        </Title>
                      </CardTitle>
                      <CardBody>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {Object.entries(node?.labels || {}).map(([key, value]) => (
                            <Badge key={key} style={{ fontSize: '0.75rem' }}>
                              {key}: {value}
                            </Badge>
                          ))}
                        </div>
                      </CardBody>
                    </Card>
                  </GridItem>
                </Grid>
              </div>
            </Tab>

            {/* Debug Tab */}
            <Tab eventKey="debug" title={<TabTitleText>Debug & Logs</TabTitleText>}>
              <div style={tabContentStyles}>
                <Grid hasGutter>
                  <GridItem span={6}>
                    <Card>
                      <CardTitle>
                        <Title headingLevel="h3" size="lg">
                          <BellIcon style={{ marginRight: '8px', color: '#0066cc' }} />
                          Alerts ({(node?.alerts || []).length})
                        </Title>
                      </CardTitle>
                      <CardBody>
                        {(node?.alerts || []).length === 0 ? (
                          <Alert variant={AlertVariant.success} title="No Active Alerts">
                            This node has no active alerts or issues detected.
                          </Alert>
                        ) : (
                          <Stack hasGutter>
                            {(node?.alerts || []).slice(0, 10).map((alert, index) => (
                              <StackItem key={index}>
                                <Alert
                                  variant={
                                    alert?.severity === 'critical'
                                      ? AlertVariant.danger
                                      : alert?.severity === 'warning'
                                      ? AlertVariant.warning
                                      : AlertVariant.info
                                  }
                                  title={`${alert?.reason || 'Unknown'} (${
                                    alert?.severity || 'Unknown'
                                  })`}
                                >
                                  <p>{alert?.message || 'N/A'}</p>
                                  <DescriptionList>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>Source</DescriptionListTerm>
                                      <DescriptionListDescription>
                                        {alert?.source || 'N/A'}
                                      </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>Count</DescriptionListTerm>
                                      <DescriptionListDescription>
                                        <Badge>{alert?.count || 0}</Badge>
                                      </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>Time</DescriptionListTerm>
                                      <DescriptionListDescription>
                                        {formatDate(alert?.timestamp)}
                                      </DescriptionListDescription>
                                    </DescriptionListGroup>
                                  </DescriptionList>
                                </Alert>
                              </StackItem>
                            ))}
                          </Stack>
                        )}
                      </CardBody>
                    </Card>
                  </GridItem>

                  <GridItem span={6}>
                    <Card style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
                      <CardTitle>
                        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
                          <FlexItem>
                            <Title headingLevel="h3" size="lg">
                              <MonitoringIcon style={{ marginRight: '8px', color: '#0066cc' }} />
                              Node Logs ({realLogs.length})
                            </Title>
                          </FlexItem>
                          <FlexItem>
                            <Button 
                              variant="link" 
                              onClick={refetchLogs}
                              isDisabled={isLogsLoading}
                            >
                              {isLogsLoading ? <Spinner size="sm" /> : '↻ Refresh'}
                            </Button>
                          </FlexItem>
                        </Flex>
                      </CardTitle>

                      {/* Log Controls - Similar to OpenShift Console */}
                      <div style={{ padding: '16px', borderBottom: '1px solid #d2d2d2' }}>
                        <Flex>
                          <FlexItem>
                            <FormSelect
                              value={selectedPath}
                              onChange={(_event, value) => setSelectedPath(value as string)}
                              style={{ minWidth: '150px' }}
                              aria-label="Select log path"
                            >
                              {availablePaths.map((path) => (
                                <FormSelectOption 
                                  key={path} 
                                  value={path} 
                                  label={path === 'journal' ? 'Journal' : path.charAt(0).toUpperCase() + path.slice(1)} 
                                />
                              ))}
                            </FormSelect>
                          </FlexItem>
                          
                          {availableLogFiles.length > 0 && (
                            <FlexItem>
                              <FormSelect
                                value={selectedLogFile}
                                onChange={(_event, value) => setSelectedLogFile(value as string)}
                                style={{ minWidth: '200px', marginLeft: '8px' }}
                                aria-label="Select log file"
                              >
                                <FormSelectOption value="" label="Select a log file" isDisabled />
                                {availableLogFiles.map((file) => (
                                  <FormSelectOption key={file} value={file} label={file} />
                                ))}
                              </FormSelect>
                            </FlexItem>
                          )}

                          <FlexItem>
                            <FormSelect
                              value={selectedLogType}
                              onChange={(_event, value) => setSelectedLogType(value as string)}
                              style={{ minWidth: '120px', marginLeft: '8px' }}
                              aria-label="Filter log types"
                            >
                              <FormSelectOption value="all" label="All Types" />
                              <FormSelectOption value="kubelet" label="Kubelet" />
                              <FormSelectOption value="containerd" label="Container Runtime" />
                              <FormSelectOption value="journal" label="System Journal" />
                              <FormSelectOption value="kube-scheduler" label="Scheduler" />
                              <FormSelectOption value="controller-manager" label="Controller Manager" />
                              <FormSelectOption value="network" label="Network" />
                            </FormSelect>
                          </FlexItem>
                        </Flex>
                      </div>

                      <CardBody style={{ flex: 1, overflow: 'auto', padding: '0' }}>
                        {isLogsLoading ? (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                            <Spinner size="lg" />
                          </div>
                        ) : logsError ? (
                          <Alert variant={AlertVariant.danger} title="Error fetching logs" style={{ margin: '16px' }}>
                            {logsError}
                          </Alert>
                        ) : selectedPath !== 'journal' && !selectedLogFile ? (
                          <EmptyState
                            headingLevel="h4"
                            titleText={availableLogFiles.length === 0 ? 'No log files exist' : 'No log file selected'}
                            variant={EmptyStateVariant.sm}
                          >
                            <EmptyStateBody>
                              {availableLogFiles.length === 0 
                                ? `No log files are available for ${selectedPath}.`
                                : 'Select a log file from the dropdown above.'
                              }
                            </EmptyStateBody>
                          </EmptyState>
                        ) : filteredLogs.length === 0 ? (
                          <Alert variant={AlertVariant.info} title="No logs available" style={{ margin: '16px' }}>
                            {selectedPath === 'journal' 
                              ? "This node's journal logs are currently empty or not accessible."
                              : `No logs are currently available for ${selectedPath}${selectedLogFile ? `/${selectedLogFile}` : ''}.`
                            }
                          </Alert>
                        ) : (
                          <div style={{ padding: '8px' }}>
                            {filteredLogs.slice(-100).map((log, index) => (
                              <div 
                                key={index}
                                style={{
                                  padding: '4px 8px',
                                  borderBottom: '1px solid #f0f0f0',
                                  fontSize: '0.875rem',
                                  fontFamily: 'monospace',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
                                  <span style={{ marginRight: '8px' }}>{getLogTypeIcon(log?.component || 'unknown')}</span>
                                  <span style={{ marginRight: '8px' }}>{getLogLevelIcon(log?.level || 'INFO')}</span>
                                  <span style={{ fontWeight: 'bold', marginRight: '8px' }}>{log?.component || 'Unknown'}</span>
                                  <span style={{ color: '#6a6e73', fontSize: '0.8rem' }}>{formatDate(log?.timestamp)}</span>
                                </div>
                                <div
                                  style={{
                                    color: '#151515',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    marginLeft: '60px',
                                  }}
                                >
                                  {log?.content || 'N/A'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  </GridItem>
                </Grid>
              </div>
            </Tab>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default NodeDetailsDrawer;
