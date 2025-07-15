import * as React from 'react';
import { useState } from 'react';
import { NodeDetailsDrawer } from './nodes';
import { useNodeData } from '../hooks/useNodeData';

// PatternFly Core Components
import {
  Alert,
  AlertVariant,
  Badge,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  PageSection,
  Spinner,
  Stack,
  StackItem,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  SearchInput,
  Select,
  SelectOption,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';

// PatternFly Table Components (unused - moved to drawer)
// import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';

// PatternFly Icons
import {
  CheckCircleIcon,
  CpuIcon,
  ExclamationTriangleIcon,
  InfoCircleIcon,
  MemoryIcon,
  MonitoringIcon,
  ServerIcon,
  TimesCircleIcon,
  CubesIcon,
  FilterIcon,
  BellIcon,
} from '@patternfly/react-icons';

// Interfaces
interface NodeMetrics {
  cpu: {
    current: number;
    history: Array<{ timestamp: number; value: number }>;
  };
  memory: {
    current: number;
    history: Array<{ timestamp: number; value: number }>;
  };
}

interface NodeCondition {
  type: string;
  status: string;
  lastTransitionTime: string;
  reason: string;
  message: string;
}

interface PodResource {
  name: string;
  namespace: string;
  status: string;
  cpuUsage: number;
  memoryUsage: number;
  restarts: number;
  age: string;
  containers: number;
  readyContainers: number;
}

interface NodeEvent {
  type: 'Warning' | 'Normal';
  reason: string;
  message: string;
  timestamp: string;
  count: number;
}

interface NodeAlert {
  severity: 'warning' | 'critical' | 'info';
  message: string;
  reason: string;
  timestamp: string;
  count: number;
  source: string;
}

interface NodeLog {
  component: string;
  content: string;
  timestamp: string;
  level?: string;
}

interface NodeSystemInfo {
  filesystem: {
    availableBytes?: number;
    capacityBytes?: number;
    usedBytes?: number;
    inodesFree?: number;
    inodes?: number;
    inodesUsed?: number;
  };
  runtime: {
    imageFs?: {
      availableBytes?: number;
      capacityBytes?: number;
      usedBytes?: number;
    };
  };
  rlimit: {
    maxpid?: number;
    curproc?: number;
  };
}

interface NodeTaint {
  key: string;
  value?: string;
  effect: string;
  timeAdded?: string;
}

interface NodeDetail {
  name: string;
  status: 'Ready' | 'NotReady' | 'Unknown';
  role: string;
  version: string;
  age: string;
  uptime: string;
  zone: string;
  instanceType: string;
  operatingSystem: string;
  architecture: string;
  containerRuntime: string;
  cordoned: boolean;
  drained: boolean;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  allocatableResources: {
    cpu: string;
    memory: string;
    pods: string;
  };
  conditions: NodeCondition[];
  metrics: NodeMetrics;
  pods: PodResource[];
  events: NodeEvent[];
  // Enhanced debugging information
  alerts: NodeAlert[];
  logs: NodeLog[];
  systemInfo: NodeSystemInfo;
  taints: NodeTaint[];
  resourcePressure: {
    memory?: boolean;
    disk?: boolean;
    pid?: boolean;
  };
  networkInfo: {
    internalIP?: string;
    externalIP?: string;
    hostname?: string;
  };
}

interface MiniChartProps {
  data: Array<{ timestamp: number; value: number }>;
  color: string;
  width?: number;
  height?: number;
}

interface EnhancedNodeCardProps {
  node: NodeDetail;
  onClick?: (node: NodeDetail) => void;
  isSelected?: boolean;
}

// Utility Components
const MiniLineChart: React.FC<MiniChartProps> = ({ data, color, width = 200, height = 60 }) => {
  if (!data || data.length === 0) {
    return null;
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  const pathData = data
    .map((point, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((point.value - minValue) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <path
        d={`${pathData} L ${width} ${height} L 0 ${height} Z`}
        fill={`url(#gradient-${color.replace('#', '')})`}
        stroke="none"
      />
      <path d={pathData} stroke={color} strokeWidth="2" fill="none" />
    </svg>
  );
};

// Enhanced Node Card Component
const EnhancedNodeCard: React.FC<EnhancedNodeCardProps> = ({ node, onClick, isSelected }) => {
  const getNodeHealthColor = (node: NodeDetail) => {
    if (node.cordoned || node.drained) return '#f0ab00';
    if (node.status === 'NotReady') return '#c9190b';
    if (node.status === 'Unknown') return '#6a6e73';
    return '#3e8635';
  };

  const getNodeHealthIcon = (node: NodeDetail) => {
    if (node.cordoned || node.drained) return <ExclamationTriangleIcon />;
    if (node.status === 'NotReady') return <TimesCircleIcon />;
    if (node.status === 'Unknown') return <InfoCircleIcon />;
    return <CheckCircleIcon />;
  };

  const getPodStatusColor = (status: string) => {
    switch (status) {
      case 'Running':
        return '#3e8635';
      case 'Pending':
        return '#f0ab00';
      case 'Failed':
        return '#c9190b';
      case 'Succeeded':
        return '#339af0';
      default:
        return '#6a6e73';
    }
  };

  const formatCPU = (cpuValue: string): { value: number; unit: string } => {
    if (cpuValue.endsWith('m')) {
      return { value: parseInt(cpuValue.slice(0, -1)), unit: 'millicores' };
    }
    return { value: parseFloat(cpuValue), unit: 'cores' };
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

  const runningPods = node.pods.filter((pod) => pod.status === 'Running').length;
  const pendingPods = node.pods.filter((pod) => pod.status === 'Pending').length;
  const failedPods = node.pods.filter((pod) => pod.status === 'Failed').length;
  const totalPods = node.pods.length;

  const cpu = formatCPU(node.allocatableResources.cpu);
  const memory = formatMemoryForDisplay(node.allocatableResources.memory);

  const hasAlerts =
    node.cordoned ||
    node.drained ||
    node.status === 'NotReady' ||
    node.events.some((event) => event.type === 'Warning');

  return (
    <Card
      isSelectable
      isSelected={isSelected}
      onClick={() => onClick?.(node)}
      style={{
        cursor: 'pointer',
        border: isSelected ? '2px solid #0066cc' : '1px solid #d2d2d2',
        borderRadius: '8px',
        transition: 'all 0.2s ease',
        minHeight: '480px',
        height: 'auto',
        position: 'relative',
      }}
    >
      {/* Header Section */}
      <CardTitle
        style={{
          padding: '16px 16px 16px 16px',
          borderBottom: '1px solid #f0f0f0',
          background: isSelected ? '#f0f8ff' : 'transparent',
          minHeight: '100px',
        }}
      >
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            {React.cloneElement(getNodeHealthIcon(node), {
              style: { color: getNodeHealthColor(node), fontSize: '1.5rem' },
            })}
          </FlexItem>
          <FlexItem flex={{ default: 'flex_1' }}>
            <div>
              <Title headingLevel="h4" size="lg" style={{ marginBottom: '4px' }}>
                {node.name}
              </Title>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Badge
                  style={{
                    backgroundColor: getNodeHealthColor(node),
                    color: 'white',
                    fontSize: '0.75rem',
                  }}
                >
                  {node.status}
                </Badge>
                <Badge
                  style={{
                    backgroundColor: node.role.includes('control') ? '#0066cc' : '#6a6e73',
                    color: 'white',
                    fontSize: '0.75rem',
                  }}
                >
                  {node.role.includes('control') ? 'Control Plane' : 'Worker'}
                </Badge>
                {hasAlerts && (
                  <Badge
                    style={{ backgroundColor: '#f0ab00', color: 'white', fontSize: '0.75rem' }}
                  >
                    <BellIcon style={{ marginRight: '4px', fontSize: '0.75rem' }} />
                    Alert
                  </Badge>
                )}
              </div>
            </div>
          </FlexItem>
        </Flex>
      </CardTitle>

      <CardBody style={{ padding: '16px', overflow: 'visible' }}>
        <Stack hasGutter>
          {/* Resource Usage Section */}
          <StackItem>
            <Grid hasGutter>
              <GridItem span={6}>
                <div
                  style={{
                    textAlign: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    <CpuIcon style={{ marginRight: '6px', color: '#0066cc' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>CPU</span>
                  </div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: '#0066cc',
                      marginBottom: '4px',
                    }}
                  >
                    {node.metrics?.cpu?.current || 0}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6a6e73', marginBottom: '6px' }}>
                    {cpu.value} {cpu.unit}
                  </div>
                  {node.metrics?.cpu?.history && (
                    <MiniLineChart
                      data={node.metrics.cpu.history}
                      color="#0066cc"
                      width={100}
                      height={25}
                    />
                  )}
                </div>
              </GridItem>
              <GridItem span={6}>
                <div
                  style={{
                    textAlign: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    <MemoryIcon style={{ marginRight: '6px', color: '#ff6b35' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Memory</span>
                  </div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: '#ff6b35',
                      marginBottom: '4px',
                    }}
                  >
                    {node.metrics?.memory?.current || 0}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6a6e73', marginBottom: '6px' }}>
                    {memory}
                  </div>
                  {node.metrics?.memory?.history && (
                    <MiniLineChart
                      data={node.metrics.memory.history}
                      color="#ff6b35"
                      width={100}
                      height={25}
                    />
                  )}
                </div>
              </GridItem>
            </Grid>
          </StackItem>

          {/* Pod Visualization Section */}
          <StackItem>
            <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '4px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CubesIcon style={{ color: '#009639', fontSize: '1rem' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Pods</span>
                </div>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#009639' }}>
                  {totalPods}/{node.allocatableResources.pods}
                </span>
              </div>

              {/* Pod Grid Visualization */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, 10px)',
                  gap: '2px',
                  marginBottom: '10px',
                  maxHeight: '100px',
                  overflow: 'visible',
                }}
              >
                {node.pods.slice(0, 60).map((pod, index) => (
                  <div
                    key={`${pod.name}-${index}`}
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: pod.restarts > 0 ? '50%' : '2px',
                      backgroundColor: getPodStatusColor(pod.status),
                      opacity: pod.restarts > 0 ? 0.7 : 1,
                      border: pod.restarts > 0 ? '1px solid #f0ab00' : 'none',
                      position: 'relative',
                    }}
                    title={`${pod.name}: ${pod.status}${
                      pod.restarts > 0 ? ` (${pod.restarts} restarts)` : ''
                    }`}
                  />
                ))}
                {totalPods > 60 && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#6a6e73',
                      gridColumn: 'span 4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    +{totalPods - 60}
                  </div>
                )}
              </div>

              {/* Pod Status Summary */}
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      backgroundColor: '#3e8635',
                      borderRadius: '2px',
                    }}
                  />
                  <span>{runningPods} Running</span>
                </div>
                {pendingPods > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        backgroundColor: '#f0ab00',
                        borderRadius: '2px',
                      }}
                    />
                    <span>{pendingPods} Pending</span>
                  </div>
                )}
                {failedPods > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        backgroundColor: '#c9190b',
                        borderRadius: '2px',
                      }}
                    />
                    <span>{failedPods} Failed</span>
                  </div>
                )}
              </div>
            </div>
          </StackItem>

          {/* Node Details Section */}
          <StackItem style={{ flex: 1 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                fontSize: '0.875rem',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6a6e73' }}>Zone:</span>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{node.zone}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6a6e73' }}>Instance:</span>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{node.instanceType}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6a6e73' }}>Age:</span>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{node.age}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6a6e73' }}>Version:</span>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                    {node.version.split('+')[0]}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6a6e73' }}>OS:</span>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                    {node.operatingSystem}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6a6e73' }}>Arch:</span>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{node.architecture}</span>
                </div>
              </div>
            </div>

            {/* Conditions Summary */}
            {node.conditions.length > 0 && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px',
                  backgroundColor: '#f0f8ff',
                  borderRadius: '4px',
                }}
              >
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: '#0066cc',
                  }}
                >
                  Conditions
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {node.conditions.slice(0, 4).map((condition, index) => (
                    <Badge
                      key={index}
                      style={{
                        backgroundColor: condition.status === 'True' ? '#3e8635' : '#6a6e73',
                        color: 'white',
                        fontSize: '0.7rem',
                        padding: '4px 8px',
                      }}
                    >
                      {condition.type}
                    </Badge>
                  ))}
                  {node.conditions.length > 4 && (
                    <span style={{ fontSize: '0.7rem', color: '#6a6e73' }}>
                      +{node.conditions.length - 4}
                    </span>
                  )}
                </div>
              </div>
            )}
          </StackItem>
        </Stack>
      </CardBody>
    </Card>
  );
};

// Note: Utility functions moved to useNodeData hook

// Main Dashboard Component
const NodesDashboard: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Use the enhanced useNodeData hook with metrics support
  const { nodes, loading, error, metricsAvailable } = useNodeData();

  // Add CSS animation for pulse effect
  const pulseAnimation = `
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
  `;

  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = pulseAnimation;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Simplified filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'notready'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'control' | 'worker'>('all');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Note: Debug data fetching is now handled in the useNodeData hook

  // Note: Node data processing is now handled in the useNodeData hook

  // Note: Node data processing is now handled in the useNodeData hook

  // Enhanced filtering and sorting
  const filteredAndSortedNodes = React.useMemo(() => {
    const filtered = nodes.filter((node) => {
      // Search filter
      const matchesSearch =
        searchTerm === '' ||
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.instanceType.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'ready' && node.status === 'Ready') ||
        (statusFilter === 'notready' && node.status !== 'Ready');

      // Role filter
      const matchesRole =
        roleFilter === 'all' ||
        (roleFilter === 'control' && node.role.includes('control')) ||
        (roleFilter === 'worker' && !node.role.includes('control'));

      return matchesSearch && matchesStatus && matchesRole;
    });

    // Sort by role (control plane first), then by name
    filtered.sort((a, b) => {
      if (a.role.includes('control') && !b.role.includes('control')) return -1;
      if (!a.role.includes('control') && b.role.includes('control')) return 1;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [nodes, searchTerm, statusFilter, roleFilter]);

  const handleNodeSelection = (node: NodeDetail) => {
    setSelectedNode(node);
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    // Close the drawer first by clearing the selected node
    // This ensures consistent state where if selectedNode is null, drawer should be closed
    setSelectedNode(null);
    setIsDrawerOpen(false);
  };

  // Update selectedNode when nodes data changes (for real-time metrics in drawer)
  React.useEffect(() => {
    if (selectedNode && nodes.length > 0) {
      // Find the updated version of the selected node
      const updatedNode = nodes.find(node => node.name === selectedNode.name);
      if (updatedNode) {
        console.log(`🔄 Updating selected node ${updatedNode.name} with fresh metrics: CPU ${updatedNode?.metrics?.cpu?.current?.toFixed(1)}%, Memory ${updatedNode?.metrics?.memory?.current?.toFixed(1)}%`);
        setSelectedNode(updatedNode);
      }
    }
  }, [nodes, selectedNode?.name]); // Only depend on nodes and selected node name

  // Loading state
  if (loading) {
    return (
      <PageSection>
        <Card>
          <CardBody>
            <EmptyState>
              <Spinner size="xl" />
              <Title headingLevel="h4" size="lg">
                Loading Node Data
              </Title>
              <EmptyStateBody>Fetching real-time cluster node information...</EmptyStateBody>
            </EmptyState>
          </CardBody>
        </Card>
      </PageSection>
    );
  }

  // Error state
  if (error) {
    return (
      <PageSection>
        <Alert variant={AlertVariant.danger} title="Connection Error">
          {error}
        </Alert>
      </PageSection>
    );
  }

  // Calculate sticky header height (header + cards + spacing)
  // PageSection padding (24px) + Header (~70px) + Stack gutter (16px) + Cards (152px) + PageSection bottom (16px) + margins (20px)
  const stickyHeaderHeight = 300; // Increased from 260px to properly clear sticky header

  return (
    <>
      {/* Sticky Header Section */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 999,
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #d2d2d2',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <PageSection style={{ paddingBottom: '16px' }}>
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
                      style={{ marginRight: 'var(--pf-v5-global--spacer--sm)', color: '#0066cc' }}
                    />
                    Enhanced Node Dashboard
                  </Title>
                  <span style={{ color: '#6a6e73' }}>
                    Comprehensive visual monitoring of cluster nodes with real-time data
                  </span>
                </FlexItem>
                <FlexItem>
                  <Flex alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 16px',
                          backgroundColor: metricsAvailable ? '#f0f8ff' : '#fff7e6',
                          borderRadius: '4px',
                          border: `1px solid ${metricsAvailable ? '#bee1f4' : '#ffd591'}`,
                        }}
                      >
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: metricsAvailable ? '#3e8635' : '#f0ab00',
                            borderRadius: '50%',
                            marginRight: '8px',
                            animation: 'pulse 2s infinite',
                          }}
                        />
                        <span
                          style={{
                            fontSize: '0.875rem',
                            color: metricsAvailable ? '#0066cc' : '#d2691e',
                            fontWeight: 'bold',
                          }}
                        >
                          {metricsAvailable ? 'Real-time Metrics' : 'Estimated Metrics'}
                        </span>
                      </div>
                    </FlexItem>
                  </Flex>
                </FlexItem>
              </Flex>
            </StackItem>

            {/* Summary Metrics Cards */}
            <StackItem>
              <Grid hasGutter>
                <GridItem span={2}>
                  <Card style={{ minHeight: '120px' }}>
                    <CardBody style={{ textAlign: 'center', padding: '16px' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <ServerIcon style={{ color: '#0066cc', fontSize: '2rem' }} />
                      </div>
                      <Title headingLevel="h2" size="xl" style={{ color: '#0066cc' }}>
                        {nodes.length}
                      </Title>
                      <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>Total Nodes</div>
                    </CardBody>
                  </Card>
                </GridItem>

                <GridItem span={2}>
                  <Card style={{ minHeight: '120px' }}>
                    <CardBody style={{ textAlign: 'center', padding: '16px' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <CheckCircleIcon style={{ color: '#3e8635', fontSize: '2rem' }} />
                      </div>
                      <Title headingLevel="h2" size="xl" style={{ color: '#3e8635' }}>
                        {nodes.filter((n) => n.status === 'Ready').length}
                      </Title>
                      <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>Ready Nodes</div>
                    </CardBody>
                  </Card>
                </GridItem>

                <GridItem span={2}>
                  <Card style={{ minHeight: '120px' }}>
                    <CardBody style={{ textAlign: 'center', padding: '16px' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <CpuIcon style={{ color: '#ff6b35', fontSize: '2rem' }} />
                      </div>
                      <Title headingLevel="h2" size="xl" style={{ color: '#ff6b35' }}>
                        {(() => {
                          const readyNodes = nodes.filter((n) => n.status === 'Ready');
                          if (readyNodes.length === 0) return 'N/A';
                          const avgCpu = readyNodes.reduce((sum, node) => sum + (node.metrics?.cpu?.current || 0), 0) / readyNodes.length;
                          return `${avgCpu.toFixed(1)}%`;
                        })()}
                      </Title>
                      <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>Cluster CPU</div>
                    </CardBody>
                  </Card>
                </GridItem>

                <GridItem span={2}>
                  <Card style={{ minHeight: '120px' }}>
                    <CardBody style={{ textAlign: 'center', padding: '16px' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <MemoryIcon style={{ color: '#7b68ee', fontSize: '2rem' }} />
                      </div>
                      <Title headingLevel="h2" size="xl" style={{ color: '#7b68ee' }}>
                        {(() => {
                          const readyNodes = nodes.filter((n) => n.status === 'Ready');
                          if (readyNodes.length === 0) return 'N/A';
                          const avgMemory = readyNodes.reduce((sum, node) => sum + (node.metrics?.memory?.current || 0), 0) / readyNodes.length;
                          return `${avgMemory.toFixed(1)}%`;
                        })()}
                      </Title>
                      <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>Cluster Memory</div>
                    </CardBody>
                  </Card>
                </GridItem>

                <GridItem span={2}>
                  <Card style={{ minHeight: '120px' }}>
                    <CardBody style={{ textAlign: 'center', padding: '16px' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <CubesIcon style={{ color: '#009639', fontSize: '2rem' }} />
                      </div>
                      <Title headingLevel="h2" size="xl" style={{ color: '#009639' }}>
                        {nodes.reduce((sum, node) => sum + node.pods.length, 0)}
                      </Title>
                      <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>Running Pods</div>
                    </CardBody>
                  </Card>
                </GridItem>

                <GridItem span={2}>
                  <Card style={{ minHeight: '120px' }}>
                    <CardBody style={{ textAlign: 'center', padding: '16px' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <ExclamationTriangleIcon style={{ color: '#f0ab00', fontSize: '2rem' }} />
                      </div>
                      <Title headingLevel="h2" size="xl" style={{ color: '#f0ab00' }}>
                        {
                          nodes.filter((n) => n.cordoned || n.drained || n.status === 'NotReady')
                            .length
                        }
                      </Title>
                      <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>Needs Attention</div>
                    </CardBody>
                  </Card>
                </GridItem>
              </Grid>
            </StackItem>
          </Stack>
        </PageSection>
      </div>

      {/* Main Content Section */}
      <PageSection
        style={{
          paddingTop: '24px',
          minHeight: `calc(100vh - ${stickyHeaderHeight}px)`,
        }}
      >
        <Stack hasGutter>
          {/* Simplified Filtering Controls */}
          <StackItem>
            <Card>
              <CardBody style={{ padding: '16px' }}>
                <Toolbar>
                  <ToolbarContent>
                    <ToolbarItem>
                      <SearchInput
                        placeholder="Search nodes, zones, instance types..."
                        value={searchTerm}
                        onChange={(_event, value) => setSearchTerm(value)}
                        onClear={() => setSearchTerm('')}
                        style={{ width: '300px' }}
                      />
                    </ToolbarItem>
                    <ToolbarItem>
                      <Select
                        isOpen={isStatusDropdownOpen}
                        onOpenChange={setIsStatusDropdownOpen}
                        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                          <MenuToggle
                            ref={toggleRef}
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                            isExpanded={isStatusDropdownOpen}
                          >
                            <FilterIcon style={{ marginRight: '8px' }} />
                            Status:{' '}
                            {statusFilter === 'all'
                              ? 'All'
                              : statusFilter === 'ready'
                              ? 'Ready'
                              : 'Not Ready'}
                          </MenuToggle>
                        )}
                        onSelect={(_event, value) => {
                          setStatusFilter(value as 'all' | 'ready' | 'notready');
                          setIsStatusDropdownOpen(false);
                        }}
                        selected={statusFilter}
                      >
                        <SelectOption value="all">All Status</SelectOption>
                        <SelectOption value="ready">Ready</SelectOption>
                        <SelectOption value="notready">Not Ready</SelectOption>
                      </Select>
                    </ToolbarItem>
                    <ToolbarItem>
                      <Select
                        isOpen={isRoleDropdownOpen}
                        onOpenChange={setIsRoleDropdownOpen}
                        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                          <MenuToggle
                            ref={toggleRef}
                            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                            isExpanded={isRoleDropdownOpen}
                          >
                            <ServerIcon style={{ marginRight: '8px' }} />
                            Role:{' '}
                            {roleFilter === 'all'
                              ? 'All'
                              : roleFilter === 'control'
                              ? 'Control Plane'
                              : 'Worker'}
                          </MenuToggle>
                        )}
                        onSelect={(_event, value) => {
                          setRoleFilter(value as 'all' | 'control' | 'worker');
                          setIsRoleDropdownOpen(false);
                        }}
                        selected={roleFilter}
                      >
                        <SelectOption value="all">All Roles</SelectOption>
                        <SelectOption value="control">Control Plane</SelectOption>
                        <SelectOption value="worker">Worker</SelectOption>
                      </Select>
                    </ToolbarItem>
                    <ToolbarItem>
                      <span style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                        Showing {filteredAndSortedNodes.length} of {nodes.length} nodes
                      </span>
                    </ToolbarItem>
                  </ToolbarContent>
                </Toolbar>
              </CardBody>
            </Card>
          </StackItem>

          {/* Enhanced Node Cards Grid */}
          <StackItem>
            <Grid hasGutter>
              {filteredAndSortedNodes.map((node) => (
                <GridItem key={node.name} span={12} md={6} lg={4}>
                  <EnhancedNodeCard
                    node={node}
                    onClick={handleNodeSelection}
                    isSelected={selectedNode?.name === node.name}
                  />
                </GridItem>
              ))}
            </Grid>
          </StackItem>
        </Stack>
      </PageSection>

      {/* Side Drawer - Fixed Position */}
      <NodeDetailsDrawer node={selectedNode} isOpen={isDrawerOpen} onClose={handleDrawerClose} />
    </>
  );
};

export default NodesDashboard;
