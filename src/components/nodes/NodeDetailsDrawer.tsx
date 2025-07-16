import React, { useState, useEffect, useRef } from 'react';
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
  SearchInput,
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
  SortAlphaDownIcon,
  SortAlphaUpIcon,
} from '@patternfly/react-icons';
import type { NodeDetail, NodeCondition } from '../../types';
import { useNodeLogs, type NodeLogEntry } from '../../hooks';
import '../NodesDashboard.css';

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
  const [podSearchTerm, setPodSearchTerm] = useState<string>('');
  const [podSortBy, setPodSortBy] = useState<string>('name');
  const [podSortDirection, setPodSortDirection] = useState<'asc' | 'desc'>('asc');
  const drawerRef = useRef<HTMLDivElement>(null);

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
    refetchLogs,
  } = useNodeLogs(node?.name || '', node?.labels || {});

  // Production: Track node changes for real-time updates without debug logging

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

  // Update drawer width via direct DOM manipulation (no inline styles)
  useEffect(() => {
    if (drawerRef.current) {
      drawerRef.current.style.width = `${drawerWidth}px`;
    }
  }, [drawerWidth]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Pod sorting functionality
  const handlePodSort = (columnKey: string) => {
    if (podSortBy === columnKey) {
      setPodSortDirection(podSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setPodSortBy(columnKey);
      setPodSortDirection('asc');
    }
  };

  const sortPods = (pods: any[]) => {
    return [...pods].sort((a, b) => {
      let aValue = a[podSortBy];
      let bValue = b[podSortBy];

      // Handle different data types
      if (podSortBy === 'cpuUsage' || podSortBy === 'memoryUsage') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      } else if (podSortBy === 'restarts' || podSortBy === 'containers' || podSortBy === 'readyContainers') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
             } else if (podSortBy === 'age') {
         // Convert age string to timestamp for proper sorting
         const parseAge = (ageStr: string) => {
          if (!ageStr || ageStr === 'N/A') return 0;
          const match = ageStr.match(/(\d+)([dhms])/);
          if (!match) return 0;
          const value = parseInt(match[1]);
          const unit = match[2];
          switch (unit) {
            case 'd': return value * 24 * 60 * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'm': return value * 60 * 1000;
            case 's': return value * 1000;
            default: return 0;
          }
        };
        aValue = parseAge(aValue);
        bValue = parseAge(bValue);
      } else {
        // String comparison for name, namespace, status
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }

      if (aValue < bValue) return podSortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return podSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
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
        return <CheckCircleIcon className="status-icon--ready" />;
      case 'False':
        return <TimesCircleIcon className="status-icon--not-ready" />;
      default:
        return <ExclamationTriangleIcon className="status-icon--warning" />;
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
        return <TimesCircleIcon className="event-icon--normal" />;
      case 'warning':
        return <ExclamationTriangleIcon className="event-icon--warning" />;
      case 'info':
        return <InfoCircleIcon className="event-icon--default" />;
      default:
        return <InfoCircleIcon className="status-icon--default" />;
    }
  };

  const getLogTypeIcon = (component: string) => {
    switch (component.toLowerCase()) {
      case 'kubelet':
        return <ServerIcon className="icon-primary" />;
      case 'containerd':
      case 'container-runtime':
        return <CubesIcon className="icon-primary" />;
      case 'systemd':
        return <MonitoringIcon className="icon-primary" />;
      case 'kube-scheduler':
        return <FilterIcon className="icon-primary" />;
      case 'controller-manager':
        return <TagIcon className="icon-primary" />;
      case 'network':
        return <NetworkIcon className="icon-primary" />;
      case 'kernel':
        return <MonitoringIcon className="icon-primary" />;
      default:
        return <ListIcon className="icon-secondary" />;
    }
  };

  // Filter real logs based on selected log type (for compatibility with old filtering)
  const filteredLogs =
    selectedLogType === 'all'
      ? realLogs
      : realLogs.filter(
          (log: NodeLogEntry) => log?.component?.toLowerCase() === selectedLogType.toLowerCase(),
        );

  // Filter and sort pods
  const filteredAndSortedPods = React.useMemo(() => {
    if (!node?.pods) return [];
    
    // Filter pods based on search term
    const filtered = podSearchTerm
      ? node.pods.filter((pod) =>
          pod.name.toLowerCase().includes(podSearchTerm.toLowerCase()) ||
          pod.namespace.toLowerCase().includes(podSearchTerm.toLowerCase())
        )
      : node.pods;
    
    // Sort the filtered pods
    return sortPods(filtered);
  }, [node?.pods, podSearchTerm, podSortBy, podSortDirection]);

  // Conditional rendering at the end - after all hooks have been called
  if (!node || !isOpen) {
    return null;
  }



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

  const getSortIcon = (columnKey: string) => {
    if (podSortBy !== columnKey) return null;
    return podSortDirection === 'asc' ? <SortAlphaUpIcon /> : <SortAlphaDownIcon />;
  };

  return (
    <>
      {/* Overlay */}
      <div className={`drawer-overlay ${isOpen ? 'drawer-overlay--open' : ''}`} onClick={onClose} />

      {/* Side Drawer */}
      <div 
        ref={drawerRef}
        className={`drawer ${isOpen ? 'drawer--open' : ''} ${isResizing ? 'drawer--resizing' : ''}`}
      >
        {/* Resize Handle */}
        <div
          className={`drawer-resize-handle ${isResizing ? 'drawer-resize-handle--active' : ''}`}
          onMouseDown={handleResizeStart}
        />

        <div className="drawer-header">
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
            <FlexItem>
              <Title headingLevel="h2" size="lg">
                <ServerIcon className="icon-with-margin-right-primary" />
                {node?.name || 'Unknown Node'}
              </Title>
              <div className="section-content">
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

        <div className="drawer-content">
          <Tabs
            activeKey={activeTab}
            onSelect={(_event, tabIndex) => setActiveTab(tabIndex as string)}
          >
            {/* Overview Tab */}
            <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
              <div className="drawer-tab-content">
                <Grid hasGutter>
                  <GridItem span={6}>
                    <Card>
                      <CardTitle>
                        <Title headingLevel="h3" size="lg">
                          <InfoCircleIcon className="icon-with-margin-right-primary" />
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
                          <MemoryIcon className="icon-with-margin-right-primary" />
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
                          <NetworkIcon className="icon-with-margin-right-primary" />
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
              <div className="drawer-tab-content">
                <Stack hasGutter>
                  {(node?.conditions || []).map((condition, index) => (
                    <StackItem key={index}>
                      <Alert
                        variant={getConditionVariant(condition)}
                        title={
                          <Flex alignItems={{ default: 'alignItemsCenter' }}>
                            <FlexItem>{getConditionIcon(condition)}</FlexItem>
                            <FlexItem className="flex-item-margin-left">
                              {condition.type}: {condition.status}
                            </FlexItem>
                          </Flex>
                        }
                        className="margin-bottom-16"
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
              title={<TabTitleText>Pods ({filteredAndSortedPods.length}{podSearchTerm ? ` of ${(node?.pods || []).length}` : ''})</TabTitleText>}
            >
              <div className="drawer-tab-content">
                <Flex
                  justifyContent={{ default: 'justifyContentSpaceBetween' }}
                  alignItems={{ default: 'alignItemsCenter' }}
                  className="margin-bottom-16"
                >
                  <FlexItem>
                    <Title headingLevel="h3" size="lg">
                      <CubesIcon className="icon-with-margin-right-primary" />
                      Running Pods
                    </Title>
                  </FlexItem>
                  <FlexItem className="flex-item-margin-left">
                    <SearchInput
                      placeholder="Search pods..."
                      value={podSearchTerm}
                      onChange={(_event, value) => setPodSearchTerm(value)}
                      onClear={() => setPodSearchTerm('')}
                      className="margin-bottom-16"
                    />
                  </FlexItem>
                </Flex>

                <Card>
                  <CardTitle>
                    <Title headingLevel="h3" size="lg">
                      <CubesIcon className="icon-with-margin-right-primary" />
                      Pods ({filteredAndSortedPods.length}{podSearchTerm ? ` of ${(node?.pods || []).length}` : ''})
                    </Title>
                  </CardTitle>
                  <CardBody>
                    {filteredAndSortedPods.length === 0 ? (
                      <Alert variant={AlertVariant.info} title={podSearchTerm ? "No Matching Pods" : "No Running Pods"}>
                        {podSearchTerm 
                          ? `No pods match the search term "${podSearchTerm}".`
                          : "This node currently has no running pods."}
                      </Alert>
                    ) : (
                      <Table aria-label="Pods table">
                        <Thead>
                          <Tr>
                            <Th
                              sort={{
                                sortBy: { index: 0, direction: podSortBy === 'name' ? podSortDirection : undefined },
                                onSort: () => handlePodSort('name'),
                                columnIndex: 0,
                              }}
                            >
                              Pod Name {getSortIcon('name')}
                            </Th>
                            <Th
                              sort={{
                                sortBy: { index: 1, direction: podSortBy === 'namespace' ? podSortDirection : undefined },
                                onSort: () => handlePodSort('namespace'),
                                columnIndex: 1,
                              }}
                            >
                              Namespace {getSortIcon('namespace')}
                            </Th>
                            <Th
                              sort={{
                                sortBy: { index: 2, direction: podSortBy === 'status' ? podSortDirection : undefined },
                                onSort: () => handlePodSort('status'),
                                columnIndex: 2,
                              }}
                            >
                              Status {getSortIcon('status')}
                            </Th>
                            <Th
                              sort={{
                                sortBy: { index: 3, direction: podSortBy === 'cpuUsage' ? podSortDirection : undefined },
                                onSort: () => handlePodSort('cpuUsage'),
                                columnIndex: 3,
                              }}
                            >
                              CPU % {getSortIcon('cpuUsage')}
                            </Th>
                            <Th
                              sort={{
                                sortBy: { index: 4, direction: podSortBy === 'memoryUsage' ? podSortDirection : undefined },
                                onSort: () => handlePodSort('memoryUsage'),
                                columnIndex: 4,
                              }}
                            >
                              Memory % {getSortIcon('memoryUsage')}
                            </Th>
                            <Th
                              sort={{
                                sortBy: { index: 5, direction: podSortBy === 'containers' ? podSortDirection : undefined },
                                onSort: () => handlePodSort('containers'),
                                columnIndex: 5,
                              }}
                            >
                              Containers {getSortIcon('containers')}
                            </Th>
                            <Th
                              sort={{
                                sortBy: { index: 6, direction: podSortBy === 'restarts' ? podSortDirection : undefined },
                                onSort: () => handlePodSort('restarts'),
                                columnIndex: 6,
                              }}
                            >
                              Restarts {getSortIcon('restarts')}
                            </Th>
                            <Th
                              sort={{
                                sortBy: { index: 7, direction: podSortBy === 'age' ? podSortDirection : undefined },
                                onSort: () => handlePodSort('age'),
                                columnIndex: 7,
                              }}
                            >
                              Age {getSortIcon('age')}
                            </Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {filteredAndSortedPods.map((pod, index) => (
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
                              <Td>
                                {pod?.cpuUsage !== undefined && pod.cpuUsage > 0 
                                  ? `${pod.cpuUsage.toFixed(2)}%` 
                                  : 'N/A'}
                              </Td>
                              <Td>
                                {pod?.memoryUsage !== undefined && pod.memoryUsage > 0 
                                  ? `${pod.memoryUsage.toFixed(2)}%` 
                                  : 'N/A'}
                              </Td>
                              <Td>
                                {pod?.readyContainers || 0}/{pod?.containers || 0}
                              </Td>
                              <Td>{pod?.restarts || 0}</Td>
                              <Td>{pod?.age || 'N/A'}</Td>
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
            <Tab eventKey="events" title={<TabTitleText>Events</TabTitleText>}>
              <div className="drawer-tab-content">
                <Card>
                  <CardTitle>
                    <Title headingLevel="h3" size="lg">
                      <BellIcon className="icon-with-margin-right-primary" />
                      Recent Events
                    </Title>
                  </CardTitle>
                  <CardBody>
                    {node?.events && node.events.length > 0 ? (
                      <Table aria-label="Events table">
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
                          {node.events.map((event, index) => (
                            <Tr key={index}>
                              <Td>
                                <Badge color={event.type === 'Warning' ? 'orange' : 'blue'}>
                                  {event.type}
                                </Badge>
                              </Td>
                              <Td>{event.reason}</Td>
                              <Td className="table-cell-wrap">
                                {event.message}
                              </Td>
                              <Td>{event.count}</Td>
                              <Td>{event.timestamp}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    ) : (
                      <div className="table-empty-state">
                        No events available for this node
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            </Tab>

            {/* Taints Tab */}
            <Tab eventKey="taints" title={<TabTitleText>Taints & Labels</TabTitleText>}>
              <div className="drawer-tab-content">
                <Grid hasGutter>
                  <GridItem span={6}>
                    <Card>
                      <CardTitle>
                        <Title headingLevel="h3" size="lg">
                          <TagIcon className="icon-with-margin-right-primary" />
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
                          <FilterIcon className="icon-with-margin-right-primary" />
                          Labels ({Object.keys(node?.labels || {}).length})
                        </Title>
                      </CardTitle>
                      <CardBody>
                        <div className="flex-wrap-gap-8">
                          {Object.entries(node?.labels || {}).map(([key, value]) => (
                            <Badge key={key} className="badge-small">
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
              <div className="drawer-tab-content">
                <Grid hasGutter>
                  <GridItem span={6}>
                    <Card>
                      <CardTitle>
                        <Title headingLevel="h3" size="lg">
                          <BellIcon className="icon-with-margin-right-primary" />
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
                    <Card className="card-full-height">
                      <CardTitle>
                        <Flex
                          justifyContent={{ default: 'justifyContentSpaceBetween' }}
                          alignItems={{ default: 'alignItemsCenter' }}
                        >
                          <FlexItem>
                            <Title headingLevel="h3" size="lg">
                              <MonitoringIcon className="icon-with-margin-right-primary" />
                              Node Logs ({realLogs.length})
                            </Title>
                          </FlexItem>
                          <FlexItem>
                            <Button variant="link" onClick={refetchLogs} isDisabled={isLogsLoading}>
                              {isLogsLoading ? <Spinner size="sm" /> : '↻ Refresh'}
                            </Button>
                          </FlexItem>
                        </Flex>
                      </CardTitle>

                      {/* Log Controls - Similar to OpenShift Console */}
                      <div className="chart-controls">
                        <Flex>
                          <FlexItem>
                            <FormSelect
                              value={selectedPath}
                              onChange={(_event, value) => setSelectedPath(value as string)}
                              className="chart-control-item"
                              aria-label="Select log path"
                            >
                              {availablePaths.map((path) => (
                                <FormSelectOption
                                  key={path}
                                  value={path}
                                  label={
                                    path === 'journal'
                                      ? 'Journal'
                                      : path.charAt(0).toUpperCase() + path.slice(1)
                                  }
                                />
                              ))}
                            </FormSelect>
                          </FlexItem>

                          {availableLogFiles.length > 0 && (
                            <FlexItem>
                              <FormSelect
                                value={selectedLogFile}
                                onChange={(_event, value) => setSelectedLogFile(value as string)}
                                className="chart-control-item-with-margin"
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
                              className="chart-control-time"
                              aria-label="Filter log types"
                            >
                              <FormSelectOption value="all" label="All Types" />
                              <FormSelectOption value="kubelet" label="Kubelet" />
                              <FormSelectOption value="containerd" label="Container Runtime" />
                              <FormSelectOption value="journal" label="System Journal" />
                              <FormSelectOption value="kube-scheduler" label="Scheduler" />
                              <FormSelectOption
                                value="controller-manager"
                                label="Controller Manager"
                              />
                              <FormSelectOption value="network" label="Network" />
                            </FormSelect>
                          </FlexItem>
                        </Flex>
                      </div>

                      <CardBody className="card-body-flex">
                        {isLogsLoading ? (
                          <div className="chart-loading">
                            <Spinner size="lg" />
                          </div>
                        ) : logsError ? (
                          <Alert
                            variant={AlertVariant.danger}
                            title="Error fetching logs"
                            className="chart-error"
                          >
                            {logsError}
                          </Alert>
                        ) : selectedPath !== 'journal' && !selectedLogFile ? (
                          <EmptyState
                            headingLevel="h4"
                            titleText={
                              availableLogFiles.length === 0
                                ? 'No log files exist'
                                : 'No log file selected'
                            }
                            variant={EmptyStateVariant.sm}
                          >
                            <EmptyStateBody>
                              {availableLogFiles.length === 0
                                ? `No log files are available for ${selectedPath}.`
                                : 'Select a log file from the dropdown above.'}
                            </EmptyStateBody>
                          </EmptyState>
                        ) : filteredLogs.length === 0 ? (
                          <Alert
                            variant={AlertVariant.info}
                            title="No logs available"
                            className="chart-error"
                          >
                            {selectedPath === 'journal'
                              ? "This node's journal logs are currently empty or not accessible."
                              : `No logs are currently available for ${selectedPath}${
                                  selectedLogFile ? `/${selectedLogFile}` : ''
                                }.`}
                          </Alert>
                        ) : (
                          <div className="chart-content">
                            {filteredLogs.slice(-100).map((log, index) => (
                              <div
                                key={index}
                                className="chart-metric-row"
                              >
                                <div className="section-header">
                                  <span className="chart-metric-label">
                                    {getLogTypeIcon(log?.component || 'unknown')}
                                  </span>
                                  <span className="chart-metric-current">
                                    {getLogLevelIcon(log?.level || 'INFO')}
                                  </span>
                                  <span className="chart-metric-max">
                                    {log?.component || 'Unknown'}
                                  </span>
                                  <span className="chart-metric-time">
                                    {formatDate(log?.timestamp)}
                                  </span>
                                </div>
                                <div className="chart-content">
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
