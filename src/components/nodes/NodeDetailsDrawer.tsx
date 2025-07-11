import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  List,
  ListItem,
  Button,
} from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import {
  ServerIcon,
  InfoCircleIcon,
  CpuIcon,
  CheckCircleIcon,
  TimesCircleIcon,
  ExclamationTriangleIcon,
  BellIcon,
  TagIcon,
  CubesIcon,
  ListIcon,
  MonitoringIcon,
  FilterIcon,
} from '@patternfly/react-icons';
import type { NodeDetail, NodeCondition } from '../../types';

interface NodeDetailsDrawerProps {
  node: NodeDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

const NodeDetailsDrawer: React.FC<NodeDetailsDrawerProps> = ({ 
  node, 
  isOpen, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [drawerHeight, setDrawerHeight] = useState<number>(window.innerHeight * 0.75); // 75% of viewport
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  // Handle resize functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newHeight = e.clientY;
    const minHeight = 200; // Minimum height
    const maxHeight = window.innerHeight - 100; // Leave some space at bottom
    
    const constrainedHeight = Math.min(Math.max(newHeight, minHeight), maxHeight);
    setDrawerHeight(constrainedHeight);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
    return undefined;
  }, [isResizing, handleMouseMove, handleMouseUp]);

  if (!node) return null;

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
      case 'container-runtime':
        return <CubesIcon style={{ color: '#0066cc' }} />;
      case 'kernel':
        return <MonitoringIcon style={{ color: '#0066cc' }} />;
      default:
        return <ListIcon style={{ color: '#6a6e73' }} />;
    }
  };

  const detectLogLevel = (logContent: string): string => {
    const content = logContent.toLowerCase();
    if (content.includes('error') || content.includes('failed') || content.includes('critical')) {
      return 'error';
    }
    if (content.includes('warning') || content.includes('warn')) {
      return 'warning';
    }
    if (content.includes('info')) {
      return 'info';
    }
    return 'debug';
  };

  // Calculate sticky header height to position drawer below it
  const stickyHeaderHeight = 240; // Should match the height calculation in NodesDashboard

  // Custom drawer styles - positioned below sticky header
  const drawerStyles: React.CSSProperties = {
    position: 'fixed',
    top: `${stickyHeaderHeight}px`,
    left: 0,
    right: 0,
    height: `${drawerHeight}px`,
    backgroundColor: '#fff',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
    zIndex: 998, // Below sticky header (999) but above content
    display: isOpen ? 'flex' : 'none',
    flexDirection: 'column',
    transition: isResizing ? 'none' : 'height 0.3s ease-in-out',
  };

  const resizeHandleStyles: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '12px',
    backgroundColor: '#f1f1f1',
    cursor: 'ns-resize',
    borderTop: '1px solid #d2d2d2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
  };



  const contentStyles: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
  };

  const headerStyles: React.CSSProperties = {
    borderBottom: '1px solid #e8e8e8',
    padding: '16px 24px',
    backgroundColor: '#f8f9fa',
  };

  return (
    <div ref={drawerRef} style={drawerStyles}>
      {/* Header */}
      <div style={headerStyles}>
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
        >
          <FlexItem>
            <Title headingLevel="h2" size="xl">
              <ServerIcon style={{ marginRight: '12px', color: '#0066cc' }} />
              {node.name}
            </Title>
          </FlexItem>
          <FlexItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsLg' }}
            >
              <FlexItem>
                <Badge
                  color={node.status === 'Ready' ? 'green' : 'red'}
                  style={{ fontSize: '0.9rem' }}
                >
                  {node.status}
                </Badge>
              </FlexItem>
              <FlexItem>
                <Badge
                  color={node.role.includes('control') ? 'blue' : 'grey'}
                  style={{ fontSize: '0.9rem' }}
                >
                  {node.role.includes('control') ? 'Control Plane' : 'Worker'}
                </Badge>
              </FlexItem>
              <FlexItem>
                <Button variant="plain" onClick={onClose} aria-label="Close drawer">
                  ✕
                </Button>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </div>

      {/* Content */}
      <div style={contentStyles}>
        <Tabs
          activeKey={activeTab}
          onSelect={(_event, tabIndex) => setActiveTab(tabIndex as string)}
          style={{ marginBottom: '24px' }}
        >
          {/* Overview Tab */}
          <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
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
                          {node.containerRuntime}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Kernel Version</DescriptionListTerm>
                        <DescriptionListDescription>{node.version}</DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Operating System</DescriptionListTerm>
                        <DescriptionListDescription>
                          {node.operatingSystem}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Architecture</DescriptionListTerm>
                        <DescriptionListDescription>{node.architecture}</DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Zone</DescriptionListTerm>
                        <DescriptionListDescription>{node.zone}</DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Instance Type</DescriptionListTerm>
                        <DescriptionListDescription>{node.instanceType}</DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </CardBody>
                </Card>
              </GridItem>

              <GridItem span={6}>
                <Card>
                  <CardTitle>
                    <Title headingLevel="h3" size="lg">
                      <CpuIcon style={{ marginRight: '8px', color: '#0066cc' }} />
                      Resource Allocation
                    </Title>
                  </CardTitle>
                  <CardBody>
                    <DescriptionList>
                      <DescriptionListGroup>
                        <DescriptionListTerm>CPU Capacity</DescriptionListTerm>
                        <DescriptionListDescription>
                          {node.allocatableResources.cpu}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Memory Capacity</DescriptionListTerm>
                        <DescriptionListDescription>
                          {formatMemoryForDisplay(node.allocatableResources.memory)}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Max Pods</DescriptionListTerm>
                        <DescriptionListDescription>
                          {node.allocatableResources.pods}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Current Pods</DescriptionListTerm>
                        <DescriptionListDescription>
                          <Badge>{node.pods.length}</Badge>
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Scheduling</DescriptionListTerm>
                        <DescriptionListDescription>
                          {node.cordoned ? (
                            <Badge color="orange">Cordoned</Badge>
                          ) : node.drained ? (
                            <Badge color="red">Drained</Badge>
                          ) : (
                            <Badge color="green">Schedulable</Badge>
                          )}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Node Age</DescriptionListTerm>
                        <DescriptionListDescription>{node.age}</DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </CardBody>
                </Card>
              </GridItem>

              <GridItem span={12}>
                <Card>
                  <CardTitle>
                    <Title headingLevel="h3" size="lg">
                      <InfoCircleIcon style={{ marginRight: '8px', color: '#0066cc' }} />
                      Network Information
                    </Title>
                  </CardTitle>
                  <CardBody>
                    <DescriptionList isHorizontal>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Internal IP</DescriptionListTerm>
                        <DescriptionListDescription>
                          <Badge color="blue">{node.networkInfo.internalIP || 'N/A'}</Badge>
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>External IP</DescriptionListTerm>
                        <DescriptionListDescription>
                          <Badge color="green">{node.networkInfo.externalIP || 'N/A'}</Badge>
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Hostname</DescriptionListTerm>
                        <DescriptionListDescription>
                          <Badge>{node.networkInfo.hostname || 'N/A'}</Badge>
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>
          </Tab>

          {/* Conditions Tab */}
          <Tab eventKey="conditions" title={<TabTitleText>Conditions</TabTitleText>}>
            <Stack hasGutter>
              {node.conditions.map((condition, index) => (
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
                          {new Date(condition.lastTransitionTime).toLocaleString()}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </Alert>
                </StackItem>
              ))}
            </Stack>
          </Tab>

          {/* Pods Tab */}
          <Tab eventKey="pods" title={<TabTitleText>Pods ({node.pods.length})</TabTitleText>}>
            <Card>
              <CardTitle>
                <Title headingLevel="h3" size="lg">
                  <CubesIcon style={{ marginRight: '8px', color: '#0066cc' }} />
                  Running Pods
                </Title>
              </CardTitle>
              <CardBody>
                <Table aria-label="Node Pods">
                  <Thead>
                    <Tr>
                      <Th>Name</Th>
                      <Th>Namespace</Th>
                      <Th>Status</Th>
                      <Th>Ready/Total</Th>
                      <Th>Restarts</Th>
                      <Th>Age</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {node.pods.slice(0, 50).map((pod, index) => (
                      <Tr key={index}>
                        <Td>{pod.name}</Td>
                        <Td>
                          <Badge>{pod.namespace}</Badge>
                        </Td>
                        <Td>
                          <Badge
                            color={
                              pod.status === 'Running'
                                ? 'green'
                                : pod.status === 'Pending'
                                ? 'orange'
                                : 'red'
                            }
                          >
                            {pod.status}
                          </Badge>
                        </Td>
                        <Td>
                          {pod.readyContainers}/{pod.containers}
                        </Td>
                        <Td>
                          {pod.restarts > 0 ? (
                            <Badge color={pod.restarts > 5 ? 'red' : 'orange'}>
                              {pod.restarts}
                            </Badge>
                          ) : (
                            <Badge color="green">0</Badge>
                          )}
                        </Td>
                        <Td>{pod.age}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                {node.pods.length > 50 && (
                  <div style={{ marginTop: '16px', textAlign: 'center', color: '#6a6e73' }}>
                    Showing first 50 of {node.pods.length} pods
                  </div>
                )}
              </CardBody>
            </Card>
          </Tab>

          {/* Events Tab */}
          <Tab eventKey="events" title={<TabTitleText>Events ({node.events.length})</TabTitleText>}>
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
                    {node.events.slice(0, 20).map((event, index) => (
                      <Tr key={index}>
                        <Td>
                          <Badge color={event.type === 'Warning' ? 'red' : 'green'}>
                            {event.type}
                          </Badge>
                        </Td>
                        <Td>{event.reason}</Td>
                        <Td style={{ maxWidth: '400px', wordBreak: 'break-word' }}>
                          {event.message}
                        </Td>
                        <Td>
                          <Badge>{event.count}</Badge>
                        </Td>
                        <Td>{new Date(event.timestamp).toLocaleString()}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                {node.events.length > 20 && (
                  <div style={{ marginTop: '16px', textAlign: 'center', color: '#6a6e73' }}>
                    Showing first 20 of {node.events.length} events
                  </div>
                )}
              </CardBody>
            </Card>
          </Tab>

          {/* Taints Tab */}
          <Tab eventKey="taints" title={<TabTitleText>Taints & Labels</TabTitleText>}>
            <Grid hasGutter>
              <GridItem span={6}>
                <Card>
                  <CardTitle>
                    <Title headingLevel="h3" size="lg">
                      <TagIcon style={{ marginRight: '8px', color: '#0066cc' }} />
                      Taints ({node.taints.length})
                    </Title>
                  </CardTitle>
                  <CardBody>
                    {node.taints.length === 0 ? (
                      <Alert variant={AlertVariant.info} title="No Taints">
                        This node has no taints configured. All pods that tolerate the node&apos;s
                        constraints can be scheduled here.
                      </Alert>
                    ) : (
                      <Stack hasGutter>
                        {node.taints.map((taint, index) => (
                          <StackItem key={index}>
                            <Alert
                              variant={AlertVariant.warning}
                              title={`${taint.key}=${taint.value || 'N/A'}`}
                            >
                              <DescriptionList>
                                <DescriptionListGroup>
                                  <DescriptionListTerm>Effect</DescriptionListTerm>
                                  <DescriptionListDescription>
                                    <Badge color="orange">{taint.effect}</Badge>
                                  </DescriptionListDescription>
                                </DescriptionListGroup>
                                {taint.timeAdded && (
                                  <DescriptionListGroup>
                                    <DescriptionListTerm>Time Added</DescriptionListTerm>
                                    <DescriptionListDescription>
                                      {new Date(taint.timeAdded).toLocaleString()}
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
                      Labels ({Object.keys(node.labels).length})
                    </Title>
                  </CardTitle>
                  <CardBody>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {Object.entries(node.labels).map(([key, value]) => (
                        <Badge key={key} style={{ fontSize: '0.75rem' }}>
                          {key}: {value}
                        </Badge>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>
          </Tab>

          {/* Debug Tab */}
          <Tab eventKey="debug" title={<TabTitleText>Debug & Logs</TabTitleText>}>
            <Grid hasGutter>
              <GridItem span={6}>
                <Card>
                  <CardTitle>
                    <Title headingLevel="h3" size="lg">
                      <BellIcon style={{ marginRight: '8px', color: '#0066cc' }} />
                      Alerts ({node.alerts.length})
                    </Title>
                  </CardTitle>
                  <CardBody>
                    {node.alerts.length === 0 ? (
                      <Alert variant={AlertVariant.success} title="No Active Alerts">
                        This node has no active alerts or issues detected.
                      </Alert>
                    ) : (
                      <Stack hasGutter>
                        {node.alerts.slice(0, 10).map((alert, index) => (
                          <StackItem key={index}>
                            <Alert
                              variant={
                                alert.severity === 'critical'
                                  ? AlertVariant.danger
                                  : alert.severity === 'warning'
                                  ? AlertVariant.warning
                                  : AlertVariant.info
                              }
                              title={`${alert.reason} (${alert.severity})`}
                            >
                              <p>{alert.message}</p>
                              <DescriptionList>
                                <DescriptionListGroup>
                                  <DescriptionListTerm>Source</DescriptionListTerm>
                                  <DescriptionListDescription>
                                    {alert.source}
                                  </DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                  <DescriptionListTerm>Count</DescriptionListTerm>
                                  <DescriptionListDescription>
                                    <Badge>{alert.count}</Badge>
                                  </DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                  <DescriptionListTerm>Time</DescriptionListTerm>
                                  <DescriptionListDescription>
                                    {new Date(alert.timestamp).toLocaleString()}
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
                <Card>
                  <CardTitle>
                    <Title headingLevel="h3" size="lg">
                      <MonitoringIcon style={{ marginRight: '8px', color: '#0066cc' }} />
                      System Logs ({node.logs.length})
                    </Title>
                  </CardTitle>
                  <CardBody>
                    {node.logs.length === 0 ? (
                      <Alert variant={AlertVariant.info} title="No System Logs">
                        This node&apos;s systemd journal logs are accessible! Journal logs provide
                        detailed information about system services, kernel messages, and container
                        runtime events.
                      </Alert>
                    ) : (
                      <List>
                        {node.logs.slice(0, 20).map((log, index) => (
                          <ListItem key={index}>
                            <Flex alignItems={{ default: 'alignItemsFlexStart' }}>
                              <FlexItem>{getLogTypeIcon(log.component)}</FlexItem>
                              <FlexItem>
                                {getLogLevelIcon(log.level || detectLogLevel(log.content))}
                              </FlexItem>
                              <FlexItem flex={{ default: 'flex_1' }}>
                                <div style={{ fontSize: '0.875rem' }}>
                                  <strong>{log.component}</strong> -{' '}
                                  {new Date(log.timestamp).toLocaleString()}
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.8rem',
                                    color: '#6a6e73',
                                    marginTop: '4px',
                                    fontFamily: 'monospace',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {log.content}
                                </div>
                              </FlexItem>
                            </Flex>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>
          </Tab>
        </Tabs>
      </div>

      {/* Resize Handle */}
      <div 
        ref={resizeHandleRef}
        style={resizeHandleStyles}
        onMouseDown={handleMouseDown}
      >
        <div style={{
          width: '48px',
          height: '3px',
          backgroundColor: '#999',
          borderRadius: '2px',
          transition: 'all 0.2s ease',
          position: 'relative',
        }}>
          {/* Drag dots indicator */}
          <div style={{
            position: 'absolute',
            top: '-2px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '3px',
          }}>
            <div style={{
              width: '3px',
              height: '3px',
              backgroundColor: '#bbb',
              borderRadius: '50%',
              transition: 'background-color 0.2s ease',
            }} />
            <div style={{
              width: '3px',
              height: '3px',
              backgroundColor: '#bbb',
              borderRadius: '50%',
              transition: 'background-color 0.2s ease',
            }} />
            <div style={{
              width: '3px',
              height: '3px',
              backgroundColor: '#bbb',
              borderRadius: '50%',
              transition: 'background-color 0.2s ease',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeDetailsDrawer;
