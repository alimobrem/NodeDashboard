import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  PageSection,
  Card,
  CardTitle,
  CardBody,
  Title,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Grid,
  GridItem,
  Badge,
  Button,
  Spinner,
  Alert,
  Tabs,
  Tab,
  TabTitleText,
  TabContent,
  TabContentBody,
  Switch
} from '@patternfly/react-core';
import {
  MonitoringIcon,
  CpuIcon,
  MemoryIcon,
  BellIcon,
  RedoIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  TimesCircleIcon
} from '@patternfly/react-icons';

import NodeFilters from './nodes/NodeFilters';
import NodeSummaryCards from './nodes/NodeSummaryCards';
import NodeDetailsDrawer from './nodes/NodeDetailsDrawer';

import { useNodeData } from '../hooks/useNodeData';
import { useNodeFilters } from '../hooks/useNodeFilters';
import { useNodeSelection } from '../hooks/useNodeSelection';
import { NodeDetail } from '../types';
import { getAge } from '../utils/timeUtils';

import './NodesDashboard.css';

const NodesDashboard: React.FC = () => {
  const { nodes, loading, error, refetch: refetchNodes, metricsAvailable } = useNodeData();
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    roleFilter,
    setRoleFilter,
    filteredAndSortedNodes
  } = useNodeFilters(nodes);

  const {
    selectedNode,
    setSelectedNode
  } = useNodeSelection();

  // Drawer state (managed locally since it's not in the hook)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshCountdown, setRefreshCountdown] = useState<number>(30);

  // Tab state
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Node selection state
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          refetchNodes();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refetchNodes]);

  // Summary statistics
  const summary = useMemo(() => {
    const total = filteredAndSortedNodes.length;
    const ready = filteredAndSortedNodes.filter((node: NodeDetail) => node.status === 'Ready').length;
    const notReady = filteredAndSortedNodes.filter((node: NodeDetail) => node.status === 'NotReady').length;
    const unknown = filteredAndSortedNodes.filter((node: NodeDetail) => node.status === 'Unknown').length;
    const controlPlane = filteredAndSortedNodes.filter((node: NodeDetail) => node.role.includes('control')).length;
    const workers = total - controlPlane;

    const totalPods = filteredAndSortedNodes.reduce((sum: number, node: NodeDetail) => sum + (node.pods?.length || 0), 0);
    const runningPods = filteredAndSortedNodes.reduce((sum: number, node: NodeDetail) => 
      sum + (node.pods?.filter(pod => pod.status === 'Running').length || 0), 0);
    const pendingPods = filteredAndSortedNodes.reduce((sum: number, node: NodeDetail) => 
      sum + (node.pods?.filter(pod => pod.status === 'Pending').length || 0), 0);
    const failedPods = filteredAndSortedNodes.reduce((sum: number, node: NodeDetail) => 
      sum + (node.pods?.filter(pod => pod.status === 'Failed').length || 0), 0);

    return {
      total,
      ready,
      notReady,
      unknown,
      controlPlane,
      workers,
      totalPods,
      runningPods,
      pendingPods,
      failedPods
    };
  }, [filteredAndSortedNodes]);



  const handleBulkAction = useCallback((action: string) => {
    console.log(`Performing ${action} on nodes:`, Array.from(selectedNodes));
    // Implement bulk actions here
  }, [selectedNodes]);

  // Node health helper
  const getNodeHealthIcon = (node: NodeDetail): React.ReactNode => {
    switch (node.status) {
      case 'Ready': return <CheckCircleIcon />;
      case 'NotReady': return <TimesCircleIcon />;
      case 'Unknown': return <ExclamationTriangleIcon />;
      default: return <ExclamationCircleIcon />;
    }
  };

  const handleNodeClick = useCallback((node: NodeDetail) => {
    setSelectedNode(node);
    setIsDrawerOpen(true);
  }, [setSelectedNode, setIsDrawerOpen]);

  const formatResourceValue = (value: string | undefined, unit: string): { value: string; unit: string } => {
    if (!value) return { value: '0', unit };
    
    if (unit === 'memory') {
      // Handle memory values like "1Gi", "512Mi", etc.
      if (value.endsWith('Ki')) {
        const kb = parseInt(value.slice(0, -2));
        return { value: (kb / 1024 / 1024).toFixed(1), unit: 'GB' };
      }
      if (value.endsWith('Mi')) {
        const mb = parseInt(value.slice(0, -2));
        return { value: (mb / 1024).toFixed(1), unit: 'GB' };
      }
      if (value.endsWith('Gi')) {
        const gb = parseInt(value.slice(0, -2));
        return { value: gb.toString(), unit: 'GB' };
      }
      return { value, unit };
    }
    
    if (unit === 'cpu') {
      // Handle CPU values like "100m", "1.5", etc.
      if (value.endsWith('m')) {
        return { value: value.slice(0, -1), unit: 'millicores' };
      }
      return { value, unit: 'cores' };
    }
    
    return { value, unit };
  };

  // Enhanced Node Card Component
  const EnhancedNodeCard: React.FC<{ node: NodeDetail }> = ({ node }) => {
    const isSelected = selectedNodes.has(node.name);
    const hasAlerts = node.events?.some(event => event.type === 'Warning') || false;
    
    const cpu = formatResourceValue(node.allocatableResources?.cpu, 'cpu');
    const memory = formatResourceValue(node.allocatableResources?.memory, 'memory');

    return (
      <Card 
        className={`node-card ${isSelected ? 'node-card--selected' : ''}`}
        onClick={() => handleNodeClick(node)}
        isClickable
        isSelectable
      >
        <CardTitle className={`node-card-title ${isSelected ? 'node-card-title--selected' : ''}`}>
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
            <FlexItem className="flex-1">
              <Title headingLevel="h4" size="lg" className="node-title-heading">
                {node.name}
              </Title>
              <div className="node-status-badges">
                <Badge
                  className={`node-status-badge ${
                    node.status === 'Ready' ? 'node-status-badge--ready' :
                    node.status === 'NotReady' ? 'node-status-badge--not-ready' :
                    node.status === 'Unknown' ? 'node-status-badge--unknown' :
                    'node-status-badge--default'
                  }`}
                >
                  {node.status}
                </Badge>
                <Badge
                  className={node.role.includes('control') ? 'node-role-badge--control' : 'node-role-badge--worker'}
                >
                  {node.role.includes('control') ? 'Control Plane' : 'Worker'}
                </Badge>
                {hasAlerts && (
                  <Badge className="node-alert-badge">
                    <BellIcon className="node-alert-icon" />
                    Alert
                  </Badge>
                )}
              </div>
            </FlexItem>
          </Flex>
        </CardTitle>

        <CardBody className="node-card-body">
          <Stack hasGutter>
            {/* Resource Usage Section */}
            <StackItem>
              <Grid hasGutter>
                <GridItem span={6}>
                  <div className="node-card-metric">
                    <div className="node-card-metric-header">
                      <CpuIcon className="node-card-metric-icon node-card-metric-icon--cpu" />
                      <span className="node-card-metric-label">CPU</span>
                    </div>
                    <div className="node-card-metric-value node-card-metric-value--cpu">
                      {node.metrics?.cpu?.current || 0}%
                    </div>
                    <div className="node-card-metric-text">
                      {cpu.value} {cpu.unit}
                    </div>
                  </div>
                </GridItem>
                <GridItem span={6}>
                  <div className="node-card-metric">
                    <div className="node-card-metric-header">
                      <MemoryIcon className="node-card-metric-icon node-card-metric-icon--memory" />
                      <span className="node-card-metric-label">Memory</span>
                    </div>
                    <div className="node-card-metric-value node-card-metric-value--memory">
                      {node.metrics?.memory?.current || 0}%
                    </div>
                    <div className="node-card-metric-text">
                      {memory.value} {memory.unit}
                    </div>
                  </div>
                </GridItem>
              </Grid>
            </StackItem>

            {/* Node Information Grid */}
            <StackItem>
              <div className="node-info-grid">
                <div className="node-info-item">
                  <span className="text-label">Zone</span>
                  <span className="text-value">{node.zone || 'Unknown'}</span>
                </div>
                <div className="node-info-item">
                  <span className="text-label">Instance</span>
                  <span className="text-value">{node.instanceType || 'Unknown'}</span>
                </div>
                <div className="node-info-item">
                  <span className="text-label">Age</span>
                  <span className="text-value">{getAge(node.age)}</span>
                </div>
                <div className="node-info-item">
                  <span className="text-label">Version</span>
                  <span className="text-value">{node.version}</span>
                </div>
                <div className="node-info-item">
                  <span className="text-label">OS</span>
                  <span className="text-value">{node.operatingSystem}</span>
                </div>
                <div className="node-info-item">
                  <span className="text-label">Arch</span>
                  <span className="text-value">{node.architecture}</span>
                </div>
              </div>
            </StackItem>

            {/* Pod Status Summary */}
            <StackItem>
              <div className="node-pods-summary">
                <div className="pod-status-item">
                  <div className="status-indicator status-indicator--running" />
                  <span>Running: {node.pods?.filter(pod => pod.status === 'Running').length || 0}</span>
                </div>
                <div className="pod-status-item">
                  <div className="status-indicator status-indicator--pending" />
                  <span>Pending: {node.pods?.filter(pod => pod.status === 'Pending').length || 0}</span>
                </div>
                <div className="pod-status-item">
                  <div className="status-indicator status-indicator--failed" />
                  <span>Failed: {node.pods?.filter(pod => pod.status === 'Failed').length || 0}</span>
                </div>
              </div>
            </StackItem>

            {/* Node Conditions */}
            <StackItem>
              <div className="flex-wrap-gap">
                {node.conditions?.map((condition) => (
                  <Badge
                    key={condition.type}
                    className={`node-condition-badge ${
                      condition.status === 'True' ? 'node-condition-badge--active' : 'node-condition-badge--inactive'
                    }`}
                  >
                    {condition.type}
                  </Badge>
                ))}
              </div>
            </StackItem>
          </Stack>
        </CardBody>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spinner size="lg" />
        <span className="loading-text">Loading node data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <PageSection>
        <Alert variant="danger" title="Error loading nodes">
          {error}
        </Alert>
      </PageSection>
    );
  }

  return (
    <>
      {/* Sticky Header Section */}
      <div className="sticky-header">
        <PageSection className="dashboard-header">
          <Stack hasGutter>
            {/* Header */}
            <StackItem>
              <Flex
                justifyContent={{ default: 'justifyContentSpaceBetween' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <FlexItem>
                  <Title headingLevel="h1" size="2xl">
                    <MonitoringIcon
                      className="dashboard-title-section"
                    />
                    Enhanced Node Dashboard
                  </Title>
                  <span className="text-subtitle">
                    Comprehensive visual monitoring of cluster nodes with real-time data
                  </span>
                </FlexItem>
                <FlexItem>
                  <Flex alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem>
                      <div className={`status-indicator-metrics ${
                        metricsAvailable ? 'status-indicator-metrics--available' : 'status-indicator-metrics--unavailable'
                      }`}>
                        <div className={`status-dot ${
                          metricsAvailable ? 'status-dot--available' : 'status-dot--unavailable'
                        }`} />
                        <span className={`status-text ${
                          metricsAvailable ? 'status-text--available' : 'status-text--unavailable'
                        }`}>
                          {metricsAvailable ? 'Live Metrics' : 'Limited Data'}
                        </span>
                      </div>
                    </FlexItem>
                    <FlexItem>
                      <div className="auto-refresh-controls">
                        <Switch
                          id="auto-refresh-switch"
                          label="Auto-refresh"
                          isChecked={autoRefresh}
                          onChange={(_event, checked) => setAutoRefresh(checked)}
                        />
                        {autoRefresh && (
                          <span className="refresh-countdown">
                            Next: {refreshCountdown}s
                          </span>
                        )}
                        <Button
                          variant="plain"
                          icon={<RedoIcon />}
                          onClick={() => {
                            refetchNodes();
                            setRefreshCountdown(30);
                          }}
                          aria-label="Refresh nodes"
                        />
                      </div>
                    </FlexItem>
                  </Flex>
                </FlexItem>
              </Flex>
            </StackItem>

            {/* Toolbar */}
            <StackItem>
              <Card>
                <CardBody className="dashboard-toolbar">
                  <NodeFilters
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    roleFilter={roleFilter}
                    setRoleFilter={setRoleFilter}
                  />
                </CardBody>
              </Card>
            </StackItem>
          </Stack>
        </PageSection>
      </div>

      {/* Main Content */}
      <PageSection>
        <Stack hasGutter>
          {/* Summary Cards */}
          <StackItem>
            <NodeSummaryCards 
              totalNodes={summary.total}
              readyNodes={summary.ready}
              runningPods={summary.runningPods}
              needsAttention={summary.notReady + summary.unknown}
            />
          </StackItem>

          {/* Bulk Actions */}
          {selectedNodes.size > 0 && (
            <StackItem>
              <Alert
                variant="info"
                title={`${selectedNodes.size} node(s) selected`}
                actionLinks={
                  <div className="flex-item-center">
                    <Button variant="secondary" size="sm" onClick={() => handleBulkAction('cordon')}>
                      Cordon
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleBulkAction('drain')}>
                      Drain
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleBulkAction('uncordon')}>
                      Uncordon
                    </Button>
                    <Button variant="link" size="sm" onClick={() => setSelectedNodes(new Set())}>
                      Clear Selection
                    </Button>
                  </div>
                }
              />
            </StackItem>
          )}

          {/* Tabs */}
          <StackItem>
            <Tabs activeKey={activeTab} onSelect={(_event, tabIndex) => setActiveTab(tabIndex as string)}>
              <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
                <TabContent eventKey="overview" id="overview-tab">
                  <TabContentBody>
                    {/* Node Grid */}
                    <Grid hasGutter>
                      {filteredAndSortedNodes.map((node) => (
                        <GridItem key={node.name} span={12} md={6} lg={4} xl={3}>
                          <EnhancedNodeCard node={node} />
                        </GridItem>
                      ))}
                    </Grid>

                    {filteredAndSortedNodes.length === 0 && (
                      <Card>
                        <CardBody className="card-body-padded">
                          <div className="loading-container">
                            <EyeIcon />
                            <span className="loading-text">
                              No nodes match the current filters
                            </span>
                          </div>
                        </CardBody>
                      </Card>
                    )}
                  </TabContentBody>
                </TabContent>
              </Tab>

              <Tab eventKey="table" title={<TabTitleText>Table View</TabTitleText>}>
                <TabContent eventKey="table" id="table-tab">
                  <TabContentBody>
                    <Card>
                      <CardBody>
                        <p>Table view implementation would go here</p>
                      </CardBody>
                    </Card>
                  </TabContentBody>
                </TabContent>
              </Tab>

              <Tab eventKey="topology" title={<TabTitleText>Topology</TabTitleText>}>
                <TabContent eventKey="topology" id="topology-tab">
                  <TabContentBody>
                    <Card>
                      <CardBody>
                        <p>Topology view implementation would go here</p>
                      </CardBody>
                    </Card>
                  </TabContentBody>
                </TabContent>
              </Tab>
            </Tabs>
          </StackItem>
        </Stack>
      </PageSection>

      {/* Node Details Drawer */}
      {selectedNode && (
        <NodeDetailsDrawer
          node={selectedNode}
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedNode(null);
          }}
        />
      )}
    </>
  );
};

export default NodesDashboard;
