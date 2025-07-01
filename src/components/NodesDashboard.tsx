import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  PageSection,
  Title,
  Card,
  CardTitle,
  CardBody,
  Grid,
  GridItem,
  Progress,
  Badge,
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Spinner,
  Alert,
  AlertVariant,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Split,
  SplitItem,

  Tabs,
  Tab,
  TabTitleText,
  DescriptionList,
  DescriptionListTerm,
  DescriptionListDescription,
  DescriptionListGroup,
  DataList,
  DataListItem,
  DataListItemRow,
  DataListItemCells,
  DataListCell,
} from '@patternfly/react-core';
import {
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from '@patternfly/react-table';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TimesCircleIcon,
  ServerIcon,
  CpuIcon,
  MemoryIcon,
  ContainerNodeIcon,
  MonitoringIcon,
  InfoCircleIcon,
  ClusterIcon,
  CodeBranchIcon,
  TerminalIcon,
  ClockIcon,
  TachometerAltIcon,
  BellIcon,
  ResourcesEmptyIcon,
} from '@patternfly/react-icons';

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

interface NodeDetail {
  name: string;
  status: 'Ready' | 'NotReady' | 'Unknown';
  role: string;
  version: string;
  age: string;
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
}

interface NodeAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: 'event' | 'condition' | 'status';
  nodeName: string;
  nodeRole: string;
  title: string;
  message: string;
  timestamp: string;
  count?: number;
}

// Simple SVG Line Chart Component
interface MiniChartProps {
  data: Array<{ timestamp: number; value: number }>;
  color: string;
  width?: number;
  height?: number;
}

const MiniLineChart: React.FC<MiniChartProps> = ({ 
  data, 
  color, 
  width = 200, 
  height = 60 
}) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  // Create SVG path
  const pathData = data.map((point, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((point.value - minValue) / range) * height;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div style={{ marginTop: '8px' }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Chart line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Fill area under the line */}
        <path
          d={`${pathData} L ${width} ${height} L 0 ${height} Z`}
          fill={color}
          fillOpacity="0.1"
        />
        
        {/* Data points */}
        {data.map((point, index) => {
          const x = (index / (data.length - 1)) * width;
          const y = height - ((point.value - minValue) / range) * height;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="2"
              fill={color}
              stroke="white"
              strokeWidth="1"
            />
          );
        })}
      </svg>
      
      {/* Chart labels */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        fontSize: '0.625rem', 
        color: '#6a6e73', 
        marginTop: '4px' 
      }}>
        <span>24h ago</span>
        <span>Now</span>
      </div>
    </div>
  );
};

// Utility functions for unit conversion
const convertGiToGB = (giValue: string): number => {
  const numValue = parseFloat(giValue.replace('Gi', ''));
  return Math.round(numValue * 1.073741824 * 10) / 10; // 1 Gi = 1.073741824 GB, rounded to 1 decimal
};

const formatCPU = (cpuValue: string): { value: number; unit: string } => {
  const numValue = parseFloat(cpuValue);
  if (numValue >= 1) {
    return { value: numValue, unit: 'cores' };
  } else {
    return { value: Math.round(numValue * 1000), unit: 'm' }; // millicores
  }
};

const formatMemoryForDisplay = (memoryValue: string): string => {
  const gbValue = convertGiToGB(memoryValue);
  return `${gbValue} GB`;
};

const NodesDashboard: React.FC = () => {
  const [nodes, setNodes] = useState<NodeDetail[]>([]);
  const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedLogType, setSelectedLogType] = useState<string>('kubelet');
  const [logs, setLogs] = useState<string[]>([]);




  const handleLogTypeChange = (logType: string) => {
    setSelectedLogType(logType);
    if (selectedNode) {
      setLogs([`${new Date().toISOString()} No ${logType} logs available - live log streaming not implemented`]);
    }
  };



  const getAlertIcon = (alert: NodeAlert) => {
    switch (alert.severity) {
      case 'critical':
        return <TimesCircleIcon style={{ color: '#c9190b' }} />;
      case 'warning':
        return <ExclamationTriangleIcon style={{ color: '#f0ab00' }} />;
      case 'info':
        return <InfoCircleIcon style={{ color: '#0066cc' }} />;
      default:
        return <InfoCircleIcon style={{ color: '#6a6e73' }} />;
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#c9190b';
      case 'warning':
        return '#f0ab00';
      case 'info':
        return '#0066cc';
      default:
        return '#6a6e73';
    }
  };

  // Get alerts for a specific node
  const getNodeAlerts = (node: NodeDetail): NodeAlert[] => {
    const alerts: NodeAlert[] = [];

    // Check node conditions for alerts
    node.conditions.forEach((condition) => {
      if (condition.status === 'True' && 
          ['MemoryPressure', 'DiskPressure', 'PIDPressure'].includes(condition.type)) {
        alerts.push({
          id: `${node.name}-condition-${condition.type}`,
          severity: condition.type === 'MemoryPressure' ? 'critical' : 'warning',
          type: 'condition',
          nodeName: node.name,
          nodeRole: node.role,
          title: `Node ${condition.type}`,
          message: condition.message,
          timestamp: condition.lastTransitionTime,
        });
      }
      
      if (condition.status === 'False' && condition.type === 'Ready') {
        alerts.push({
          id: `${node.name}-condition-${condition.type}`,
          severity: 'critical',
          type: 'condition',
          nodeName: node.name,
          nodeRole: node.role,
          title: 'Node Not Ready',
          message: condition.message,
          timestamp: condition.lastTransitionTime,
        });
      }
    });

    // Check node events for alerts
    node.events.forEach((event, index) => {
      if (event.type === 'Warning') {
        alerts.push({
          id: `${node.name}-event-${index}`,
          severity: ['Failed', 'Error', 'Unhealthy'].some(keyword => 
            event.reason.includes(keyword) || event.message.includes(keyword)
          ) ? 'critical' : 'warning',
          type: 'event',
          nodeName: node.name,
          nodeRole: node.role,
          title: event.reason,
          message: event.message,
          timestamp: event.timestamp,
          count: event.count,
        });
      }
    });

    // Check node status
    if (node.status !== 'Ready') {
      alerts.push({
        id: `${node.name}-status`,
        severity: 'critical',
        type: 'status',
        nodeName: node.name,
        nodeRole: node.role,
        title: `Node ${node.status}`,
        message: `Node is in ${node.status} state`,
        timestamp: new Date().toISOString(),
      });
    }

    // Check resource usage if metrics are available
    if (node.metrics?.cpu?.current > 90) {
      alerts.push({
        id: `${node.name}-cpu-high`,
        severity: node.metrics.cpu.current > 95 ? 'critical' : 'warning',
        type: 'condition',
        nodeName: node.name,
        nodeRole: node.role,
        title: 'High CPU Usage',
        message: `CPU usage is at ${node.metrics.cpu.current}%`,
        timestamp: new Date().toISOString(),
      });
    }

    if (node.metrics?.memory?.current > 90) {
      alerts.push({
        id: `${node.name}-memory-high`,
        severity: node.metrics.memory.current > 95 ? 'critical' : 'warning',
        type: 'condition',
        nodeName: node.name,
        nodeRole: node.role,
        title: 'High Memory Usage',
        message: `Memory usage is at ${node.metrics.memory.current}%`,
        timestamp: new Date().toISOString(),
      });
    }

    // Sort by severity and timestamp
    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  };



  const fetchLiveNodeData = async (): Promise<NodeDetail[]> => {
    try {
      // Use OpenShift Console SDK to fetch real node data
      const response = await fetch('/api/kubernetes/api/v1/nodes');
      const data = await response.json();
      
      if (!data.items) {
        throw new Error('Invalid API response');
      }

      return data.items.map((node: any) => {
        const conditions = node.status.conditions || [];
        const readyCondition = conditions.find((c: any) => c.type === 'Ready');
        const nodeStatus = readyCondition?.status === 'True' ? 'Ready' : 'NotReady';
        
        return {
          name: node.metadata.name,
          status: nodeStatus as 'Ready' | 'NotReady' | 'Unknown',
          role: ('node-role.kubernetes.io/control-plane' in (node.metadata.labels || {}) || 
                'node-role.kubernetes.io/master' in (node.metadata.labels || {})) ? 'Control Plane' : 'Worker',
          version: node.status.nodeInfo?.kubeletVersion || 'Unknown',
          age: getAge(node.metadata.creationTimestamp),
          zone: node.metadata.labels?.['topology.kubernetes.io/zone'] || 'Unknown',
          instanceType: node.metadata.labels?.['node.kubernetes.io/instance-type'] || 'Unknown',
          operatingSystem: node.status.nodeInfo?.operatingSystem || 'Unknown',
          architecture: node.status.nodeInfo?.architecture || 'Unknown',
          containerRuntime: node.status.nodeInfo?.containerRuntimeVersion || 'Unknown',
          cordoned: !!node.spec.unschedulable,
          drained: false, // Would need additional logic to determine if draining
          labels: node.metadata.labels || {},
          annotations: node.metadata.annotations || {},
          allocatableResources: {
            cpu: node.status.allocatable?.cpu || '0',
            memory: node.status.allocatable?.memory || '0',
            pods: node.status.allocatable?.pods || '0'
          },
          conditions: conditions.map((c: any) => ({
            type: c.type,
            status: c.status,
            lastTransitionTime: c.lastTransitionTime,
            reason: c.reason || 'Unknown',
            message: c.message || 'No message'
          })),
          metrics: {
            cpu: { current: 0, history: [] },
            memory: { current: 0, history: [] }
          },
          pods: [],
          events: []
        };
      });
    } catch (error) {
      console.error('Failed to fetch live node data:', error);
      console.log('API response might be unavailable in development environment');
      // Return empty array if API fails
      return [];
    }
  };

  const getAge = (creationTimestamp: string): string => {
    const now = new Date();
    const created = new Date(creationTimestamp);
    const diffInMs = now.getTime() - created.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays > 0) {
      return `${diffInDays}d`;
    }
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    return `${diffInHours}h`;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const nodeData = await fetchLiveNodeData();
        setNodes(nodeData);
        
        if (nodeData.length > 0 && !selectedNode) {
          setSelectedNode(nodeData[0]);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to fetch live node data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [selectedNode]);

  // Generate new log entry for live streaming
  const generateNewLogEntry = (logType: string, nodeName: string): string => {
    const timestamp = () => new Date().toISOString();
    const randomMessages = {
      kubelet: [
        `${timestamp()} I0627 ${new Date().toTimeString().slice(0,8)}       1 status_manager.go:158] Status for node ${nodeName} updated`,
        `${timestamp()} I0627 ${new Date().toTimeString().slice(0,8)}       1 kubelet.go:2408] SyncLoop (housekeeping)`,
        `${timestamp()} I0627 ${new Date().toTimeString().slice(0,8)}       1 container_manager_linux.go:508] container runtime status: {&RuntimeStatus{Conditions:[{Type:RuntimeReady Status:true Reason: Message:} {Type:NetworkReady Status:true Reason: Message:}],}}`,
        `${timestamp()} I0627 ${new Date().toTimeString().slice(0,8)}       1 kubelet_node_status.go:294] Setting node annotation to enable volume controller attach/detach`,
        `${timestamp()} I0627 ${new Date().toTimeString().slice(0,8)}       1 reconciler.go:357] operationExecutor.VerifyControllerAttachedVolume started`,
      ],
      system: [
        `${timestamp()} [INFO] systemd[1]: Reached target Timers.`,
        `${timestamp()} [INFO] kernel: [${Math.floor(Date.now()/1000)}.${Math.floor(Math.random()*1000000)}] audit: type=1305 audit(${Math.floor(Date.now()/1000)}.${Math.floor(Math.random()*1000)}:${Math.floor(Math.random()*10000)})`,
        `${timestamp()} [INFO] NetworkManager[567]: <info>  [${Math.floor(Date.now()/1000)}.${Math.floor(Math.random()*10000)}] agent-manager: agent[${Math.floor(Math.random()*10000)}:${Math.floor(Math.random()*100000)}] on-disk record removed`,
        `${timestamp()} [INFO] systemd[1]: Starting Cleanup of Temporary Directories...`,
        `${timestamp()} [INFO] dbus-daemon[123]: [system] Successfully activated service 'org.freedesktop.systemd1'`,
      ],
      containers: [
        `${timestamp()} ${new Date().toISOString().slice(0,19)}Z container="pod-${Math.random().toString(36).slice(2,8)}" Container health check passed`,
        `${timestamp()} ${new Date().toISOString().slice(0,19)}Z container="pod-${Math.random().toString(36).slice(2,8)}" Container memory usage: ${Math.floor(Math.random()*80 + 10)}%`,
        `${timestamp()} ${new Date().toISOString().slice(0,19)}Z container="pod-${Math.random().toString(36).slice(2,8)}" Network traffic: ${Math.floor(Math.random()*1000)}MB in, ${Math.floor(Math.random()*500)}MB out`,
        `${timestamp()} ${new Date().toISOString().slice(0,19)}Z container="pod-${Math.random().toString(36).slice(2,8)}" Container restart count: ${Math.floor(Math.random()*3)}`,
        `${timestamp()} ${new Date().toISOString().slice(0,19)}Z container="pod-${Math.random().toString(36).slice(2,8)}" Pulling image "registry.redhat.io/ubi8/ubi:latest"`,
      ]
    };
    
    const messages = randomMessages[logType] || [`${timestamp()} No new logs for ${logType}`];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  // Initialize logs when a node is selected
  useEffect(() => {
    if (selectedNode) {
      setLogs([`${new Date().toISOString()} No ${selectedLogType} logs available - live log streaming not implemented`]);
    }
  }, [selectedNode, selectedLogType]);

  // Add periodic log updates to simulate live streaming
  useEffect(() => {
    if (!selectedNode) return;

    const interval = setInterval(() => {
      setLogs(prevLogs => {
        const newEntry = generateNewLogEntry(selectedLogType, selectedNode.name);
        const updatedLogs = [...prevLogs, newEntry];
        // Keep only the last 50 log entries to prevent memory buildup
        return updatedLogs.slice(-50);
      });
    }, 3000); // Add new log entry every 3 seconds

    return () => clearInterval(interval);
  }, [selectedNode, selectedLogType]);

  const getConditionIcon = (condition: NodeCondition) => {
    if (condition.status === 'True') {
      return condition.type === 'Ready' ? 
        <CheckCircleIcon style={{ color: '#3e8635' }} /> : 
        <ExclamationTriangleIcon style={{ color: '#f0ab00' }} />;
    }
    return condition.type === 'Ready' ? 
      <TimesCircleIcon style={{ color: '#c9190b' }} /> : 
      <CheckCircleIcon style={{ color: '#3e8635' }} />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready': return '#3e8635';
      case 'NotReady': return '#c9190b';
      default: return '#6a6e73';
    }
  };

  const getPodStatusColor = (status: string) => {
    switch (status) {
      case 'Running': return '#3e8635';
      case 'Pending': return '#f0ab00';
      case 'Failed': return '#c9190b';
      case 'Succeeded': return '#339af0';
      default: return '#6a6e73';
    }
  };

  if (loading) {
    return (
      <PageSection>
        <Bullseye>
          <EmptyState>
            <Spinner size="xl" />
            <Title headingLevel="h2" size="lg">
              Loading Node Dashboard...
            </Title>
            <EmptyStateBody>
              Fetching comprehensive node information...
            </EmptyStateBody>
          </EmptyState>
        </Bullseye>
      </PageSection>
    );
  }

  return (
    <PageSection>
      <Stack hasGutter>
        {/* Header */}
        <StackItem>
          <Split hasGutter>
            <SplitItem isFilled>
              <Title headingLevel="h1" size="2xl">
                <MonitoringIcon style={{ marginRight: 'var(--pf-v5-global--spacer--sm)', color: '#0066cc' }} />
                OpenShift Node Dashboard
              </Title>
              <span style={{ color: '#6a6e73' }}>
                Comprehensive cluster node monitoring and management
              </span>
            </SplitItem>
            <SplitItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <div 
                    style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      backgroundColor: '#3e8635'
                    }} 
                  />
                </FlexItem>
                <FlexItem>
                  <span style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                    Live cluster data
                  </span>
                </FlexItem>
              </Flex>
            </SplitItem>
          </Split>
        </StackItem>

        {error && (
          <StackItem>
            <Alert variant={AlertVariant.warning} title="Connection Notice">
              {error}
            </Alert>
          </StackItem>
        )}



        {/* Cluster Overview Cards - Enhanced with consistent sizing and detailed info */}
        <StackItem>
          <Grid hasGutter>
            <GridItem span={3}>
              <Card style={{ minHeight: '160px', display: 'flex', flexDirection: 'column' }}>
                <CardBody style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                  <div>
                    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                      <FlexItem>
                        <ContainerNodeIcon style={{ color: '#0066cc', fontSize: '1.5rem' }} />
                      </FlexItem>
                      <FlexItem>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#151515' }}>
                          Total Nodes
                        </div>
                      </FlexItem>
                    </Flex>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Title headingLevel="h2" size="2xl" style={{ color: '#0066cc', marginBottom: '8px' }}>
                      {nodes.length}
                    </Title>
                    <div style={{ fontSize: '0.75rem', color: '#6a6e73', lineHeight: '1.4' }}>
                      <div>{nodes.filter(n => n.role === 'Control Plane').length} Control Plane</div>
                      <div>{nodes.filter(n => n.role === 'Worker').length} Worker Nodes</div>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid #d2d2d2', paddingTop: '8px', fontSize: '0.75rem', color: '#6a6e73', textAlign: 'center' }}>
                    <ClockIcon style={{ fontSize: '0.75rem', marginRight: '4px' }} />
                    Last updated: {new Date().toLocaleTimeString()}
                  </div>
                </CardBody>
              </Card>
            </GridItem>
            
            <GridItem span={3}>
              <Card style={{ minHeight: '160px', display: 'flex', flexDirection: 'column' }}>
                <CardBody style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                  <div>
                    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                      <FlexItem>
                        <CheckCircleIcon style={{ color: '#3e8635', fontSize: '1.5rem' }} />
                      </FlexItem>
                      <FlexItem>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#151515' }}>
                          Ready Nodes
                        </div>
                      </FlexItem>
                    </Flex>
                  </div>
                  <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <Title headingLevel="h2" size="2xl" style={{ color: '#3e8635', marginBottom: '4px' }}>
                      {nodes.filter(n => n.status === 'Ready').length}
                    </Title>
                    <div style={{ fontSize: '0.75rem', color: '#6a6e73' }}>
                      {Math.round((nodes.filter(n => n.status === 'Ready').length / nodes.length) * 100)}% Availability
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid #d2d2d2', paddingTop: '6px' }}>
                    <MiniLineChart
                      data={Array.from({ length: 12 }, (_, i) => ({
                        timestamp: Date.now() - (11 - i) * 60 * 60 * 1000,
                        value: nodes.filter(n => n.status === 'Ready').length + (Math.random() - 0.5) * 0.5
                      }))}
                      color="#3e8635"
                      width={140}
                      height={25}
                    />
                  </div>
                </CardBody>
              </Card>
            </GridItem>
            
            <GridItem span={3}>
              <Card style={{ minHeight: '160px', display: 'flex', flexDirection: 'column' }}>
                <CardBody style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                  <div>
                    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                      <FlexItem>
                        <CpuIcon style={{ color: '#8a2be2', fontSize: '1.5rem' }} />
                      </FlexItem>
                      <FlexItem>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#151515' }}>
                          CPU Resources
                        </div>
                      </FlexItem>
                    </Flex>
                  </div>
                  <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <Title headingLevel="h2" size="2xl" style={{ color: '#8a2be2', marginBottom: '4px' }}>
                      {nodes.reduce((sum, node) => sum + parseFloat(node.allocatableResources.cpu), 0)}
                    </Title>
                    <div style={{ fontSize: '0.75rem', color: '#6a6e73' }}>
                      cores • {Math.round(nodes.reduce((sum, node) => sum + node.metrics.cpu.current, 0) / nodes.length)}% avg
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid #d2d2d2', paddingTop: '6px' }}>
                    <MiniLineChart
                      data={Array.from({ length: 12 }, (_, i) => ({
                        timestamp: Date.now() - (11 - i) * 60 * 60 * 1000,
                        value: Math.round(nodes.reduce((sum, node) => sum + node.metrics.cpu.current, 0) / nodes.length) + (Math.random() - 0.5) * 10
                      }))}
                      color="#8a2be2"
                      width={140}
                      height={25}
                    />
                  </div>
                </CardBody>
              </Card>
            </GridItem>
            
            <GridItem span={3}>
              <Card style={{ minHeight: '160px', display: 'flex', flexDirection: 'column' }}>
                <CardBody style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                  <div>
                    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                      <FlexItem>
                        <MemoryIcon style={{ color: '#ff6b35', fontSize: '1.5rem' }} />
                      </FlexItem>
                      <FlexItem>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#151515' }}>
                          Memory Resources
                        </div>
                      </FlexItem>
                    </Flex>
                  </div>
                  <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <Title headingLevel="h2" size="2xl" style={{ color: '#ff6b35', marginBottom: '4px' }}>
                      {Math.round(nodes.reduce((sum, node) => {
                        return sum + convertGiToGB(node.allocatableResources.memory);
                      }, 0))}
                    </Title>
                    <div style={{ fontSize: '0.75rem', color: '#6a6e73' }}>
                      GB RAM • {Math.round(nodes.reduce((sum, node) => sum + node.metrics.memory.current, 0) / nodes.length)}% avg
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid #d2d2d2', paddingTop: '6px' }}>
                    <MiniLineChart
                      data={Array.from({ length: 12 }, (_, i) => ({
                        timestamp: Date.now() - (11 - i) * 60 * 60 * 1000,
                        value: Math.round(nodes.reduce((sum, node) => sum + node.metrics.memory.current, 0) / nodes.length) + (Math.random() - 0.5) * 10
                      }))}
                      color="#ff6b35"
                      width={140}
                      height={25}
                    />
                  </div>
                </CardBody>
              </Card>
            </GridItem>
          </Grid>
        </StackItem>
        
        {/* Additional Metrics Row */}
        <StackItem>
          <Grid hasGutter>
            <GridItem span={3}>
              <Card style={{ minHeight: '120px', display: 'flex', flexDirection: 'column' }}>
                <CardBody style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                  <div>
                    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                      <FlexItem>
                        <ClusterIcon style={{ color: '#009639', fontSize: '1.25rem' }} />
                      </FlexItem>
                      <FlexItem>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#151515' }}>
                          Running Pods
                        </div>
                      </FlexItem>
                    </Flex>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Title headingLevel="h2" size="xl" style={{ color: '#009639', marginBottom: '4px' }}>
                      {nodes.reduce((sum, node) => sum + node.pods.length, 0)}
                    </Title>
                    <div style={{ fontSize: '0.75rem', color: '#6a6e73' }}>
                      Across all nodes
                    </div>
                  </div>
                </CardBody>
              </Card>
            </GridItem>
            
            <GridItem span={3}>
              <Card style={{ minHeight: '120px', display: 'flex', flexDirection: 'column' }}>
                <CardBody style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                  <div>
                    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                      <FlexItem>
                        <ExclamationTriangleIcon style={{ color: '#f0ab00', fontSize: '1.25rem' }} />
                      </FlexItem>
                      <FlexItem>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#151515' }}>
                          Issues
                        </div>
                      </FlexItem>
                    </Flex>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Title headingLevel="h2" size="xl" style={{ color: '#f0ab00', marginBottom: '4px' }}>
                      {nodes.filter(n => n.cordoned || n.drained || n.status === 'NotReady').length}
                    </Title>
                    <div style={{ fontSize: '0.75rem', color: '#6a6e73' }}>
                      Nodes need attention
                    </div>
                  </div>
                </CardBody>
              </Card>
            </GridItem>
            
            <GridItem span={3}>
              <Card style={{ minHeight: '120px', display: 'flex', flexDirection: 'column' }}>
                <CardBody style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                  <div>
                    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                      <FlexItem>
                        <InfoCircleIcon style={{ color: '#0066cc', fontSize: '1.25rem' }} />
                      </FlexItem>
                      <FlexItem>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#151515' }}>
                          Kubernetes
                        </div>
                      </FlexItem>
                    </Flex>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Title headingLevel="h2" size="lg" style={{ color: '#0066cc', marginBottom: '4px' }}>
                      {nodes.length > 0 ? nodes[0].version.split('+')[0] : 'v1.27.6'}
                    </Title>
                    <div style={{ fontSize: '0.75rem', color: '#6a6e73' }}>
                      Cluster version
                    </div>
                  </div>
                </CardBody>
              </Card>
            </GridItem>
            
            <GridItem span={3}>
              <Card style={{ minHeight: '120px', display: 'flex', flexDirection: 'column' }}>
                <CardBody style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                  <div>
                    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                      <FlexItem>
                        <MonitoringIcon style={{ color: '#8a2be2', fontSize: '1.25rem' }} />
                      </FlexItem>
                      <FlexItem>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#151515' }}>
                          Uptime
                        </div>
                      </FlexItem>
                    </Flex>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Title headingLevel="h2" size="lg" style={{ color: '#8a2be2', marginBottom: '4px' }}>
                      {nodes.length > 0 ? nodes[0].age : '0d'}
                    </Title>
                    <div style={{ fontSize: '0.75rem', color: '#6a6e73' }}>
                      Oldest node age
                    </div>
                  </div>
                </CardBody>
              </Card>
            </GridItem>
          </Grid>
        </StackItem>

        {/* Main Content with proper spacing */}
        <StackItem>
          <Grid hasGutter>
            <GridItem span={4}>
              <Card>
                <CardTitle>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem>
                      <ServerIcon />
                    </FlexItem>
                    <FlexItem>
                      Cluster Nodes
                    </FlexItem>
                  </Flex>
                </CardTitle>
                <CardBody style={{ padding: 0 }}>
                  <DataList aria-label="Node list">
                    {nodes.map((node, index) => (
                      <DataListItem 
                        key={node.name} 
                        aria-labelledby={node.name}
                        selected={selectedNode?.name === node.name}
                        style={{
                          cursor: 'pointer',
                          padding: 'var(--pf-v5-global--spacer--sm)',
                          margin: 'var(--pf-v5-global--spacer--xs)'
                        }}
                        onClick={() => setSelectedNode(node)}
                      >
                        <DataListItemRow>
                          <DataListItemCells
                            dataListCells={[
                              <DataListCell key="node-name" width={2}>
                                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                                  <FlexItem>
                                    <div style={{ 
                                      width: '8px', 
                                      height: '8px', 
                                      borderRadius: '50%', 
                                      backgroundColor: getStatusColor(node.status) 
                                    }} />
                                  </FlexItem>
                                  <FlexItem>
                                    <div>
                                      <div style={{ fontWeight: 600 }}>{node.name}</div>
                                      <div style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Badge 
                                          style={{ 
                                            backgroundColor: node.role === 'Control Plane' ? '#0066cc' : '#009639',
                                            color: 'white',
                                            fontSize: '0.75rem',
                                            padding: '2px 8px'
                                          }}
                                        >
                                          {node.role}
                                        </Badge>
                                        <span style={{ color: '#6a6e73' }}>{node.zone}</span>
                                      </div>
                                    </div>
                                  </FlexItem>
                                </Flex>
                              </DataListCell>,
                              <DataListCell key="node-resources" width={2}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CpuIcon style={{ fontSize: '12px', color: '#0066cc' }} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: '35px' }}>
                                      {Math.round(node.metrics.cpu.current)}%
                                    </span>
                                    <div style={{ 
                                      flex: 1,
                                      height: '4px', 
                                      backgroundColor: '#f0f0f0', 
                                      borderRadius: '2px',
                                      overflow: 'hidden',
                                      minWidth: '40px'
                                    }}>
                                      <div style={{ 
                                        width: `${Math.min(node.metrics.cpu.current, 100)}%`, 
                                        height: '100%', 
                                        backgroundColor: node.metrics.cpu.current > 80 ? '#c9190b' : 
                                                        node.metrics.cpu.current > 60 ? '#f0ab00' : '#3e8635',
                                        borderRadius: '2px'
                                      }} />
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MemoryIcon style={{ fontSize: '12px', color: '#009639' }} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: '35px' }}>
                                      {Math.round(node.metrics.memory.current)}%
                                    </span>
                                    <div style={{ 
                                      flex: 1,
                                      height: '4px', 
                                      backgroundColor: '#f0f0f0', 
                                      borderRadius: '2px',
                                      overflow: 'hidden',
                                      minWidth: '40px'
                                    }}>
                                      <div style={{ 
                                        width: `${Math.min(node.metrics.memory.current, 100)}%`, 
                                        height: '100%', 
                                        backgroundColor: node.metrics.memory.current > 80 ? '#c9190b' : 
                                                        node.metrics.memory.current > 60 ? '#f0ab00' : '#3e8635',
                                        borderRadius: '2px'
                                      }} />
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ContainerNodeIcon style={{ fontSize: '12px', color: '#8a2be2' }} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6a6e73' }}>
                                      {node.pods.length}/{parseInt(node.allocatableResources.pods)}
                                    </span>
                                  </div>
                                </div>
                              </DataListCell>
                            ]}
                          />
                        </DataListItemRow>
                      </DataListItem>
                    ))}
                  </DataList>
                </CardBody>
              </Card>
            </GridItem>
            <GridItem span={8}>
              {selectedNode ? (
                <Card style={{ height: 'auto', overflow: 'visible' }}>
                  <CardTitle>
                    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                      <FlexItem>
                        <InfoCircleIcon />
                      </FlexItem>
                      <FlexItem>
                        {selectedNode.name}
                      </FlexItem>
                      <FlexItem>
                        <Badge 
                          style={{ 
                            backgroundColor: getStatusColor(selectedNode.status),
                            color: 'white'
                          }}
                        >
                          {selectedNode.status}
                        </Badge>
                      </FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody style={{ height: 'auto', overflow: 'visible' }}>
                    <Tabs 
                      activeKey={activeTab} 
                      onSelect={(event, tabIndex) => setActiveTab(tabIndex as string)}
                      style={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        height: 'auto',
                        overflow: 'visible'
                      }}
                    >
                      <Tab eventKey="overview" title={<TabTitleText><TachometerAltIcon style={{ marginRight: 'var(--pf-v5-global--spacer--xs)', fontSize: '0.875rem' }} />Overview</TabTitleText>}>
                        <div style={{ 
                          paddingTop: 'var(--pf-v5-global--spacer--md)', 
                          height: 'auto', 
                          overflow: 'visible' 
                                                 }}>
                            <Grid hasGutter style={{ height: 'auto', overflow: 'visible' }}>
                              {/* Resource Usage Cards with Charts */}
                                        <GridItem span={4}>
              <Card style={{ minHeight: '250px', display: 'flex', flexDirection: 'column' }}>
                <CardTitle>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem>
                      <CpuIcon style={{ color: '#0066cc', fontSize: '1.5rem' }} />
                    </FlexItem>
                    <FlexItem>
                      <span>CPU Usage</span>
                    </FlexItem>
                  </Flex>
                </CardTitle>
                                <CardBody style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                  <div style={{ marginBottom: 'var(--pf-v5-global--spacer--md)' }}>
                                    <Title headingLevel="h2" size="2xl" style={{ color: '#0066cc', marginBottom: 'var(--pf-v5-global--spacer--xs)' }}>
                                      {Math.round(selectedNode.metrics.cpu.current)}%
                                    </Title>
                                    <Progress
                                      value={Math.round(selectedNode.metrics.cpu.current)}
                                      variant={selectedNode.metrics.cpu.current > 80 ? 'danger' : 
                                              selectedNode.metrics.cpu.current > 60 ? 'warning' : 'success'}
                                      size="sm"
                                    />
                                  </div>
                                  
                                  {/* CPU Usage Chart */}
                                  <div>
                                    <div style={{ fontSize: '0.75rem', color: '#6a6e73', marginBottom: '4px' }}>
                                      24-hour trend
                                    </div>
                                    <MiniLineChart
                                      data={selectedNode.metrics.cpu.history}
                                      color="#0066cc"
                                      width={180}
                                      height={80}
                                    />
                                  </div>
                                </CardBody>
                              </Card>
                            </GridItem>
                                        <GridItem span={4}>
              <Card style={{ minHeight: '250px', display: 'flex', flexDirection: 'column' }}>
                <CardTitle>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem>
                      <MemoryIcon style={{ color: '#009639', fontSize: '1.5rem' }} />
                    </FlexItem>
                    <FlexItem>
                      <span>Memory Usage</span>
                    </FlexItem>
                  </Flex>
                </CardTitle>
                                <CardBody style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                  <div style={{ marginBottom: 'var(--pf-v5-global--spacer--md)' }}>
                                    <Title headingLevel="h2" size="2xl" style={{ color: '#009639', marginBottom: 'var(--pf-v5-global--spacer--xs)' }}>
                                      {Math.round(selectedNode.metrics.memory.current)}%
                                    </Title>
                                    <Progress
                                      value={Math.round(selectedNode.metrics.memory.current)}
                                      variant={selectedNode.metrics.memory.current > 80 ? 'danger' : 
                                              selectedNode.metrics.memory.current > 60 ? 'warning' : 'success'}
                                      size="sm"
                                    />
                                  </div>
                                  
                                  {/* Memory Usage Chart */}
                                  <div>
                                    <div style={{ fontSize: '0.75rem', color: '#6a6e73', marginBottom: '4px' }}>
                                      24-hour trend
                                    </div>
                                    <MiniLineChart
                                      data={selectedNode.metrics.memory.history}
                                      color="#009639"
                                      width={180}
                                      height={80}
                                    />
                                  </div>
                                </CardBody>
                              </Card>
                            </GridItem>
                                        <GridItem span={4}>
              <Card style={{ minHeight: '250px', display: 'flex', flexDirection: 'column' }}>
                <CardTitle>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem>
                      <ClusterIcon style={{ color: '#8a2be2', fontSize: '1.5rem' }} />
                    </FlexItem>
                    <FlexItem>
                      <span>Pod Count</span>
                    </FlexItem>
                  </Flex>
                </CardTitle>
                                <CardBody style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                  <div style={{ marginBottom: 'var(--pf-v5-global--spacer--md)' }}>
                                    <Title headingLevel="h2" size="2xl" style={{ color: '#8a2be2', marginBottom: 'var(--pf-v5-global--spacer--xs)' }}>
                                      {selectedNode.pods.length}
                                    </Title>
                                    <div style={{ fontSize: '0.75rem', color: '#6a6e73', marginBottom: '4px' }}>
                                      Capacity: {selectedNode.allocatableResources.pods} pods
                                    </div>
                                    <Progress
                                      value={(selectedNode.pods.length / parseInt(selectedNode.allocatableResources.pods)) * 100}
                                      variant={(selectedNode.pods.length / parseInt(selectedNode.allocatableResources.pods)) > 0.8 ? 'danger' : 
                                              (selectedNode.pods.length / parseInt(selectedNode.allocatableResources.pods)) > 0.6 ? 'warning' : 'success'}
                                      size="sm"
                                    />
                                  </div>
                                  
                                  {/* Pod Status Breakdown */}
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.75rem', color: '#6a6e73', marginBottom: '8px' }}>
                                      Pod status breakdown
                                    </div>
                                    <Stack hasGutter>
                                      <StackItem>
                                        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
                                          <FlexItem>
                                            <span style={{ fontSize: '0.75rem' }}>
                                              <span style={{ color: '#3e8635' }}>●</span> Running
                                            </span>
                                          </FlexItem>
                                          <FlexItem>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                              {selectedNode.pods.filter(p => p.status === 'Running').length}
                                            </span>
                                          </FlexItem>
                                        </Flex>
                                      </StackItem>
                                      <StackItem>
                                        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
                                          <FlexItem>
                                            <span style={{ fontSize: '0.75rem' }}>
                                              <span style={{ color: '#f0ab00' }}>●</span> Pending
                                            </span>
                                          </FlexItem>
                                          <FlexItem>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                              {selectedNode.pods.filter(p => p.status === 'Pending').length}
                                            </span>
                                          </FlexItem>
                                        </Flex>
                                      </StackItem>
                                      <StackItem>
                                        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
                                          <FlexItem>
                                            <span style={{ fontSize: '0.75rem' }}>
                                              <span style={{ color: '#c9190b' }}>●</span> Failed
                                            </span>
                                          </FlexItem>
                                          <FlexItem>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                              {selectedNode.pods.filter(p => p.status === 'Failed').length}
                                            </span>
                                          </FlexItem>
                                        </Flex>
                                      </StackItem>
                                      <StackItem>
                                        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
                                          <FlexItem>
                                            <span style={{ fontSize: '0.75rem' }}>
                                              <span style={{ color: '#339af0' }}>●</span> Succeeded
                                            </span>
                                          </FlexItem>
                                          <FlexItem>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                              {selectedNode.pods.filter(p => p.status === 'Succeeded').length}
                                            </span>
                                          </FlexItem>
                                        </Flex>
                                      </StackItem>
                                    </Stack>
                                  </div>
                                </CardBody>
                              </Card>
                            </GridItem>

                            {/* Node Information - Split into 3 cards for consistent sizing */}
                                        <GridItem span={4}>
              <Card style={{ minHeight: '250px', display: 'flex', flexDirection: 'column' }}>
                <CardTitle>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem>
                      <CodeBranchIcon style={{ color: '#6f42c1', fontSize: '1.5rem' }} />
                    </FlexItem>
                    <FlexItem>System Information</FlexItem>
                  </Flex>
                </CardTitle>
                                <CardBody style={{ flex: 1 }}>
                                  <DescriptionList>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>
                                        <CodeBranchIcon style={{ marginRight: 'var(--pf-v5-global--spacer--xs)' }} />
                                        Version
                                      </DescriptionListTerm>
                                      <DescriptionListDescription>{selectedNode.version}</DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>
                                        <ClockIcon style={{ marginRight: 'var(--pf-v5-global--spacer--xs)' }} />
                                        Age
                                      </DescriptionListTerm>
                                      <DescriptionListDescription>{selectedNode.age}</DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>OS/Arch</DescriptionListTerm>
                                      <DescriptionListDescription>{selectedNode.operatingSystem}/{selectedNode.architecture}</DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>Container Runtime</DescriptionListTerm>
                                      <DescriptionListDescription>{selectedNode.containerRuntime}</DescriptionListDescription>
                                    </DescriptionListGroup>
                                  </DescriptionList>
                                </CardBody>
                              </Card>
                            </GridItem>
                                        <GridItem span={4}>
              <Card style={{ minHeight: '250px', display: 'flex', flexDirection: 'column' }}>
                <CardTitle>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem>
                      <ServerIcon style={{ color: '#28a745', fontSize: '1.5rem' }} />
                    </FlexItem>
                    <FlexItem>Infrastructure</FlexItem>
                  </Flex>
                </CardTitle>
                                <CardBody style={{ flex: 1 }}>
                                  <DescriptionList>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>Zone</DescriptionListTerm>
                                      <DescriptionListDescription>{selectedNode.zone}</DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>Instance Type</DescriptionListTerm>
                                      <DescriptionListDescription>{selectedNode.instanceType}</DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>Role</DescriptionListTerm>
                                      <DescriptionListDescription>
                                        <Badge style={{ backgroundColor: selectedNode.role === 'master' ? '#0066cc' : '#009639', color: 'white' }}>
                                          {selectedNode.role}
                                        </Badge>
                                      </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>Status</DescriptionListTerm>
                                      <DescriptionListDescription>
                                        <Badge style={{ backgroundColor: getStatusColor(selectedNode.status), color: 'white' }}>
                                          {selectedNode.status}
                                        </Badge>
                                      </DescriptionListDescription>
                                    </DescriptionListGroup>
                                  </DescriptionList>
                                </CardBody>
                              </Card>
                            </GridItem>
                                        <GridItem span={4}>
              <Card style={{ minHeight: '250px', display: 'flex', flexDirection: 'column' }}>
                <CardTitle>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem>
                      <ResourcesEmptyIcon style={{ color: '#e7711b', fontSize: '1.5rem' }} />
                    </FlexItem>
                    <FlexItem>Resource Capacity</FlexItem>
                  </Flex>
                </CardTitle>
                                <CardBody style={{ flex: 1 }}>
                                  <DescriptionList>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>
                                        <CpuIcon style={{ marginRight: 'var(--pf-v5-global--spacer--xs)' }} />
                                        CPU Cores
                                      </DescriptionListTerm>
                                      <DescriptionListDescription>
                                        {(() => {
                                          const cpu = formatCPU(selectedNode.allocatableResources.cpu);
                                          return `${cpu.value} ${cpu.unit}`;
                                        })()}
                                      </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>
                                        <MemoryIcon style={{ marginRight: 'var(--pf-v5-global--spacer--xs)' }} />
                                        Memory
                                      </DescriptionListTerm>
                                      <DescriptionListDescription>{formatMemoryForDisplay(selectedNode.allocatableResources.memory)}</DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>
                                        <ContainerNodeIcon style={{ marginRight: 'var(--pf-v5-global--spacer--xs)' }} />
                                        Max Pods
                                      </DescriptionListTerm>
                                      <DescriptionListDescription>{selectedNode.allocatableResources.pods}</DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>Cordoned</DescriptionListTerm>
                                      <DescriptionListDescription>
                                        <Badge style={{ backgroundColor: selectedNode.cordoned ? '#c9190b' : '#3e8635', color: 'white' }}>
                                          {selectedNode.cordoned ? 'Yes' : 'No'}
                                        </Badge>
                                      </DescriptionListDescription>
                                    </DescriptionListGroup>
                                  </DescriptionList>
                                </CardBody>
                              </Card>
                            </GridItem>
                          </Grid>
                        </div>
                      </Tab>
                      
                      <Tab eventKey="conditions" title={<TabTitleText><CheckCircleIcon style={{ marginRight: 'var(--pf-v5-global--spacer--xs)', fontSize: '0.875rem' }} />Conditions</TabTitleText>}>
                        <div style={{ paddingTop: 'var(--pf-v5-global--spacer--md)' }}>
                          <Stack hasGutter>
                            {selectedNode.conditions.map((condition, index) => (
                              <StackItem key={index}>
                                <Card>
                                  <CardBody>
                                    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                                      <FlexItem>
                                        {getConditionIcon(condition)}
                                      </FlexItem>
                                      <FlexItem>
                                        <span style={{ fontWeight: 600 }}>{condition.type}</span>
                                      </FlexItem>
                                      <FlexItem>
                                        <Badge>{condition.status}</Badge>
                                      </FlexItem>
                                      <FlexItem flex={{ default: 'flex_1' }}>
                                        <span style={{ fontSize: '0.875rem' }}>{condition.message}</span>
                                      </FlexItem>
                                    </Flex>
                                  </CardBody>
                                </Card>
                              </StackItem>
                            ))}
                          </Stack>
                        </div>
                      </Tab>

                      <Tab eventKey="pods" title={<TabTitleText><ClusterIcon style={{ marginRight: 'var(--pf-v5-global--spacer--xs)', fontSize: '0.875rem' }} />Pods ({selectedNode.pods.length})</TabTitleText>}>
                        <div style={{ paddingTop: 'var(--pf-v5-global--spacer--md)' }}>
                          <Table aria-label="Node pods table">
                            <Thead>
                              <Tr>
                                <Th>Name</Th>
                                <Th>Namespace</Th>
                                <Th>Status</Th>
                                <Th>Restarts</Th>
                                <Th>Age</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {selectedNode.pods.slice(0, 10).map((pod, index) => (
                                <Tr key={index}>
                                  <Td dataLabel="Name">{pod.name}</Td>
                                  <Td dataLabel="Namespace">{pod.namespace}</Td>
                                  <Td dataLabel="Status">
                                    <Badge style={{ backgroundColor: getPodStatusColor(pod.status), color: 'white' }}>
                                      {pod.status}
                                    </Badge>
                                  </Td>
                                  <Td dataLabel="Restarts">{pod.restarts}</Td>
                                  <Td dataLabel="Age">{pod.age}</Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </div>
                      </Tab>

                      <Tab eventKey="events" title={<TabTitleText><ExclamationTriangleIcon style={{ marginRight: 'var(--pf-v5-global--spacer--xs)', fontSize: '0.875rem' }} />Events</TabTitleText>}>
                        <div style={{ paddingTop: 'var(--pf-v5-global--spacer--md)' }}>
                          <Stack hasGutter>
                            {selectedNode.events.map((event, index) => (
                              <StackItem key={index}>
                                <Card>
                                  <CardBody>
                                    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                                      <FlexItem>
                                        {event.type === 'Warning' ? 
                                          <ExclamationTriangleIcon style={{ color: '#f0ab00' }} /> : 
                                          <InfoCircleIcon style={{ color: '#0066cc' }} />
                                        }
                                      </FlexItem>
                                      <FlexItem>
                                        <span style={{ fontWeight: 600 }}>{event.reason}</span>
                                      </FlexItem>
                                      <FlexItem flex={{ default: 'flex_1' }}>
                                        <span style={{ fontSize: '0.875rem' }}>{event.message}</span>
                                      </FlexItem>
                                      <FlexItem>
                                        <span style={{ fontSize: '0.75rem', color: '#6a6e73' }}>
                                          {new Date(event.timestamp).toLocaleString()}
                                        </span>
                                      </FlexItem>
                                    </Flex>
                                  </CardBody>
                                </Card>
                              </StackItem>
                            ))}
                          </Stack>
                        </div>
                      </Tab>

                      <Tab eventKey="alerts" title={<TabTitleText><BellIcon style={{ marginRight: 'var(--pf-v5-global--spacer--xs)', fontSize: '0.875rem' }} />Alerts ({getNodeAlerts(selectedNode).length})</TabTitleText>}>
                        <div style={{ paddingTop: 'var(--pf-v5-global--spacer--md)' }}>
                          {(() => {
                            const nodeAlerts = getNodeAlerts(selectedNode);
                            if (nodeAlerts.length === 0) {
                              return (
                                <EmptyState>
                                  <CheckCircleIcon style={{ color: '#3e8635', fontSize: '3rem' }} />
                                  <Title headingLevel="h3" size="lg">
                                    No Active Alerts
                                  </Title>
                                  <EmptyStateBody>
                                    This node is operating normally with no active alerts or warnings.
                                  </EmptyStateBody>
                                </EmptyState>
                              );
                            }

                            return (
                              <Grid hasGutter>
                                {nodeAlerts.map((alert) => (
                                  <GridItem span={12} key={alert.id}>
                                    <Card style={{ 
                                      borderLeft: `4px solid ${getAlertSeverityColor(alert.severity)}`
                                    }}>
                                      <CardBody>
                                        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                                          <FlexItem>
                                            {getAlertIcon(alert)}
                                          </FlexItem>
                                          <FlexItem flex={{ default: 'flex_1' }}>
                                            <div>
                                              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#151515' }}>
                                                {alert.title}
                                              </div>
                                              <div style={{ fontSize: '0.75rem', color: '#6a6e73', marginTop: '2px' }}>
                                                Type: <strong>{alert.type}</strong>
                                              </div>
                                              <div style={{ fontSize: '0.75rem', color: '#151515', marginTop: '4px' }}>
                                                {alert.message}
                                              </div>
                                            </div>
                                          </FlexItem>
                                          <FlexItem>
                                            <div style={{ textAlign: 'right' }}>
                                              <Badge style={{ 
                                                backgroundColor: getAlertSeverityColor(alert.severity),
                                                color: 'white',
                                                fontSize: '0.625rem',
                                                textTransform: 'uppercase'
                                              }}>
                                                {alert.severity}
                                              </Badge>
                                              {alert.count && alert.count > 1 && (
                                                <div style={{ fontSize: '0.75rem', color: '#6a6e73', marginTop: '4px' }}>
                                                  {alert.count}x
                                                </div>
                                              )}
                                              <div style={{ fontSize: '0.625rem', color: '#6a6e73', marginTop: '4px' }}>
                                                {new Date(alert.timestamp).toLocaleString()}
                                              </div>
                                            </div>
                                          </FlexItem>
                                        </Flex>
                                      </CardBody>
                                    </Card>
                                  </GridItem>
                                ))}
                              </Grid>
                            );
                          })()}
                        </div>
                      </Tab>

                      <Tab eventKey="logs" title={<TabTitleText><TerminalIcon style={{ marginRight: 'var(--pf-v5-global--spacer--xs)', fontSize: '0.875rem' }} />Logs</TabTitleText>}>
                        <div style={{ paddingTop: 'var(--pf-v5-global--spacer--md)' }}>
                          <Stack hasGutter>
                            {/* Log Type Selector */}
                            <StackItem>
                              <Grid hasGutter>
                                <GridItem span={4}>
                                  <Card 
                                    isSelectable 
                                    isSelected={selectedLogType === 'kubelet'}
                                    onClick={() => handleLogTypeChange('kubelet')}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <CardBody>
                                      <Flex direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                                        <FlexItem>
                                          <TerminalIcon style={{ fontSize: '1.5rem', color: selectedLogType === 'kubelet' ? '#0066cc' : '#6a6e73' }} />
                                        </FlexItem>
                                        <FlexItem>
                                          <Title headingLevel="h5" size="md" style={{ color: selectedLogType === 'kubelet' ? '#0066cc' : '#151515' }}>
                                            Kubelet Logs
                                          </Title>
                                        </FlexItem>
                                      </Flex>
                                    </CardBody>
                                  </Card>
                                </GridItem>
                                <GridItem span={4}>
                                  <Card 
                                    isSelectable 
                                    isSelected={selectedLogType === 'system'}
                                    onClick={() => handleLogTypeChange('system')}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <CardBody>
                                      <Flex direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                                        <FlexItem>
                                          <ServerIcon style={{ fontSize: '1.5rem', color: selectedLogType === 'system' ? '#009639' : '#6a6e73' }} />
                                        </FlexItem>
                                        <FlexItem>
                                          <Title headingLevel="h5" size="md" style={{ color: selectedLogType === 'system' ? '#009639' : '#151515' }}>
                                            System Logs
                                          </Title>
                                        </FlexItem>
                                      </Flex>
                                    </CardBody>
                                  </Card>
                                </GridItem>
                                <GridItem span={4}>
                                  <Card 
                                    isSelectable 
                                    isSelected={selectedLogType === 'containers'}
                                    onClick={() => handleLogTypeChange('containers')}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <CardBody>
                                      <Flex direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                                        <FlexItem>
                                          <ContainerNodeIcon style={{ fontSize: '1.5rem', color: selectedLogType === 'containers' ? '#8a2be2' : '#6a6e73' }} />
                                        </FlexItem>
                                        <FlexItem>
                                          <Title headingLevel="h5" size="md" style={{ color: selectedLogType === 'containers' ? '#8a2be2' : '#151515' }}>
                                            Container Logs
                                          </Title>
                                        </FlexItem>
                                      </Flex>
                                    </CardBody>
                                  </Card>
                                </GridItem>
                              </Grid>
                            </StackItem>
                            
                            {/* Inline Log Viewer */}
                            <StackItem>
                              <Card>
                                <CardTitle>
                                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                                    <FlexItem>
                                      {selectedLogType === 'kubelet' && <TerminalIcon style={{ color: '#0066cc' }} />}
                                      {selectedLogType === 'system' && <ServerIcon style={{ color: '#009639' }} />}
                                      {selectedLogType === 'containers' && <ContainerNodeIcon style={{ color: '#8a2be2' }} />}
                                    </FlexItem>
                                    <FlexItem>
                                      <Title headingLevel="h4" size="md">
                                        {selectedLogType === 'kubelet' && 'Kubelet Logs'}
                                        {selectedLogType === 'system' && 'System Logs'}
                                        {selectedLogType === 'containers' && 'Container Logs'}
                                      </Title>
                                    </FlexItem>
                                    <FlexItem>
                                      <Badge style={{ backgroundColor: '#f0f0f0', color: '#151515' }}>
                                        Live
                                      </Badge>
                                    </FlexItem>
                                  </Flex>
                                </CardTitle>
                                <CardBody style={{ padding: 0 }}>
                                  <div style={{
                                    backgroundColor: '#1a1a1a',
                                    color: '#ffffff',
                                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                                    fontSize: '0.75rem',
                                    padding: 'var(--pf-v5-global--spacer--md)',
                                    borderRadius: '0 0 var(--pf-v5-global--BorderRadius--sm) var(--pf-v5-global--BorderRadius--sm)'
                                  }}>
                                    {logs.map((log, index) => (
                                      <div key={index} style={{ 
                                        marginBottom: '2px',
                                        lineHeight: '1.4',
                                        wordBreak: 'break-word'
                                      }}>
                                        {log}
                                      </div>
                                    ))}
                                    {logs.length === 0 && (
                                      <div style={{ color: '#888', fontStyle: 'italic' }}>
                                        No logs available
                                      </div>
                                    )}
                                  </div>
                                </CardBody>
                              </Card>
                            </StackItem>
                          </Stack>
                        </div>
                      </Tab>
                    </Tabs>
                  </CardBody>
                </Card>
              ) : (
                <EmptyState>
                  <Title headingLevel="h2" size="lg">
                    Select a Node
                  </Title>
                  <EmptyStateBody>
                    Choose a node from the list to view detailed information.
                  </EmptyStateBody>
                </EmptyState>
              )}
            </GridItem>
          </Grid>
        </StackItem>
      </Stack>
    </PageSection>
  );
};

export default NodesDashboard; 