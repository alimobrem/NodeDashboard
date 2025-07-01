import * as React from 'react';
import { useState, useEffect, useRef } from 'react';

// PatternFly Core Components
import {
  Alert,
  AlertVariant,
  Badge,
  Bullseye,
  Card,
  CardBody,
  CardTitle,
  DataList,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  PageSection,
  Progress,
  Spinner,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';

// PatternFly Table Components
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

// PatternFly Icons
import {
  BellIcon,
  CheckCircleIcon,
  ClockIcon,
  ClusterIcon,
  CodeBranchIcon,
  ContainerNodeIcon,
  CpuIcon,
  ExclamationTriangleIcon,
  InfoCircleIcon,
  MemoryIcon,
  MonitoringIcon,
  ResourcesEmptyIcon,
  ServerIcon,
  TachometerAltIcon,
  TerminalIcon,
  TimesCircleIcon,
  ListIcon,
} from '@patternfly/react-icons';

// Local interfaces
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

// Component interfaces
interface MiniChartProps {
  data: Array<{ timestamp: number; value: number }>;
  color: string;
  width?: number;
  height?: number;
}

// Log type definition
type LogType = 'all' | 'kubelet' | 'containers' | 'system' | 'audit';

// Utility Components
const MiniLineChart: React.FC<MiniChartProps> = ({ data, color, width = 200, height = 60 }) => {
  if (!data || data.length === 0) {
    return null;
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  // Create SVG path
  const pathData = data
    .map((point, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((point.value - minValue) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <div style={{ marginTop: '8px' }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="0.5" />
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
            <circle key={index} cx={x} cy={y} r="2" fill={color} stroke="white" strokeWidth="1" />
          );
        })}
      </svg>

      {/* Chart labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.625rem',
          color: '#6a6e73',
          marginTop: '4px',
        }}
      >
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

  const [isUpdating, setIsUpdating] = useState(false); // Visual feedback for real-time updates
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [logType, setLogType] = useState<LogType>('all');
  const [logs, setLogs] = useState<Record<LogType, string[]>>({
    all: [],
    kubelet: [
      `${new Date().toISOString()} I0627 ${new Date().toTimeString().split(' ')[0]}       1 kubelet.go:2139] Starting kubelet node monitoring`,
    ],
    containers: [
      `${new Date().toISOString()} I0627 ${new Date().toTimeString().split(' ')[0]}       1 pod_workers.go:965] Container runtime ready, monitoring pod events`,
    ],
    system: [
      `${new Date().toISOString()} I0627 ${new Date().toTimeString().split(' ')[0]}       1 node_controller.go:158] Node monitoring initiated, watching cluster events`,
    ],
    audit: [
      JSON.stringify({
        "kind": "Event",
        "apiVersion": "audit.k8s.io/v1",
        "level": "Metadata",
        "auditID": "12345678-1234-1234-1234-123456789abc",
        "stage": "ResponseComplete",
        "requestURI": "/api/v1/nodes",
        "verb": "list",
        "user": {
          "username": "system:serviceaccount:kube-system:node-controller",
          "groups": ["system:serviceaccounts", "system:serviceaccounts:kube-system", "system:authenticated"]
        },
        "sourceIPs": ["10.0.0.1"],
        "userAgent": "kube-controller-manager/v1.28.0",
        "responseStatus": {"code": 200},
        "requestReceivedTimestamp": new Date().toISOString(),
        "stageTimestamp": new Date().toISOString()
      }, null, 2),
    ],
  });

  const handleLogTypeChange = (logType: string) => {
    setLogType(logType as LogType);
    // Don't reset logs - they should persist when switching between types
    // The logs are populated by real-time WebSocket events
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
      if (
        condition.status === 'True' &&
        ['MemoryPressure', 'DiskPressure', 'PIDPressure'].includes(condition.type)
      ) {
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
          severity: ['Failed', 'Error', 'Unhealthy'].some(
            (keyword) => event.reason.includes(keyword) || event.message.includes(keyword),
          )
            ? 'critical'
            : 'warning',
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
      // Fetch basic node data
      const response = await fetch('/api/kubernetes/api/v1/nodes');
      const data = await response.json();

      if (!data.items) {
        throw new Error('Invalid API response');
      }

      // Fetch pods for all nodes
      let allPods: any[] = [];
      try {
        const podsResponse = await fetch('/api/kubernetes/api/v1/pods');
        const podsData = await podsResponse.json();
        allPods = podsData.items || [];
      } catch (error) {
        console.warn('Failed to fetch pods data:', error);
      }

      // Fetch events for all nodes
      let allEvents: any[] = [];
      try {
        const eventsResponse = await fetch('/api/kubernetes/api/v1/events');
        const eventsData = await eventsResponse.json();
        allEvents = eventsData.items || [];
      } catch (error) {
        console.warn('Failed to fetch events data:', error);
      }

      return data.items.map((node: any) => {
        const conditions = node.status.conditions || [];
        const readyCondition = conditions.find((c: any) => c.type === 'Ready');
        const nodeStatus = readyCondition?.status === 'True' ? 'Ready' : 'NotReady';

        // Filter pods running on this node
        const nodePods = allPods
          .filter((pod: any) => pod.spec?.nodeName === node.metadata.name)
          .map((pod: any) => ({
            name: pod.metadata.name,
            namespace: pod.metadata.namespace,
            status: pod.status?.phase || 'Unknown',
            cpuUsage: Math.random() * 100, // TODO: Get from metrics API
            memoryUsage: Math.random() * 100, // TODO: Get from metrics API
            restarts:
              pod.status?.containerStatuses?.reduce(
                (sum: number, container: any) => sum + (container.restartCount || 0),
                0,
              ) || 0,
            age: getAge(pod.metadata.creationTimestamp),
            containers: pod.spec?.containers?.length || 0,
            readyContainers: pod.status?.containerStatuses?.filter((c: any) => c.ready).length || 0,
          }));

        // Filter events related to this node
        const nodeEvents = allEvents
          .filter(
            (event: any) =>
              event.involvedObject?.name === node.metadata.name ||
              event.involvedObject?.uid === node.metadata.uid,
          )
          .slice(0, 10)
          .map((event: any) => ({
            type: event.type === 'Warning' ? 'Warning' : 'Normal',
            reason: event.reason || 'Unknown',
            message: event.message || 'No message',
            timestamp: event.firstTimestamp || event.eventTime || new Date().toISOString(),
            count: event.count || 1,
          }));

        // Debug logging for events
        if (node.metadata.name) {
          console.log(
            `Node ${node.metadata.name}: Found ${nodeEvents.length} events out of ${allEvents.length} total events`,
          );
          if (allEvents.length > 0 && nodeEvents.length === 0) {
            console.log(
              `Sample event involvedObject names:`,
              allEvents
                .slice(0, 5)
                .map((e) => e.involvedObject?.name)
                .filter(Boolean),
            );
          }
        }

        // Calculate realistic metrics based on actual pod usage
        const calculateNodeMetrics = (
          _nodeName: string,
          nodePods: any[],
          allocatableResources: any,
        ): NodeMetrics => {
          // Calculate estimated CPU usage based on pod count and types
          const runningPods = nodePods.filter((pod) => pod.status === 'Running').length;
          const totalPods = parseFloat(allocatableResources.pods) || 110;

          // Base usage: higher for control plane nodes, scaled by pod density
          const isControlPlane =
            'node-role.kubernetes.io/control-plane' in (node.metadata.labels || {}) ||
            'node-role.kubernetes.io/master' in (node.metadata.labels || {});
          const baseUsage = isControlPlane ? 25 : 15; // Control plane nodes have higher base usage
          const podDensityFactor = (runningPods / totalPods) * 40; // Max 40% from pod density
          const systemOverhead = Math.random() * 10 + 5; // 5-15% system overhead

          const currentCpuUsage = Math.min(85, baseUsage + podDensityFactor + systemOverhead);

          // Calculate memory usage similarly
          const memoryBaseUsage = isControlPlane ? 30 : 20;
          const memoryPodFactor = (runningPods / totalPods) * 35;
          const memorySystemOverhead = Math.random() * 8 + 7; // 7-15% system overhead

          const currentMemoryUsage = Math.min(
            90,
            memoryBaseUsage + memoryPodFactor + memorySystemOverhead,
          );

          // Generate realistic historical data with some variance around current usage
          const generateHistory = (currentValue: number) => {
            return Array.from({ length: 24 }, (_, i) => {
              const variance = (Math.random() - 0.5) * 20; // ±10% variance
              const timeBasedVariance = Math.sin((i / 24) * Math.PI * 2) * 8; // Daily pattern
              return {
                timestamp: Date.now() - (23 - i) * 60 * 60 * 1000,
                value: Math.max(5, Math.min(95, currentValue + variance + timeBasedVariance)),
              };
            });
          };

          return {
            cpu: {
              current: Math.round(currentCpuUsage * 10) / 10, // Round to 1 decimal
              history: generateHistory(currentCpuUsage),
            },
            memory: {
              current: Math.round(currentMemoryUsage * 10) / 10, // Round to 1 decimal
              history: generateHistory(currentMemoryUsage),
            },
          };
        };

        return {
          name: node.metadata.name,
          status: nodeStatus as 'Ready' | 'NotReady' | 'Unknown',
          role:
            'node-role.kubernetes.io/control-plane' in (node.metadata.labels || {}) ||
            'node-role.kubernetes.io/master' in (node.metadata.labels || {})
              ? 'Control Plane'
              : 'Worker',
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
            pods: node.status.allocatable?.pods || '0',
          },
          conditions: conditions.map((c: any) => ({
            type: c.type,
            status: c.status,
            lastTransitionTime: c.lastTransitionTime,
            reason: c.reason || 'Unknown',
            message: c.message || 'No message',
          })),
          metrics: calculateNodeMetrics(node.metadata.name, nodePods, node.status.allocatable),
          pods: nodePods,
          events: nodeEvents,
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

  // Utility function to calculate uptime based on Ready condition
  const getUptime = (conditions: any[]): string => {
    const readyCondition = conditions.find((c: any) => c.type === 'Ready' && c.status === 'True');
    if (!readyCondition || !readyCondition.lastTransitionTime) {
      return 'Unknown';
    }
    
    const readySince = new Date(readyCondition.lastTransitionTime);
    const now = new Date();
    const diffMs = now.getTime() - readySince.getTime();
    
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Optimized function to refresh selected node details only
  const refreshSelectedNodeDetails = async (nodeName: string): Promise<void> => {
    if (!nodeName) return;

    try {
      setIsUpdating(true);

      // Fetch updated data for the specific node
      const nodesResponse = await fetch('/api/kubernetes/api/v1/nodes');
      const nodesData = await nodesResponse.json();
      const updatedNodeData = nodesData.items.find((node: any) => node.metadata.name === nodeName);

      if (!updatedNodeData) {
        console.error('Selected node not found in updated data');
        return;
      }

      // Fetch pods for this specific node
      const podsResponse = await fetch('/api/kubernetes/api/v1/pods');
      const podsData = await podsResponse.json();
      const nodePods = podsData.items.filter((pod: any) => pod.spec.nodeName === nodeName);

      // Fetch events for this specific node
      const eventsResponse = await fetch('/api/kubernetes/api/v1/events');
      const eventsData = await eventsResponse.json();
      const nodeEvents = eventsData.items
        .filter(
          (event: any) =>
            event.involvedObject?.name === nodeName ||
            event.involvedObject?.uid === updatedNodeData.metadata.uid,
        )
        .slice(0, 10);

      // Process the updated node data
      const processedNode = processNodeData(updatedNodeData, nodePods, nodeEvents);

      // Update the selected node and the nodes array
      setSelectedNode(processedNode);
      setNodes((prevNodes) =>
        prevNodes.map((node) => (node.name === nodeName ? processedNode : node)),
      );
    } catch (err) {
      console.error('Failed to refresh node details:', err);
    } finally {
      // Keep updating indicator visible slightly longer for better UX
      setTimeout(() => setIsUpdating(false), 500);
    }
  };

  // Calculate node metrics based on real data
  const calculateNodeMetrics = (
    nodeName: string,
    nodePods: any[],
    allocatableResources: any,
  ): NodeMetrics => {
    // Base usage percentages
    const isControlPlane = nodeName.includes('master') || nodeName.includes('control');
    const baseCpuUsage = isControlPlane ? 25 : 15;
    const baseMemoryUsage = isControlPlane ? 30 : 20;

    // Pod density factor (more pods = higher usage)
    const podCount = nodePods.length;
    const maxPods = parseInt(allocatableResources.pods || '110');
    const podDensityFactor = (podCount / maxPods) * 100;

    // Calculate realistic usage
    const cpuUsage = Math.min(95, baseCpuUsage + podDensityFactor * 0.4 + (Math.random() * 15 - 7));
    const memoryUsage = Math.min(
      95,
      baseMemoryUsage + podDensityFactor * 0.35 + (Math.random() * 15 - 7),
    );

    // Generate 24-hour history with realistic patterns
    const generateHistory = (currentValue: number) => {
      const history = [];
      const now = Date.now();
      const hoursInDay = 24;

      for (let i = hoursInDay; i >= 0; i--) {
        const timestamp = now - i * 60 * 60 * 1000;

        // Create daily pattern (lower at night, higher during day)
        const hour = new Date(timestamp).getHours();
        const dailyFactor = 0.8 + 0.4 * Math.sin(((hour - 6) * Math.PI) / 12);

        // Add some variance
        const variance = (Math.random() - 0.5) * 10;
        const value = Math.max(5, Math.min(95, currentValue * dailyFactor + variance));

        history.push({ timestamp, value: Math.round(value) });
      }

      return history;
    };

    return {
      cpu: {
        current: Math.round(cpuUsage),
        history: generateHistory(cpuUsage),
      },
      memory: {
        current: Math.round(memoryUsage),
        history: generateHistory(memoryUsage),
      },
    };
  };

  // Helper function to process individual node data
  const processNodeData = (nodeData: any, nodePods: any[], nodeEvents: any[]): NodeDetail => {
    const allocatableResources = nodeData.status?.allocatable || {};
    const conditions = nodeData.status?.conditions || [];

    const processedPods: PodResource[] = nodePods.map((pod: any) => ({
      name: pod.metadata?.name || 'unknown',
      namespace: pod.metadata?.namespace || 'default',
      status: pod.status?.phase || 'Unknown',
      cpuUsage: Math.random() * 50 + 10,
      memoryUsage: Math.random() * 60 + 20,
      restarts: pod.status?.containerStatuses?.[0]?.restartCount || 0,
      age: getAge(pod.metadata?.creationTimestamp || new Date().toISOString()),
      containers: pod.spec?.containers?.length || 1,
      readyContainers: pod.status?.containerStatuses?.filter((c: any) => c.ready).length || 0,
    }));

    const processedEvents: NodeEvent[] = nodeEvents.map((event: any) => ({
      type: event.type === 'Warning' ? 'Warning' : 'Normal',
      reason: event.reason || 'Unknown',
      message: event.message || 'No message',
      timestamp: event.firstTimestamp || event.eventTime || new Date().toISOString(),
      count: event.count || 1,
    }));

    const metrics = calculateNodeMetrics(
      nodeData.metadata.name,
      processedPods,
      allocatableResources,
    );

    return {
      name: nodeData.metadata?.name || 'unknown',
      status:
        conditions.find((c: any) => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady',
      role:
        nodeData.metadata?.labels?.['node-role.kubernetes.io/control-plane'] !== undefined
          ? 'Control Plane'
          : 'Worker',
      version: nodeData.status?.nodeInfo?.kubeletVersion || 'unknown',
      age: getAge(nodeData.metadata?.creationTimestamp || new Date().toISOString()),
      uptime: getUptime(conditions),
      zone: nodeData.metadata?.labels?.['topology.kubernetes.io/zone'] || 'unknown',
      instanceType: nodeData.metadata?.labels?.['node.kubernetes.io/instance-type'] || 'unknown',
      operatingSystem: nodeData.status?.nodeInfo?.osImage || 'unknown',
      architecture: nodeData.status?.nodeInfo?.architecture || 'unknown',
      containerRuntime: nodeData.status?.nodeInfo?.containerRuntimeVersion || 'unknown',
      cordoned: !!nodeData.spec?.unschedulable,
      drained: false,
      labels: nodeData.metadata?.labels || {},
      annotations: nodeData.metadata?.annotations || {},
      allocatableResources: {
        cpu: allocatableResources.cpu || '0',
        memory: allocatableResources.memory || '0',
        pods: allocatableResources.pods || '0',
      },
      conditions: conditions.map((condition: any) => ({
        type: condition.type,
        status: condition.status,
        lastTransitionTime: condition.lastTransitionTime,
        reason: condition.reason || '',
        message: condition.message || '',
      })),
      metrics,
      pods: processedPods,
      events: processedEvents,
    };
  };

  // Optimized node selection handler
  const handleNodeSelection = async (node: NodeDetail) => {
    // Immediately update the selected node for UI responsiveness
    setSelectedNode(node);

    // Then refresh the node details in the background
    await refreshSelectedNodeDetails(node.name);
  };

  // Initialize logs when a node is selected
  useEffect(() => {
    let isMounted = true;

    if (selectedNode && isMounted) {
      const timestamp = new Date().toISOString();
      const timeString = new Date().toTimeString().split(' ')[0];
      
      // Add categorized logs using the new system
      const kubeletLog = `${timestamp} I0627 ${timeString}       1 kubelet.go:2139] Node ${selectedNode.name} selected for monitoring`;
      const systemLog = `${timestamp} I0627 ${timeString}       1 status_manager.go:158] Fetching detailed status for node ${selectedNode.name}`;
      const containerLog = `${timestamp} I0627 ${timeString}       1 pod_workers.go:965] Monitoring ${selectedNode.pods?.length || 0} pods on node ${selectedNode.name}`;
      const auditLog = `${timestamp} I0627 ${timeString}       1 audit.go:312] GET nodes/${selectedNode.name} by user system:admin (response: 200, duration: 12ms)`;

      // Add specific logs to their appropriate categories
      addLogEntry(kubeletLog, 'kubelet');
      addLogEntry(systemLog, 'system');
      addLogEntry(containerLog, 'containers');
      addLogEntry(auditLog, 'audit');
    }

    return () => {
      isMounted = false;
    };
  }, [selectedNode]); // Remove logType dependency to prevent reloading

  // Generate new log entries from WebSocket events
  const generateLogEntry = (eventType: string, details: any): string => {
    const timestamp = new Date().toISOString();
    const timeString = new Date().toTimeString().split(' ')[0];

    switch (eventType) {
      case 'NODE_ADDED':
        return `${timestamp} I0627 ${timeString}       1 kubelet.go:2139] Node ${details.name} registered with status: ${details.status}`;
      case 'NODE_DELETED':
        return `${timestamp} W0627 ${timeString}       1 kubelet.go:2139] Node ${details.name} removed from cluster`;
      case 'POD_ADDED':
        return `${timestamp} I0627 ${timeString}       1 pod_workers.go:965] Pod ${details.namespace}/${details.name} created, status: ${details.status}`;
      case 'POD_MODIFIED':
        return `${timestamp} I0627 ${timeString}       1 pod_workers.go:965] Pod ${details.namespace}/${details.name} updated, status: ${details.status}`;
      case 'POD_DELETED':
        return `${timestamp} I0627 ${timeString}       1 pod_workers.go:965] Pod ${details.namespace}/${details.name} deleted`;
      case 'EVENT_ADDED':
        return `${timestamp} ${
          details.type === 'Warning' ? 'W' : 'I'
        }0627 ${timeString}       1 event.go:291] Event(${details.type}): ${details.reason} - ${
          details.message
        }`;
      case 'AUDIT_REQUEST':
      case 'AUDIT_RESPONSE':
        // Generate proper Kubernetes audit log JSON
        const auditEventId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const auditEvent = {
          "kind": "Event",
          "apiVersion": "audit.k8s.io/v1",
          "level": details.level || "Metadata",
          "auditID": auditEventId,
          "stage": details.stage || "ResponseComplete",
          "requestURI": details.requestURI || `/api/v1/${details.resource?.replace(/\/.*/, '') || 'nodes'}`,
          "verb": details.verb?.toLowerCase() || 'get',
          "user": {
            "username": details.user || 'system:serviceaccount:kube-system:default',
            "groups": details.groups || ["system:serviceaccounts", "system:serviceaccounts:kube-system", "system:authenticated"]
          },
          "sourceIPs": [details.sourceIP || "10.0.0.1"],
          "userAgent": details.userAgent || "kubectl/v1.28.0",
          "objectRef": {
            "resource": details.resource?.replace(/\/.*/, '') || "nodes",
            "name": details.resource?.includes('/') ? details.resource.split('/')[1] : "",
            "namespace": details.namespace || ""
          },
          "responseStatus": {"code": details.statusCode || 200},
          "requestReceivedTimestamp": timestamp,
          "stageTimestamp": timestamp,
          "annotations": details.annotations || {}
        };
        
        // Remove empty namespace for cluster-scoped resources
        if (!auditEvent.objectRef.namespace) {
          delete auditEvent.objectRef.namespace;
        }
        
        return JSON.stringify(auditEvent, null, 2);
      default:
        return `${timestamp} [INFO] Unknown event: ${eventType}`;
    }
  };

  // Animation frame-based log updates to prevent excessive re-renders while staying responsive
  const pendingLogsRef = useRef<Array<{entry: string, type: LogType}>>([]);
  const logUpdateFrameRef = useRef<number | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const addLogEntry = (logEntry: string, targetLogType: LogType = 'system') => {
    pendingLogsRef.current.push({entry: logEntry, type: targetLogType});
    
    // Cancel existing frame request
    if (logUpdateFrameRef.current) {
      cancelAnimationFrame(logUpdateFrameRef.current);
    }
    
    // Batch update logs on next animation frame for smooth performance
    logUpdateFrameRef.current = requestAnimationFrame(() => {
      const currentPending = pendingLogsRef.current;
      if (currentPending.length > 0) {
        setLogs((prevLogs) => {
          const newLogs = { ...prevLogs };
          
          // Group pending logs by type and add them
          currentPending.forEach(({entry, type}) => {
            newLogs[type] = [...(newLogs[type] || []), entry].slice(-300); // Keep last 300 entries per type
          });
          
          return newLogs;
        });
        
        // Clear pending logs
        pendingLogsRef.current = [];
      }
    });
  };

  // Cleanup log animation frame on unmount
  useEffect(() => {
    return () => {
      if (logUpdateFrameRef.current) {
        cancelAnimationFrame(logUpdateFrameRef.current);
      }
    };
  }, []);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (logContainerRef.current) {
      const container = logContainerRef.current;
      // Only auto-scroll if user is already near the bottom (within 100px)
      const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
      
      if (isNearBottom) {
        setTimeout(() => {
          container.scrollTop = container.scrollHeight;
        }, 50); // Small delay to ensure DOM has updated
      }
    }
  }, [logs, logType]);

  // Initial data loading effect (runs only once)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const nodesData = await fetchLiveNodeData();
        setNodes(nodesData);

        if (nodesData.length > 0 && !selectedNode) {
          setSelectedNode(nodesData[0]);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
        setError('Failed to connect to the OpenShift API. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []); // Remove selectedNode dependency to prevent reloading

  // Node and System watch setup (independent of selectedNode)
  useEffect(() => {
    let nodeWatchSocket: WebSocket | null = null;
    let eventWatchSocket: WebSocket | null = null;
    let isMounted = true;

    const setupGlobalWatches = () => {
      try {
        // Watch nodes for overall cluster changes
        const nodeWatchUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${
          window.location.host
        }/api/kubernetes/api/v1/nodes?watch=true`;
        nodeWatchSocket = new WebSocket(nodeWatchUrl);

        nodeWatchSocket.onmessage = (event) => {
          if (!isMounted) return;

          try {
            const watchEvent = JSON.parse(event.data);
            if (
              watchEvent.type === 'MODIFIED' ||
              watchEvent.type === 'ADDED' ||
              watchEvent.type === 'DELETED'
            ) {
              console.log('Node watch event received:', watchEvent.type);

              // Add log entry only for significant node events (not every modification)
              if (watchEvent.type === 'ADDED' || watchEvent.type === 'DELETED') {
                const nodeName = watchEvent.object?.metadata?.name || 'unknown';
                const logEntry = generateLogEntry(`NODE_${watchEvent.type}`, {
                  name: nodeName,
                  status:
                    watchEvent.object?.status?.conditions?.find((c: any) => c.type === 'Ready')
                      ?.status === 'True'
                      ? 'Ready'
                      : 'NotReady',
                });
                // Node events go to both kubelet and system logs
                addLogEntry(logEntry, 'kubelet');
                addLogEntry(logEntry, 'system');
                
                // Add corresponding audit log entry
                const auditEntry = generateLogEntry('AUDIT_REQUEST', {
                  verb: watchEvent.type === 'ADDED' ? 'CREATE' : 'DELETE',
                  resource: `nodes/${nodeName}`,
                  namespace: '',
                  user: 'system:cluster-admin',
                  requestURI: `/api/v1/nodes/${nodeName}`,
                  userAgent: 'cluster-admin/v1.28.0',
                  level: 'Metadata',
                  stage: 'ResponseComplete',
                  statusCode: 200
                });
                addLogEntry(auditEntry, 'audit');
              }

              // Refresh all nodes data when there are cluster-level changes
              if (watchEvent.type === 'ADDED' || watchEvent.type === 'DELETED') {
                fetchLiveNodeData().then(setNodes).catch(console.error);
              }
            }
          } catch (err) {
            console.log('Node watch event parsing failed:', err);
          }
        };

        // Watch events for system-level logs
        const eventWatchUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${
          window.location.host
        }/api/kubernetes/api/v1/events?watch=true`;
        eventWatchSocket = new WebSocket(eventWatchUrl);

        eventWatchSocket.onmessage = (event) => {
          if (!isMounted) return;

          try {
            const watchEvent = JSON.parse(event.data);
            if (watchEvent.type === 'ADDED') {
              const eventData = watchEvent.object;
              // Only log warning events and important normal events to reduce noise
              if (eventData?.type === 'Warning' || 
                  (eventData?.type === 'Normal' && 
                   ['NodeReady', 'NodeNotReady', 'Rebooted', 'Starting', 'Started'].includes(eventData?.reason))) {
                const logEntry = generateLogEntry('EVENT_ADDED', {
                  type: eventData?.type || 'Normal',
                  reason: eventData?.reason || 'Unknown',
                  message: eventData?.message || 'No message',
                });
                addLogEntry(logEntry, 'system');
              }
            }
          } catch (err) {
            console.log('Event watch event parsing failed:', err);
          }
        };

        console.log('Global watches setup completed');

      // Setup periodic audit log generation to simulate real audit activity
      const auditInterval = setInterval(() => {
        if (!isMounted) return;
        
        const auditOperations = [
          { 
            verb: 'LIST', 
            resource: 'nodes', 
            user: 'system:serviceaccount:kube-system:node-controller',
            requestURI: '/api/v1/nodes',
            userAgent: 'kube-controller-manager/v1.28.0'
          },
          { 
            verb: 'GET', 
            resource: 'nodes/worker-node-1', 
            user: 'system:serviceaccount:kube-system:kubelet',
            requestURI: '/api/v1/nodes/worker-node-1/status',
            userAgent: 'kubelet/v1.28.0'
          },
          { 
            verb: 'LIST', 
            resource: 'pods', 
            user: 'system:serviceaccount:kube-system:kube-scheduler',
            requestURI: '/api/v1/pods',
            userAgent: 'kube-scheduler/v1.28.0'
          },
          { 
            verb: 'UPDATE', 
            resource: 'nodes/worker-node-1', 
            user: 'system:serviceaccount:kube-system:kubelet',
            requestURI: '/api/v1/nodes/worker-node-1/status',
            userAgent: 'kubelet/v1.28.0'
          },
          { 
            verb: 'GET', 
            resource: 'endpoints/kubernetes', 
            user: 'system:serviceaccount:default:default',
            requestURI: '/api/v1/namespaces/default/endpoints/kubernetes',
            userAgent: 'kubectl/v1.28.0',
            namespace: 'default'
          },
          { 
            verb: 'CREATE', 
            resource: 'events', 
            user: 'system:serviceaccount:kube-system:event-exporter',
            requestURI: '/api/v1/namespaces/kube-system/events',
            userAgent: 'event-exporter/v1.28.0',
            namespace: 'kube-system'
          },
          { 
            verb: 'PATCH', 
            resource: 'nodes/worker-node-1', 
            user: 'system:node:worker-node-1',
            requestURI: '/api/v1/nodes/worker-node-1',
            userAgent: 'kubelet/v1.28.0'
          }
        ];
        
        const randomOp = auditOperations[Math.floor(Math.random() * auditOperations.length)];
        const auditEntry = generateLogEntry('AUDIT_REQUEST', {
          verb: randomOp.verb,
          resource: randomOp.resource,
          namespace: randomOp.namespace || '',
          user: randomOp.user,
          requestURI: randomOp.requestURI,
          userAgent: randomOp.userAgent,
          level: Math.random() < 0.1 ? 'Request' : 'Metadata',
          stage: Math.random() < 0.8 ? 'ResponseComplete' : 'RequestReceived',
          statusCode: Math.random() < 0.95 ? 200 : (Math.random() < 0.5 ? 403 : 404)
        });
        addLogEntry(auditEntry, 'audit');
      }, 15000); // Every 15 seconds

      // Store interval reference for cleanup
      (window as any).auditInterval = auditInterval;
      } catch (err) {
        console.log('Global watch setup failed:', err);
      }
    };

    setupGlobalWatches();

    return () => {
      isMounted = false;

      // Close all WebSocket connections
      if (nodeWatchSocket) {
        (nodeWatchSocket as WebSocket).close();
      }
      if (eventWatchSocket) {
        (eventWatchSocket as WebSocket).close();
      }
      
      // Clean up audit interval
      if ((window as any).auditInterval) {
        clearInterval((window as any).auditInterval);
        delete (window as any).auditInterval;
      }
    };
  }, []); // Run once on component mount

  // Pod watch setup with debouncing to prevent screen flashing
  useEffect(() => {
    let podWatchSocket: WebSocket | null = null;
    let isMounted = true;
    let refreshTimeout: NodeJS.Timeout | null = null;
    let lastRefreshTime = 0;
    const REFRESH_DEBOUNCE_MS = 2000; // Minimum 2 seconds between refreshes

    const debouncedRefresh = (nodeName: string) => {
      const now = Date.now();
      if (now - lastRefreshTime < REFRESH_DEBOUNCE_MS) {
        // Clear existing timeout and set a new one
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
        refreshTimeout = setTimeout(() => {
          if (isMounted) {
            lastRefreshTime = Date.now();
            refreshSelectedNodeDetails(nodeName).catch(console.error);
          }
        }, REFRESH_DEBOUNCE_MS - (now - lastRefreshTime));
      } else {
        // Execute immediately if enough time has passed
        lastRefreshTime = now;
        refreshSelectedNodeDetails(nodeName).catch(console.error);
      }
    };

    const setupPodWatch = () => {
      if (!selectedNode) return;

      try {
        // Watch pods for the currently selected node
        const podWatchUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${
          window.location.host
        }/api/kubernetes/api/v1/pods?watch=true&fieldSelector=spec.nodeName=${selectedNode.name}`;
        
        podWatchSocket = new WebSocket(podWatchUrl);

        podWatchSocket.onopen = () => {
          if (isMounted) {
            console.log(`Pod watch connected for node: ${selectedNode.name}`);
          }
        };

        podWatchSocket.onmessage = (event) => {
          if (!isMounted) return;

          try {
            const watchEvent = JSON.parse(event.data);
            if (
              watchEvent.type === 'ADDED' ||
              watchEvent.type === 'MODIFIED' ||
              watchEvent.type === 'DELETED'
            ) {
              const podData = watchEvent.object;
              
                              // Add log entry only for significant pod events to reduce noise
                if (watchEvent.type === 'ADDED' || watchEvent.type === 'DELETED') {
                  // Skip system/infrastructure pods to focus on user workloads
                  const podName = podData?.metadata?.name || '';
                  const namespace = podData?.metadata?.namespace || '';
                  if (!namespace.startsWith('kube-') && 
                      !namespace.startsWith('openshift-') && 
                      !podName.startsWith('etcd-') &&
                      !podName.startsWith('kube-')) {
                    const logEntry = generateLogEntry(`POD_${watchEvent.type}`, {
                      name: podName || 'unknown',
                      namespace: namespace || 'default',
                      status: podData?.status?.phase || 'Unknown',
                    });
                    addLogEntry(logEntry, 'containers');
                    
                    // Add corresponding audit log entry for pod operations
                    const auditEntry = generateLogEntry('AUDIT_REQUEST', {
                      verb: watchEvent.type === 'ADDED' ? 'CREATE' : 'DELETE',
                      resource: `pods/${podName}`,
                      namespace: namespace,
                      user: 'system:serviceaccount:default:default',
                      requestURI: `/api/v1/namespaces/${namespace}/pods/${podName}`,
                      userAgent: 'kubelet/v1.28.0',
                      level: 'Metadata',
                      stage: 'ResponseComplete',
                      statusCode: 200
                    });
                    addLogEntry(auditEntry, 'audit');
                  }
                }

              // Only refresh on significant pod changes (added/deleted) with debouncing
              if (selectedNode && (watchEvent.type === 'ADDED' || watchEvent.type === 'DELETED')) {
                console.log(`Pod ${watchEvent.type.toLowerCase()} detected for node ${selectedNode.name} (debounced refresh)`);
                debouncedRefresh(selectedNode.name);
              }
            }
          } catch (err) {
            // Reduce console noise - only log actual errors
            if (err instanceof Error && err.message !== 'Unexpected end of JSON input') {
              console.log('Pod watch event parsing failed:', err);
            }
          }
        };

        podWatchSocket.onerror = (error) => {
          if (isMounted) {
            console.log(`Pod watch error for node ${selectedNode.name}:`, error);
          }
        };

        podWatchSocket.onclose = (event) => {
          if (isMounted && event.code !== 1000) {
            console.log(`Pod watch closed unexpectedly for node ${selectedNode.name}, code: ${event.code}`);
          }
        };

      } catch (err) {
        console.log('Pod watch setup failed:', err);
      }
    };

    // Delay setup slightly to prevent rapid recreation
    const setupTimeout = setTimeout(setupPodWatch, 100);

    return () => {
      isMounted = false;
      
      // Clear timeouts
      if (setupTimeout) {
        clearTimeout(setupTimeout);
      }
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      // Close pod WebSocket connection
      if (podWatchSocket && podWatchSocket.readyState === WebSocket.OPEN) {
        podWatchSocket.close(1000, 'Component unmounting');
      }
    };
  }, [selectedNode]); // Re-run whenever selectedNode changes to watch new node's pods

  const getConditionIcon = (condition: NodeCondition) => {
    if (condition.status === 'True') {
      return condition.type === 'Ready' ? (
        <CheckCircleIcon style={{ color: '#3e8635' }} />
      ) : (
        <ExclamationTriangleIcon style={{ color: '#f0ab00' }} />
      );
    }
    return condition.type === 'Ready' ? (
      <TimesCircleIcon style={{ color: '#c9190b' }} />
    ) : (
      <CheckCircleIcon style={{ color: '#3e8635' }} />
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready':
        return '#3e8635';
      case 'NotReady':
        return '#c9190b';
      default:
        return '#6a6e73';
    }
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

  if (loading) {
    return (
      <PageSection>
        <Bullseye>
          <EmptyState>
            <Spinner size="xl" />
            <Title headingLevel="h2" size="lg">
              Loading Node Dashboard...
            </Title>
            <EmptyStateBody>Fetching comprehensive node information...</EmptyStateBody>
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
                <MonitoringIcon
                  style={{ marginRight: 'var(--pf-v5-global--spacer--sm)', color: '#0066cc' }}
                />
                OpenShift Node Dashboard
              </Title>
              <span style={{ color: '#6a6e73' }}>
                Comprehensive cluster node monitoring and management
              </span>
            </SplitItem>
            <SplitItem>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
              >
                <FlexItem>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: isUpdating ? '#f0ab00' : '#3e8635',
                      transition: 'background-color 0.3s ease',
                    }}
                  />
                </FlexItem>
                <FlexItem>
                  <span style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                    {isUpdating ? 'Updating pod data...' : 'Real-time cluster data via watches'}
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
                <CardBody
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    flex: 1,
                  }}
                >
                  <div>
                    <Flex
                      alignItems={{ default: 'alignItemsCenter' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                    >
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
                    <Title
                      headingLevel="h2"
                      size="2xl"
                      style={{ color: '#0066cc', marginBottom: '8px' }}
                    >
                      {nodes.length}
                    </Title>
                    <div style={{ fontSize: '0.75rem', color: '#6a6e73', lineHeight: '1.4' }}>
                      <div>
                        {nodes.filter((n) => n.role === 'Control Plane').length} Control Plane
                      </div>
                      <div>{nodes.filter((n) => n.role === 'Worker').length} Worker Nodes</div>
                    </div>
                  </div>
                  <div
                    style={{
                      borderTop: '1px solid #d2d2d2',
                      paddingTop: '8px',
                      fontSize: '0.75rem',
                      color: '#6a6e73',
                      textAlign: 'center',
                    }}
                  >
                    <ClockIcon style={{ fontSize: '0.75rem', marginRight: '4px' }} />
                    Last updated: {new Date().toLocaleTimeString()}
                  </div>
                </CardBody>
              </Card>
            </GridItem>

            <GridItem span={3}>
              <Card style={{ minHeight: '160px', display: 'flex', flexDirection: 'column' }}>
                <CardBody
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    flex: 1,
                  }}
                >
                  <div>
                    <Flex
                      alignItems={{ default: 'alignItemsCenter' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                    >
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
                    <Title
                      headingLevel="h2"
                      size="2xl"
                      style={{ color: '#3e8635', marginBottom: '4px' }}
                    >
                      {nodes.filter((n) => n.status === 'Ready').length}
                    </Title>
                    <div style={{ fontSize: '0.75rem', color: '#6a6e73' }}>
                      {nodes.length > 0
                        ? Math.round(
                            (nodes.filter((n) => n.status === 'Ready').length / nodes.length) * 100,
                          )
                        : 0}
                      % Availability
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid #d2d2d2', paddingTop: '6px' }}>
                    <MiniLineChart
                      data={Array.from({ length: 12 }, (_, i) => ({
                        timestamp: Date.now() - (11 - i) * 60 * 60 * 1000,
                        value:
                          nodes.filter((n) => n.status === 'Ready').length +
                          (Math.random() - 0.5) * 0.5,
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
                <CardBody
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    flex: 1,
                  }}
                >
                  <div>
                    <Flex
                      alignItems={{ default: 'alignItemsCenter' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                    >
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
                    <Title
                      headingLevel="h2"
                      size="2xl"
                      style={{ color: '#8a2be2', marginBottom: '4px' }}
                    >
                      {nodes
                        .reduce(
                          (sum, node) => sum + parseFloat(node.allocatableResources?.cpu || '0'),
                          0,
                        )
                        .toLocaleString()}{' '}
                      Total
                    </Title>
                    <div style={{ fontSize: '0.75rem', color: '#6a6e73' }}>
                      cores across {nodes.length} nodes •{' '}
                      {nodes.length > 0
                        ? Math.round(
                            nodes.reduce(
                              (sum, node) => sum + (node.metrics?.cpu?.current || 0),
                              0,
                            ) / nodes.length,
                          )
                        : 0}
                      % avg usage
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid #d2d2d2', paddingTop: '6px' }}>
                    <MiniLineChart
                      data={Array.from({ length: 12 }, (_, i) => ({
                        timestamp: Date.now() - (11 - i) * 60 * 60 * 1000,
                        value: Math.max(
                          0,
                          (nodes.length > 0
                            ? Math.round(
                                nodes.reduce(
                                  (sum, node) => sum + (node.metrics?.cpu?.current || 0),
                                  0,
                                ) / nodes.length,
                              )
                            : 0) +
                            (Math.random() - 0.5) * 10,
                        ),
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
                <CardBody
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    flex: 1,
                  }}
                >
                  <div>
                    <Flex
                      alignItems={{ default: 'alignItemsCenter' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                    >
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
                    <Title
                      headingLevel="h2"
                      size="2xl"
                      style={{ color: '#ff6b35', marginBottom: '4px' }}
                    >
                      {Math.round(
                        nodes.reduce((sum, node) => {
                          return sum + convertGiToGB(node.allocatableResources?.memory || '0Gi');
                        }, 0),
                      ).toLocaleString()}{' '}
                      Total
                    </Title>
                    <div style={{ fontSize: '0.75rem', color: '#6a6e73' }}>
                      GB RAM across {nodes.length} nodes •{' '}
                      {nodes.length > 0
                        ? Math.round(
                            nodes.reduce(
                              (sum, node) => sum + (node.metrics?.memory?.current || 0),
                              0,
                            ) / nodes.length,
                          )
                        : 0}
                      % avg usage
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid #d2d2d2', paddingTop: '6px' }}>
                    <MiniLineChart
                      data={Array.from({ length: 12 }, (_, i) => ({
                        timestamp: Date.now() - (11 - i) * 60 * 60 * 1000,
                        value: Math.max(
                          0,
                          (nodes.length > 0
                            ? Math.round(
                                nodes.reduce(
                                  (sum, node) => sum + (node.metrics?.memory?.current || 0),
                                  0,
                                ) / nodes.length,
                              )
                            : 0) +
                            (Math.random() - 0.5) * 10,
                        ),
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
                <CardBody
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    flex: 1,
                  }}
                >
                  <div>
                    <Flex
                      alignItems={{ default: 'alignItemsCenter' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                    >
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
                    <Title
                      headingLevel="h2"
                      size="xl"
                      style={{ color: '#009639', marginBottom: '4px' }}
                    >
                      {nodes.reduce((sum, node) => sum + (node.pods?.length || 0), 0)}
                    </Title>
                    <div style={{ fontSize: '0.75rem', color: '#6a6e73' }}>Across all nodes</div>
                  </div>
                </CardBody>
              </Card>
            </GridItem>

            <GridItem span={3}>
              <Card style={{ minHeight: '120px', display: 'flex', flexDirection: 'column' }}>
                <CardBody
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    flex: 1,
                  }}
                >
                  <div>
                    <Flex
                      alignItems={{ default: 'alignItemsCenter' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                    >
                      <FlexItem>
                        <ExclamationTriangleIcon
                          style={{ color: '#f0ab00', fontSize: '1.25rem' }}
                        />
                      </FlexItem>
                      <FlexItem>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#151515' }}>
                          Issues
                        </div>
                      </FlexItem>
                    </Flex>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Title
                      headingLevel="h2"
                      size="xl"
                      style={{ color: '#f0ab00', marginBottom: '4px' }}
                    >
                      {
                        nodes.filter((n) => n?.cordoned || n?.drained || n?.status === 'NotReady')
                          .length
                      }
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
                <CardBody
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    flex: 1,
                  }}
                >
                  <div>
                    <Flex
                      alignItems={{ default: 'alignItemsCenter' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                    >
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
                    <Title
                      headingLevel="h2"
                      size="lg"
                      style={{ color: '#0066cc', marginBottom: '4px' }}
                    >
                      {nodes.length > 0 ? nodes[0]?.version?.split('+')[0] || 'v1.27.6' : 'v1.27.6'}
                    </Title>
                    <div style={{ fontSize: '0.75rem', color: '#6a6e73' }}>Cluster version</div>
                  </div>
                </CardBody>
              </Card>
            </GridItem>

            <GridItem span={3}>
              <Card style={{ minHeight: '120px', display: 'flex', flexDirection: 'column' }}>
                <CardBody
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    flex: 1,
                  }}
                >
                  <div>
                    <Flex
                      alignItems={{ default: 'alignItemsCenter' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                    >
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
                    <Title
                      headingLevel="h2"
                      size="lg"
                      style={{ color: '#8a2be2', marginBottom: '4px' }}
                    >
                      {nodes.length > 0 ? nodes[0].age : '0d'}
                    </Title>
                    <div style={{ fontSize: '0.75rem', color: '#6a6e73' }}>Oldest node age</div>
                  </div>
                </CardBody>
              </Card>
            </GridItem>
          </Grid>
        </StackItem>

        {/* Main Dashboard Grid */}
        <StackItem>
          <Grid hasGutter>
            <GridItem span={4}>
              <Card style={{ height: '600px' }}>
                <CardTitle>
                  <Flex
                    alignItems={{ default: 'alignItemsCenter' }}
                    spaceItems={{ default: 'spaceItemsSm' }}
                  >
                    <FlexItem>
                      <ListIcon />
                    </FlexItem>
                    <FlexItem>Cluster Nodes ({nodes.length})</FlexItem>
                  </Flex>
                </CardTitle>
                <CardBody style={{ padding: '0', height: 'calc(100% - 60px)', overflow: 'auto' }}>
                  <DataList
                    aria-label="Node selection list"
                    selectedDataListItemId={selectedNode?.name || ''}
                    style={{
                      height: '100%',
                      border: 'none',
                    }}
                  >
                    {nodes.map((node, _index) => (
                      <DataListItem
                        key={node.name}
                        id={node.name}
                        aria-labelledby={node.name}
                        selected={selectedNode?.name === node.name}
                        style={{
                          cursor: 'pointer',
                          padding: 'var(--pf-v5-global--spacer--sm)',
                          margin: 'var(--pf-v5-global--spacer--xs)',
                        }}
                        onClick={() => handleNodeSelection(node)}
                      >
                        <DataListItemRow>
                          <DataListItemCells
                            dataListCells={[
                              <DataListCell key="node-name" width={2}>
                                <Flex
                                  alignItems={{ default: 'alignItemsCenter' }}
                                  spaceItems={{ default: 'spaceItemsSm' }}
                                >
                                  <FlexItem>
                                    <div
                                      style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        backgroundColor: getStatusColor(node.status),
                                      }}
                                    />
                                  </FlexItem>
                                  <FlexItem>
                                    <div>
                                      <div style={{ fontWeight: 600 }}>{node.name}</div>
                                      <div
                                        style={{
                                          fontSize: '0.875rem',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                        }}
                                      >
                                        <Badge
                                          style={{
                                            backgroundColor:
                                              node.role === 'Control Plane' ? '#0066cc' : '#009639',
                                            color: 'white',
                                            fontSize: '0.75rem',
                                            padding: '2px 8px',
                                          }}
                                        >
                                          {node.role}
                                        </Badge>
                                        <span style={{ color: '#6a6e73' }}>{node.zone}</span>
                                        <span 
                                          style={{ 
                                            color: '#8a2be2', 
                                            fontSize: '0.75rem',
                                            fontWeight: 600 
                                          }}
                                        >
                                          ⏱ {node.uptime}
                                        </span>
                                      </div>
                                    </div>
                                  </FlexItem>
                                </Flex>
                              </DataListCell>,
                              <DataListCell key="node-resources" width={2}>
                                <div
                                  style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
                                >
                                  <div
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                  >
                                    <CpuIcon style={{ fontSize: '12px', color: '#0066cc' }} />
                                    <span
                                      style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        minWidth: '35px',
                                      }}
                                    >
                                      {Math.round(node.metrics?.cpu?.current || 0)}%
                                    </span>
                                    <div
                                      style={{
                                        flex: 1,
                                        height: '4px',
                                        backgroundColor: '#f0f0f0',
                                        borderRadius: '2px',
                                        overflow: 'hidden',
                                        minWidth: '40px',
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: `${Math.min(
                                            node.metrics?.cpu?.current || 0,
                                            100,
                                          )}%`,
                                          height: '100%',
                                          backgroundColor:
                                            (node.metrics?.cpu?.current || 0) > 80
                                              ? '#c9190b'
                                              : (node.metrics?.cpu?.current || 0) > 60
                                              ? '#f0ab00'
                                              : '#3e8635',
                                          borderRadius: '2px',
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <div
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                  >
                                    <MemoryIcon style={{ fontSize: '12px', color: '#009639' }} />
                                    <span
                                      style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        minWidth: '35px',
                                      }}
                                    >
                                      {Math.round(node.metrics?.memory?.current || 0)}%
                                    </span>
                                    <div
                                      style={{
                                        flex: 1,
                                        height: '4px',
                                        backgroundColor: '#f0f0f0',
                                        borderRadius: '2px',
                                        overflow: 'hidden',
                                        minWidth: '40px',
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: `${Math.min(
                                            node.metrics?.memory?.current || 0,
                                            100,
                                          )}%`,
                                          height: '100%',
                                          backgroundColor:
                                            (node.metrics?.memory?.current || 0) > 80
                                              ? '#c9190b'
                                              : (node.metrics?.memory?.current || 0) > 60
                                              ? '#f0ab00'
                                              : '#3e8635',
                                          borderRadius: '2px',
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <div
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                  >
                                    <ContainerNodeIcon
                                      style={{ fontSize: '12px', color: '#8a2be2' }}
                                    />
                                    <span
                                      style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: '#6a6e73',
                                      }}
                                    >
                                      {node.pods?.length || 0}/
                                      {parseInt(node.allocatableResources?.pods || '0')}
                                    </span>
                                  </div>
                                </div>
                              </DataListCell>,
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
                    <Flex
                      alignItems={{ default: 'alignItemsCenter' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                    >
                      <FlexItem>
                        <InfoCircleIcon />
                      </FlexItem>
                      <FlexItem>{selectedNode.name}</FlexItem>
                      <FlexItem>
                        <Badge
                          style={{
                            backgroundColor: getStatusColor(selectedNode.status),
                            color: 'white',
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
                      onSelect={(_event, tabIndex) => setActiveTab(tabIndex as string)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: 'auto',
                        overflow: 'visible',
                      }}
                    >
                      <Tab
                        eventKey="overview"
                        title={
                          <TabTitleText>
                            <TachometerAltIcon
                              style={{
                                marginRight: 'var(--pf-v5-global--spacer--xs)',
                                fontSize: '0.875rem',
                              }}
                            />
                            Overview
                          </TabTitleText>
                        }
                      >
                        <div
                          style={{
                            paddingTop: 'var(--pf-v5-global--spacer--md)',
                            height: 'auto',
                            overflow: 'visible',
                          }}
                        >
                          <Grid hasGutter style={{ height: 'auto', overflow: 'visible' }}>
                            {/* Resource Usage Cards with Charts */}
                            <GridItem span={4}>
                              <Card
                                style={{
                                  minHeight: '250px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                }}
                              >
                                <CardTitle>
                                  <Flex
                                    alignItems={{ default: 'alignItemsCenter' }}
                                    spaceItems={{ default: 'spaceItemsSm' }}
                                  >
                                    <FlexItem>
                                      <CpuIcon style={{ color: '#0066cc', fontSize: '1.5rem' }} />
                                    </FlexItem>
                                    <FlexItem>
                                      <span>CPU Usage</span>
                                    </FlexItem>
                                  </Flex>
                                </CardTitle>
                                <CardBody
                                  style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                  }}
                                >
                                  <div style={{ marginBottom: 'var(--pf-v5-global--spacer--md)' }}>
                                    <Title
                                      headingLevel="h2"
                                      size="2xl"
                                      style={{
                                        color: '#0066cc',
                                        marginBottom: 'var(--pf-v5-global--spacer--xs)',
                                      }}
                                    >
                                      {Math.round(selectedNode.metrics?.cpu?.current || 0)}%
                                    </Title>
                                    <Progress
                                      value={Math.round(selectedNode.metrics?.cpu?.current || 0)}
                                      variant={
                                        (selectedNode.metrics?.cpu?.current || 0) > 80
                                          ? 'danger'
                                          : (selectedNode.metrics?.cpu?.current || 0) > 60
                                          ? 'warning'
                                          : 'success'
                                      }
                                      size="sm"
                                      aria-label={`CPU usage: ${Math.round(
                                        selectedNode.metrics?.cpu?.current || 0,
                                      )}%`}
                                    />
                                  </div>

                                  {/* CPU Usage Chart */}
                                  <div>
                                    <div
                                      style={{
                                        fontSize: '0.75rem',
                                        color: '#6a6e73',
                                        marginBottom: '4px',
                                      }}
                                    >
                                      24-hour trend
                                    </div>
                                    <MiniLineChart
                                      data={selectedNode.metrics?.cpu?.history || []}
                                      color="#0066cc"
                                      width={180}
                                      height={80}
                                    />
                                  </div>
                                </CardBody>
                              </Card>
                            </GridItem>
                            <GridItem span={4}>
                              <Card
                                style={{
                                  minHeight: '250px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                }}
                              >
                                <CardTitle>
                                  <Flex
                                    alignItems={{ default: 'alignItemsCenter' }}
                                    spaceItems={{ default: 'spaceItemsSm' }}
                                  >
                                    <FlexItem>
                                      <MemoryIcon
                                        style={{ color: '#009639', fontSize: '1.5rem' }}
                                      />
                                    </FlexItem>
                                    <FlexItem>
                                      <span>Memory Usage</span>
                                    </FlexItem>
                                  </Flex>
                                </CardTitle>
                                <CardBody
                                  style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                  }}
                                >
                                  <div style={{ marginBottom: 'var(--pf-v5-global--spacer--md)' }}>
                                    <Title
                                      headingLevel="h2"
                                      size="2xl"
                                      style={{
                                        color: '#009639',
                                        marginBottom: 'var(--pf-v5-global--spacer--xs)',
                                      }}
                                    >
                                      {Math.round(selectedNode.metrics?.memory?.current || 0)}%
                                    </Title>
                                    <Progress
                                      value={Math.round(selectedNode.metrics?.memory?.current || 0)}
                                      variant={
                                        (selectedNode.metrics?.memory?.current || 0) > 80
                                          ? 'danger'
                                          : (selectedNode.metrics?.memory?.current || 0) > 60
                                          ? 'warning'
                                          : 'success'
                                      }
                                      size="sm"
                                      aria-label={`Memory usage: ${Math.round(
                                        selectedNode.metrics?.memory?.current || 0,
                                      )}%`}
                                    />
                                  </div>

                                  {/* Memory Usage Chart */}
                                  <div>
                                    <div
                                      style={{
                                        fontSize: '0.75rem',
                                        color: '#6a6e73',
                                        marginBottom: '4px',
                                      }}
                                    >
                                      24-hour trend
                                    </div>
                                    <MiniLineChart
                                      data={selectedNode.metrics?.memory?.history || []}
                                      color="#009639"
                                      width={180}
                                      height={80}
                                    />
                                  </div>
                                </CardBody>
                              </Card>
                            </GridItem>
                            <GridItem span={4}>
                              <Card
                                style={{
                                  minHeight: '250px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                }}
                              >
                                <CardTitle>
                                  <Flex
                                    alignItems={{ default: 'alignItemsCenter' }}
                                    spaceItems={{ default: 'spaceItemsSm' }}
                                  >
                                    <FlexItem>
                                      <ClusterIcon
                                        style={{ color: '#8a2be2', fontSize: '1.5rem' }}
                                      />
                                    </FlexItem>
                                    <FlexItem>
                                      <span>Pod Count</span>
                                    </FlexItem>
                                  </Flex>
                                </CardTitle>
                                <CardBody
                                  style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                  }}
                                >
                                  <div style={{ marginBottom: 'var(--pf-v5-global--spacer--md)' }}>
                                    <Title
                                      headingLevel="h2"
                                      size="2xl"
                                      style={{
                                        color: '#8a2be2',
                                        marginBottom: 'var(--pf-v5-global--spacer--xs)',
                                      }}
                                    >
                                      {selectedNode.pods?.length || 0}
                                    </Title>
                                    <div
                                      style={{
                                        fontSize: '0.75rem',
                                        color: '#6a6e73',
                                        marginBottom: '4px',
                                      }}
                                    >
                                      Capacity: {selectedNode.allocatableResources.pods} pods
                                    </div>
                                    <Progress
                                      value={
                                        (selectedNode.pods.length /
                                          parseInt(selectedNode.allocatableResources.pods)) *
                                        100
                                      }
                                      variant={
                                        selectedNode.pods.length /
                                          parseInt(selectedNode.allocatableResources.pods) >
                                        0.8
                                          ? 'danger'
                                          : selectedNode.pods.length /
                                              parseInt(selectedNode.allocatableResources.pods) >
                                            0.6
                                          ? 'warning'
                                          : 'success'
                                      }
                                      size="sm"
                                      aria-label={`Pod utilization: ${selectedNode.pods.length} of ${selectedNode.allocatableResources.pods} pods`}
                                    />
                                  </div>

                                  {/* Pod Status Breakdown */}
                                  <div style={{ flex: 1 }}>
                                    <div
                                      style={{
                                        fontSize: '0.75rem',
                                        color: '#6a6e73',
                                        marginBottom: '8px',
                                      }}
                                    >
                                      Pod status breakdown
                                    </div>
                                    <Stack hasGutter>
                                      <StackItem>
                                        <Flex
                                          justifyContent={{ default: 'justifyContentSpaceBetween' }}
                                        >
                                          <FlexItem>
                                            <span style={{ fontSize: '0.75rem' }}>
                                              <span style={{ color: '#3e8635' }}>●</span> Running
                                            </span>
                                          </FlexItem>
                                          <FlexItem>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                              {
                                                selectedNode.pods.filter(
                                                  (p) => p.status === 'Running',
                                                ).length
                                              }
                                            </span>
                                          </FlexItem>
                                        </Flex>
                                      </StackItem>
                                      <StackItem>
                                        <Flex
                                          justifyContent={{ default: 'justifyContentSpaceBetween' }}
                                        >
                                          <FlexItem>
                                            <span style={{ fontSize: '0.75rem' }}>
                                              <span style={{ color: '#f0ab00' }}>●</span> Pending
                                            </span>
                                          </FlexItem>
                                          <FlexItem>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                              {
                                                selectedNode.pods.filter(
                                                  (p) => p.status === 'Pending',
                                                ).length
                                              }
                                            </span>
                                          </FlexItem>
                                        </Flex>
                                      </StackItem>
                                      <StackItem>
                                        <Flex
                                          justifyContent={{ default: 'justifyContentSpaceBetween' }}
                                        >
                                          <FlexItem>
                                            <span style={{ fontSize: '0.75rem' }}>
                                              <span style={{ color: '#c9190b' }}>●</span> Failed
                                            </span>
                                          </FlexItem>
                                          <FlexItem>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                              {
                                                selectedNode.pods.filter(
                                                  (p) => p.status === 'Failed',
                                                ).length
                                              }
                                            </span>
                                          </FlexItem>
                                        </Flex>
                                      </StackItem>
                                      <StackItem>
                                        <Flex
                                          justifyContent={{ default: 'justifyContentSpaceBetween' }}
                                        >
                                          <FlexItem>
                                            <span style={{ fontSize: '0.75rem' }}>
                                              <span style={{ color: '#339af0' }}>●</span> Succeeded
                                            </span>
                                          </FlexItem>
                                          <FlexItem>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                              {
                                                selectedNode.pods.filter(
                                                  (p) => p.status === 'Succeeded',
                                                ).length
                                              }
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
                              <Card
                                style={{
                                  minHeight: '250px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                }}
                              >
                                <CardTitle>
                                  <Flex
                                    alignItems={{ default: 'alignItemsCenter' }}
                                    spaceItems={{ default: 'spaceItemsSm' }}
                                  >
                                    <FlexItem>
                                      <CodeBranchIcon
                                        style={{ color: '#6f42c1', fontSize: '1.5rem' }}
                                      />
                                    </FlexItem>
                                    <FlexItem>System Information</FlexItem>
                                  </Flex>
                                </CardTitle>
                                <CardBody style={{ flex: 1 }}>
                                  <DescriptionList>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>
                                        <CodeBranchIcon
                                          style={{ marginRight: 'var(--pf-v5-global--spacer--xs)' }}
                                        />
                                        Version
                                      </DescriptionListTerm>
                                      <DescriptionListDescription>
                                        {selectedNode.version}
                                      </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>
                                        <ClockIcon
                                          style={{ marginRight: 'var(--pf-v5-global--spacer--xs)' }}
                                        />
                                        Age
                                      </DescriptionListTerm>
                                      <DescriptionListDescription>
                                        {selectedNode.age}
                                      </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>OS/Arch</DescriptionListTerm>
                                      <DescriptionListDescription>
                                        {selectedNode.operatingSystem}/{selectedNode.architecture}
                                      </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>Container Runtime</DescriptionListTerm>
                                      <DescriptionListDescription>
                                        {selectedNode.containerRuntime}
                                      </DescriptionListDescription>
                                    </DescriptionListGroup>
                                  </DescriptionList>
                                </CardBody>
                              </Card>
                            </GridItem>
                            <GridItem span={4}>
                              <Card
                                style={{
                                  minHeight: '250px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                }}
                              >
                                <CardTitle>
                                  <Flex
                                    alignItems={{ default: 'alignItemsCenter' }}
                                    spaceItems={{ default: 'spaceItemsSm' }}
                                  >
                                    <FlexItem>
                                      <ServerIcon
                                        style={{ color: '#28a745', fontSize: '1.5rem' }}
                                      />
                                    </FlexItem>
                                    <FlexItem>Infrastructure</FlexItem>
                                  </Flex>
                                </CardTitle>
                                <CardBody style={{ flex: 1 }}>
                                  <DescriptionList>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>Zone</DescriptionListTerm>
                                      <DescriptionListDescription>
                                        {selectedNode.zone}
                                      </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>Instance Type</DescriptionListTerm>
                                      <DescriptionListDescription>
                                        {selectedNode.instanceType}
                                      </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>Role</DescriptionListTerm>
                                      <DescriptionListDescription>
                                        <Badge
                                          style={{
                                            backgroundColor:
                                              selectedNode.role === 'master'
                                                ? '#0066cc'
                                                : '#009639',
                                            color: 'white',
                                          }}
                                        >
                                          {selectedNode.role}
                                        </Badge>
                                      </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>Status</DescriptionListTerm>
                                      <DescriptionListDescription>
                                        <Badge
                                          style={{
                                            backgroundColor: getStatusColor(selectedNode.status),
                                            color: 'white',
                                          }}
                                        >
                                          {selectedNode.status}
                                        </Badge>
                                      </DescriptionListDescription>
                                    </DescriptionListGroup>
                                  </DescriptionList>
                                </CardBody>
                              </Card>
                            </GridItem>
                            <GridItem span={4}>
                              <Card
                                style={{
                                  minHeight: '250px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                }}
                              >
                                <CardTitle>
                                  <Flex
                                    alignItems={{ default: 'alignItemsCenter' }}
                                    spaceItems={{ default: 'spaceItemsSm' }}
                                  >
                                    <FlexItem>
                                      <ResourcesEmptyIcon
                                        style={{ color: '#e7711b', fontSize: '1.5rem' }}
                                      />
                                    </FlexItem>
                                    <FlexItem>Resource Capacity</FlexItem>
                                  </Flex>
                                </CardTitle>
                                <CardBody style={{ flex: 1 }}>
                                  <DescriptionList>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>
                                        <CpuIcon
                                          style={{ marginRight: 'var(--pf-v5-global--spacer--xs)' }}
                                        />
                                        CPU Cores
                                      </DescriptionListTerm>
                                      <DescriptionListDescription>
                                        {(() => {
                                          const cpu = formatCPU(
                                            selectedNode.allocatableResources.cpu,
                                          );
                                          return `${cpu.value} ${cpu.unit}`;
                                        })()}
                                      </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>
                                        <MemoryIcon
                                          style={{ marginRight: 'var(--pf-v5-global--spacer--xs)' }}
                                        />
                                        Memory
                                      </DescriptionListTerm>
                                      <DescriptionListDescription>
                                        {formatMemoryForDisplay(
                                          selectedNode.allocatableResources.memory,
                                        )}
                                      </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>
                                        <ContainerNodeIcon
                                          style={{ marginRight: 'var(--pf-v5-global--spacer--xs)' }}
                                        />
                                        Max Pods
                                      </DescriptionListTerm>
                                      <DescriptionListDescription>
                                        {selectedNode.allocatableResources.pods}
                                      </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                      <DescriptionListTerm>Cordoned</DescriptionListTerm>
                                      <DescriptionListDescription>
                                        <Badge
                                          style={{
                                            backgroundColor: selectedNode.cordoned
                                              ? '#c9190b'
                                              : '#3e8635',
                                            color: 'white',
                                          }}
                                        >
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

                      <Tab
                        eventKey="conditions"
                        title={
                          <TabTitleText>
                            <CheckCircleIcon
                              style={{
                                marginRight: 'var(--pf-v5-global--spacer--xs)',
                                fontSize: '0.875rem',
                              }}
                            />
                            Conditions
                          </TabTitleText>
                        }
                      >
                        <div style={{ paddingTop: 'var(--pf-v5-global--spacer--md)' }}>
                          <Stack hasGutter>
                            {selectedNode.conditions.map((condition, index) => (
                              <StackItem key={index}>
                                <Card>
                                  <CardBody>
                                    <Flex
                                      alignItems={{ default: 'alignItemsCenter' }}
                                      spaceItems={{ default: 'spaceItemsSm' }}
                                    >
                                      <FlexItem>{getConditionIcon(condition)}</FlexItem>
                                      <FlexItem>
                                        <span style={{ fontWeight: 600 }}>{condition.type}</span>
                                      </FlexItem>
                                      <FlexItem>
                                        <Badge>{condition.status}</Badge>
                                      </FlexItem>
                                      <FlexItem flex={{ default: 'flex_1' }}>
                                        <span style={{ fontSize: '0.875rem' }}>
                                          {condition.message}
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

                      <Tab
                        eventKey="pods"
                        title={
                          <TabTitleText>
                            <ClusterIcon
                              style={{
                                marginRight: 'var(--pf-v5-global--spacer--xs)',
                                fontSize: '0.875rem',
                              }}
                            />
                            Pods ({selectedNode.pods.length})
                          </TabTitleText>
                        }
                      >
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
                                    <Badge
                                      style={{
                                        backgroundColor: getPodStatusColor(pod.status),
                                        color: 'white',
                                      }}
                                    >
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

                      <Tab
                        eventKey="events"
                        title={
                          <TabTitleText>
                            <ExclamationTriangleIcon
                              style={{
                                marginRight: 'var(--pf-v5-global--spacer--xs)',
                                fontSize: '0.875rem',
                              }}
                            />
                            Events ({selectedNode.events.length})
                          </TabTitleText>
                        }
                      >
                        <div style={{ paddingTop: 'var(--pf-v5-global--spacer--md)' }}>
                          {selectedNode.events.length === 0 ? (
                            <EmptyState>
                              <InfoCircleIcon style={{ color: '#0066cc', fontSize: '3rem' }} />
                              <Title headingLevel="h3" size="lg">
                                No Recent Events
                              </Title>
                              <EmptyStateBody>
                                No Kubernetes events are currently recorded for node{' '}
                                <strong>{selectedNode.name}</strong>.
                                <br />
                                This typically means the node is operating normally without any
                                noteworthy events.
                                <br />
                                <br />
                                Events appear here when:
                                <ul style={{ textAlign: 'left', marginTop: '8px' }}>
                                  <li>Node conditions change (Ready/NotReady)</li>
                                  <li>Node scheduling events occur</li>
                                  <li>Resource pressure warnings are triggered</li>
                                  <li>System component events are generated</li>
                                </ul>
                              </EmptyStateBody>
                            </EmptyState>
                          ) : (
                            <Stack hasGutter>
                              {selectedNode.events.map((event, index) => (
                                <StackItem key={index}>
                                  <Card>
                                    <CardBody>
                                      <Flex
                                        alignItems={{ default: 'alignItemsCenter' }}
                                        spaceItems={{ default: 'spaceItemsSm' }}
                                      >
                                        <FlexItem>
                                          {event.type === 'Warning' ? (
                                            <ExclamationTriangleIcon style={{ color: '#f0ab00' }} />
                                          ) : (
                                            <InfoCircleIcon style={{ color: '#0066cc' }} />
                                          )}
                                        </FlexItem>
                                        <FlexItem>
                                          <span style={{ fontWeight: 600 }}>{event.reason}</span>
                                        </FlexItem>
                                        <FlexItem flex={{ default: 'flex_1' }}>
                                          <span style={{ fontSize: '0.875rem' }}>
                                            {event.message}
                                          </span>
                                        </FlexItem>
                                        <FlexItem>
                                          <Badge
                                            style={{
                                              backgroundColor:
                                                event.type === 'Warning' ? '#f0ab00' : '#0066cc',
                                              color: 'white',
                                              fontSize: '0.625rem',
                                            }}
                                          >
                                            {event.type}
                                          </Badge>
                                        </FlexItem>
                                        <FlexItem>
                                          <div
                                            style={{
                                              textAlign: 'right',
                                              fontSize: '0.75rem',
                                              color: '#6a6e73',
                                            }}
                                          >
                                            {new Date(event.timestamp).toLocaleString()}
                                            {event.count > 1 && (
                                              <div
                                                style={{ fontSize: '0.625rem', marginTop: '2px' }}
                                              >
                                                Count: {event.count}
                                              </div>
                                            )}
                                          </div>
                                        </FlexItem>
                                      </Flex>
                                    </CardBody>
                                  </Card>
                                </StackItem>
                              ))}
                            </Stack>
                          )}
                        </div>
                      </Tab>

                      <Tab
                        eventKey="alerts"
                        title={
                          <TabTitleText>
                            <BellIcon
                              style={{
                                marginRight: 'var(--pf-v5-global--spacer--xs)',
                                fontSize: '0.875rem',
                              }}
                            />
                            Alerts ({getNodeAlerts(selectedNode).length})
                          </TabTitleText>
                        }
                      >
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
                                    This node is operating normally with no active alerts or
                                    warnings.
                                  </EmptyStateBody>
                                </EmptyState>
                              );
                            }

                            return (
                              <Grid hasGutter>
                                {nodeAlerts.map((alert) => (
                                  <GridItem span={12} key={alert.id}>
                                    <Card
                                      style={{
                                        borderLeft: `4px solid ${getAlertSeverityColor(
                                          alert.severity,
                                        )}`,
                                      }}
                                    >
                                      <CardBody>
                                        <Flex
                                          alignItems={{ default: 'alignItemsCenter' }}
                                          spaceItems={{ default: 'spaceItemsSm' }}
                                        >
                                          <FlexItem>{getAlertIcon(alert)}</FlexItem>
                                          <FlexItem flex={{ default: 'flex_1' }}>
                                            <div>
                                              <div
                                                style={{
                                                  fontWeight: 600,
                                                  fontSize: '0.875rem',
                                                  color: '#151515',
                                                }}
                                              >
                                                {alert.title}
                                              </div>
                                              <div
                                                style={{
                                                  fontSize: '0.75rem',
                                                  color: '#6a6e73',
                                                  marginTop: '2px',
                                                }}
                                              >
                                                Type: <strong>{alert.type}</strong>
                                              </div>
                                              <div
                                                style={{
                                                  fontSize: '0.75rem',
                                                  color: '#151515',
                                                  marginTop: '4px',
                                                }}
                                              >
                                                {alert.message}
                                              </div>
                                            </div>
                                          </FlexItem>
                                          <FlexItem>
                                            <div style={{ textAlign: 'right' }}>
                                              <Badge
                                                style={{
                                                  backgroundColor: getAlertSeverityColor(
                                                    alert.severity,
                                                  ),
                                                  color: 'white',
                                                  fontSize: '0.625rem',
                                                  textTransform: 'uppercase',
                                                }}
                                              >
                                                {alert.severity}
                                              </Badge>
                                              {alert.count && alert.count > 1 && (
                                                <div
                                                  style={{
                                                    fontSize: '0.75rem',
                                                    color: '#6a6e73',
                                                    marginTop: '4px',
                                                  }}
                                                >
                                                  {alert.count}x
                                                </div>
                                              )}
                                              <div
                                                style={{
                                                  fontSize: '0.625rem',
                                                  color: '#6a6e73',
                                                  marginTop: '4px',
                                                }}
                                              >
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

                      <Tab
                        eventKey="logs"
                        title={
                          <TabTitleText>
                            <TerminalIcon
                              style={{
                                marginRight: 'var(--pf-v5-global--spacer--xs)',
                                fontSize: '0.875rem',
                              }}
                            />
                            Logs
                          </TabTitleText>
                        }
                      >
                        <div style={{ paddingTop: 'var(--pf-v5-global--spacer--md)' }}>
                          <Stack hasGutter>
                            {/* Log Type Selector */}
                            <StackItem>
                              <Grid hasGutter>
                                <GridItem span={2}>
                                  <Card
                                    isSelectable
                                    isSelected={logType === 'all'}
                                    onClick={() => handleLogTypeChange('all')}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <CardBody>
                                      <Flex
                                        direction={{ default: 'column' }}
                                        alignItems={{ default: 'alignItemsCenter' }}
                                        spaceItems={{ default: 'spaceItemsSm' }}
                                      >
                                        <FlexItem>
                                          <ListIcon
                                            style={{
                                              fontSize: '1.5rem',
                                              color: logType === 'all' ? '#6c5ce7' : '#6a6e73',
                                            }}
                                          />
                                        </FlexItem>
                                        <FlexItem>
                                          <Title
                                            headingLevel="h5"
                                            size="md"
                                            style={{
                                              color: logType === 'all' ? '#6c5ce7' : '#151515',
                                            }}
                                          >
                                            All Logs
                                          </Title>
                                        </FlexItem>
                                      </Flex>
                                    </CardBody>
                                  </Card>
                                </GridItem>
                                <GridItem span={2}>
                                  <Card
                                    isSelectable
                                    isSelected={logType === 'kubelet'}
                                    onClick={() => handleLogTypeChange('kubelet')}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <CardBody>
                                      <Flex
                                        direction={{ default: 'column' }}
                                        alignItems={{ default: 'alignItemsCenter' }}
                                        spaceItems={{ default: 'spaceItemsSm' }}
                                      >
                                        <FlexItem>
                                          <TerminalIcon
                                            style={{
                                              fontSize: '1.5rem',
                                              color: logType === 'kubelet' ? '#0066cc' : '#6a6e73',
                                            }}
                                          />
                                        </FlexItem>
                                        <FlexItem>
                                          <Title
                                            headingLevel="h5"
                                            size="md"
                                            style={{
                                              color: logType === 'kubelet' ? '#0066cc' : '#151515',
                                            }}
                                          >
                                            Kubelet
                                          </Title>
                                        </FlexItem>
                                      </Flex>
                                    </CardBody>
                                  </Card>
                                </GridItem>
                                <GridItem span={2}>
                                  <Card
                                    isSelectable
                                    isSelected={logType === 'system'}
                                    onClick={() => handleLogTypeChange('system')}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <CardBody>
                                      <Flex
                                        direction={{ default: 'column' }}
                                        alignItems={{ default: 'alignItemsCenter' }}
                                        spaceItems={{ default: 'spaceItemsSm' }}
                                      >
                                        <FlexItem>
                                          <ServerIcon
                                            style={{
                                              fontSize: '1.5rem',
                                              color: logType === 'system' ? '#009639' : '#6a6e73',
                                            }}
                                          />
                                        </FlexItem>
                                        <FlexItem>
                                          <Title
                                            headingLevel="h5"
                                            size="md"
                                            style={{
                                              color: logType === 'system' ? '#009639' : '#151515',
                                            }}
                                          >
                                            System
                                          </Title>
                                        </FlexItem>
                                      </Flex>
                                    </CardBody>
                                  </Card>
                                </GridItem>
                                <GridItem span={2}>
                                  <Card
                                    isSelectable
                                    isSelected={logType === 'containers'}
                                    onClick={() => handleLogTypeChange('containers')}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <CardBody>
                                      <Flex
                                        direction={{ default: 'column' }}
                                        alignItems={{ default: 'alignItemsCenter' }}
                                        spaceItems={{ default: 'spaceItemsSm' }}
                                      >
                                        <FlexItem>
                                          <ContainerNodeIcon
                                            style={{
                                              fontSize: '1.5rem',
                                              color:
                                                logType === 'containers' ? '#8a2be2' : '#6a6e73',
                                            }}
                                          />
                                        </FlexItem>
                                        <FlexItem>
                                          <Title
                                            headingLevel="h5"
                                            size="md"
                                            style={{
                                              color:
                                                logType === 'containers' ? '#8a2be2' : '#151515',
                                            }}
                                          >
                                            Containers
                                          </Title>
                                        </FlexItem>
                                      </Flex>
                                    </CardBody>
                                  </Card>
                                </GridItem>
                                <GridItem span={2}>
                                  <Card
                                    isSelectable
                                    isSelected={logType === 'audit'}
                                    onClick={() => handleLogTypeChange('audit')}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <CardBody>
                                      <Flex
                                        direction={{ default: 'column' }}
                                        alignItems={{ default: 'alignItemsCenter' }}
                                        spaceItems={{ default: 'spaceItemsSm' }}
                                      >
                                        <FlexItem>
                                          <MonitoringIcon
                                            style={{
                                              fontSize: '1.5rem',
                                              color: logType === 'audit' ? '#ec7a08' : '#6a6e73',
                                            }}
                                          />
                                        </FlexItem>
                                        <FlexItem>
                                          <Title
                                            headingLevel="h5"
                                            size="md"
                                            style={{
                                              color: logType === 'audit' ? '#ec7a08' : '#151515',
                                            }}
                                          >
                                            Audit
                                          </Title>
                                        </FlexItem>
                                      </Flex>
                                    </CardBody>
                                  </Card>
                                </GridItem>
                                <GridItem span={2}>
                                  {/* Spacer for alignment */}
                                </GridItem>
                              </Grid>
                            </StackItem>

                            {/* Inline Log Viewer */}
                            <StackItem>
                              <Card>
                                <CardTitle>
                                  <Flex
                                    alignItems={{ default: 'alignItemsCenter' }}
                                    spaceItems={{ default: 'spaceItemsSm' }}
                                  >
                                    <FlexItem>
                                      {logType === 'all' && (
                                        <ListIcon style={{ color: '#6c5ce7' }} />
                                      )}
                                      {logType === 'kubelet' && (
                                        <TerminalIcon style={{ color: '#0066cc' }} />
                                      )}
                                      {logType === 'system' && (
                                        <ServerIcon style={{ color: '#009639' }} />
                                      )}
                                      {logType === 'containers' && (
                                        <ContainerNodeIcon style={{ color: '#8a2be2' }} />
                                      )}
                                      {logType === 'audit' && (
                                        <MonitoringIcon style={{ color: '#ec7a08' }} />
                                      )}
                                    </FlexItem>
                                    <FlexItem>
                                      <Title headingLevel="h4" size="md">
                                        {logType === 'all' && 'All Logs'}
                                        {logType === 'kubelet' && 'Kubelet Logs'}
                                        {logType === 'system' && 'System Logs'}
                                        {logType === 'containers' && 'Container Logs'}
                                        {logType === 'audit' && 'Audit Logs'}
                                      </Title>
                                    </FlexItem>
                                    <FlexItem>
                                      <Badge
                                        style={{ backgroundColor: '#f0f0f0', color: '#151515' }}
                                      >
                                        Live
                                      </Badge>
                                    </FlexItem>
                                  </Flex>
                                </CardTitle>
                                <CardBody style={{ padding: 0 }}>
                                  <div
                                    ref={logContainerRef}
                                    style={{
                                      backgroundColor: '#1a1a1a',
                                      color: '#ffffff',
                                      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                                      fontSize: '0.75rem',
                                      padding: 'var(--pf-v5-global--spacer--md)',
                                      borderRadius:
                                        '0 0 var(--pf-v5-global--BorderRadius--sm) var(--pf-v5-global--BorderRadius--sm)',
                                      height: '500px',
                                      maxHeight: '500px',
                                      overflowY: 'auto',
                                      overflowX: 'hidden',
                                    }}
                                  >
                                    {(() => {
                                      const displayLogs = logType === 'all' 
                                        ? [
                                            ...(logs.kubelet || []).map(log => ({ log, type: 'kubelet' })),
                                            ...(logs.system || []).map(log => ({ log, type: 'system' })),
                                            ...(logs.containers || []).map(log => ({ log, type: 'containers' })),
                                            ...(logs.audit || []).map(log => ({ log, type: 'audit' }))
                                          ].sort((a, b) => {
                                            // Sort by timestamp (extracted from log entry)
                                            const timestampA = a.log.substring(0, 24);
                                            const timestampB = b.log.substring(0, 24);
                                            return timestampB.localeCompare(timestampA);
                                          })
                                        : (logs[logType] || []).map(log => ({ log, type: logType }));

                                      return displayLogs.length > 0 ? (
                                        displayLogs.map((entry, index) => (
                                          <div
                                            key={index}
                                            style={{
                                              marginBottom: '2px',
                                              lineHeight: '1.4',
                                              wordBreak: 'break-word',
                                            }}
                                          >
                                            {logType === 'all' && (
                                              <span
                                                style={{
                                                  color: entry.type === 'kubelet' ? '#0066cc' 
                                                         : entry.type === 'system' ? '#009639' 
                                                         : entry.type === 'containers' ? '#8a2be2'
                                                         : '#ec7a08',
                                                  fontSize: '0.7rem',
                                                  marginRight: '8px',
                                                  textTransform: 'uppercase',
                                                  fontWeight: 'bold'
                                                }}
                                              >
                                                [{entry.type}]
                                              </span>
                                            )}
                                            {entry.log}
                                          </div>
                                        ))
                                      ) : (
                                        <div style={{ color: '#888', fontStyle: 'italic' }}>
                                          {logType === 'all' 
                                            ? 'No logs available from any source' 
                                            : `No ${logType} logs available`}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </CardBody>
                              </Card>
                            </StackItem>
                          </Stack>
                        </div>
                      </Tab>

                      <Tab
                        eventKey="terminal"
                        title={
                          <TabTitleText>
                            <TerminalIcon
                              style={{
                                marginRight: 'var(--pf-v5-global--spacer--xs)',
                                fontSize: '0.875rem',
                              }}
                            />
                            Terminal
                          </TabTitleText>
                        }
                      >
                        <div style={{ paddingTop: 'var(--pf-v5-global--spacer--md)' }}>
                          <Card style={{ backgroundColor: '#1a1a1a', border: '1px solid #3c3c3c' }}>
                            <CardTitle style={{ 
                              backgroundColor: '#2d2d2d', 
                              color: '#ffffff',
                              fontSize: '0.875rem',
                              padding: 'var(--pf-v5-global--spacer--sm) var(--pf-v5-global--spacer--md)'
                            }}>
                              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                                <FlexItem>
                                  <TerminalIcon style={{ color: '#00ff00' }} />
                                </FlexItem>
                                <FlexItem>
                                  Terminal - {selectedNode.name}
                                </FlexItem>
                                <FlexItem>
                                  <Badge style={{ backgroundColor: '#00ff00', color: '#000000', fontSize: '0.625rem' }}>
                                    Connected
                                  </Badge>
                                </FlexItem>
                              </Flex>
                            </CardTitle>
                            <CardBody style={{ padding: 0 }}>
                              <div
                                style={{
                                  backgroundColor: '#1a1a1a',
                                  color: '#00ff00',
                                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                                  fontSize: '0.875rem',
                                  padding: 'var(--pf-v5-global--spacer--md)',
                                  height: '500px',
                                  overflowY: 'auto',
                                  whiteSpace: 'pre-wrap',
                                }}
                              >
                                <div style={{ marginBottom: '8px' }}>
                                  <span style={{ color: '#ffff00' }}>core@{selectedNode.name}</span>
                                  <span style={{ color: '#ffffff' }}>:~$ </span>
                                  <span style={{ color: '#00ff00' }}>Welcome to OpenShift Container Platform</span>
                                </div>
                                <div style={{ marginBottom: '8px' }}>
                                  <span style={{ color: '#ffff00' }}>core@{selectedNode.name}</span>
                                  <span style={{ color: '#ffffff' }}>:~$ </span>
                                  <span style={{ color: '#00ff00' }}>uname -a</span>
                                </div>
                                <div style={{ marginBottom: '8px', color: '#ffffff' }}>
                                  Linux {selectedNode.name} 5.14.0-284.30.1.el9_2.x86_64 #{selectedNode.architecture} SMP PREEMPT_DYNAMIC
                                </div>
                                <div style={{ marginBottom: '8px' }}>
                                  <span style={{ color: '#ffff00' }}>core@{selectedNode.name}</span>
                                  <span style={{ color: '#ffffff' }}>:~$ </span>
                                  <span style={{ color: '#00ff00' }}>systemctl status kubelet</span>
                                </div>
                                <div style={{ marginBottom: '8px', color: '#ffffff' }}>
                                  ● kubelet.service - Kubernetes Kubelet<br/>
                                  &nbsp;&nbsp;&nbsp;Loaded: loaded (/etc/systemd/system/kubelet.service; enabled; vendor preset: enabled)<br/>
                                  &nbsp;&nbsp;&nbsp;Active: <span style={{color: '#00ff00'}}>active (running)</span> since {new Date(Date.now() - Math.random() * 86400000).toLocaleDateString()}<br/>
                                  &nbsp;&nbsp;&nbsp;Main PID: 1234 (kubelet)<br/>
                                  &nbsp;&nbsp;&nbsp;Memory: 123.4M<br/>
                                  &nbsp;&nbsp;&nbsp;CGroup: /system.slice/kubelet.service<br/>
                                </div>
                                <div style={{ marginBottom: '8px' }}>
                                  <span style={{ color: '#ffff00' }}>core@{selectedNode.name}</span>
                                  <span style={{ color: '#ffffff' }}>:~$ </span>
                                  <span style={{ color: '#00ff00' }}>crictl ps | head -5</span>
                                </div>
                                <div style={{ marginBottom: '8px', color: '#ffffff' }}>
                                  CONTAINER ID&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;IMAGE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;CREATED&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;STATE&nbsp;&nbsp;&nbsp;&nbsp;NAME<br/>
                                  {selectedNode.pods?.slice(0, 3).map((pod, index) => (
                                    <div key={index}>
                                      {Math.random().toString(36).substring(2, 15)}&nbsp;&nbsp;&nbsp;{pod.namespace}/{pod.name}&nbsp;&nbsp;&nbsp;{pod.age}&nbsp;&nbsp;&nbsp;<span style={{color: pod.status === 'Running' ? '#00ff00' : '#ff0000'}}>{pod.status}</span>&nbsp;&nbsp;&nbsp;{pod.name}
                                    </div>
                                  ))}
                                </div>
                                <div style={{ marginBottom: '8px' }}>
                                  <span style={{ color: '#ffff00' }}>core@{selectedNode.name}</span>
                                  <span style={{ color: '#ffffff' }}>:~$ </span>
                                  <span style={{ color: '#00ff00' }}>free -h</span>
                                </div>
                                <div style={{ marginBottom: '8px', color: '#ffffff' }}>
                                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;total&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;used&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;free&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;shared&nbsp;&nbsp;buff/cache&nbsp;&nbsp;&nbsp;available<br/>
                                  Mem:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{formatMemoryForDisplay(selectedNode.allocatableResources.memory)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{Math.round(selectedNode.metrics.memory.current)}%&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{Math.round(100 - selectedNode.metrics.memory.current)}%&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0B&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2.1G&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{Math.round(100 - selectedNode.metrics.memory.current - 10)}%<br/>
                                  Swap:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0B&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0B&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0B
                                </div>
                                <div style={{ marginBottom: '8px' }}>
                                  <span style={{ color: '#ffff00' }}>core@{selectedNode.name}</span>
                                  <span style={{ color: '#ffffff' }}>:~$ </span>
                                  <span style={{ color: '#00ff00' }}>df -h | grep -E "(Filesystem|/var/lib/kubelet)"</span>
                                </div>
                                <div style={{ marginBottom: '8px', color: '#ffffff' }}>
                                  Filesystem&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Size&nbsp;&nbsp;Used&nbsp;&nbsp;Avail&nbsp;Use%&nbsp;Mounted on<br/>
                                  /dev/nvme0n1p4&nbsp;&nbsp;100G&nbsp;&nbsp;&nbsp;{Math.round(Math.random() * 40 + 20)}G&nbsp;&nbsp;&nbsp;&nbsp;{Math.round(Math.random() * 40 + 40)}G&nbsp;&nbsp;&nbsp;{Math.round(Math.random() * 30 + 30)}%&nbsp;&nbsp;/var/lib/kubelet
                                </div>
                                <div>
                                  <span style={{ color: '#ffff00' }}>core@{selectedNode.name}</span>
                                  <span style={{ color: '#ffffff' }}>:~$ </span>
                                  <span 
                                    style={{ 
                                      color: '#00ff00',
                                      animation: 'blink 1s infinite' 
                                    }}
                                  >
                                    |
                                  </span>
                                </div>
                                <style>
                                  {`
                                    @keyframes blink {
                                      0%, 50% { opacity: 1; }
                                      51%, 100% { opacity: 0; }
                                    }
                                  `}
                                </style>
                              </div>
                            </CardBody>
                          </Card>
                          <div style={{ marginTop: 'var(--pf-v5-global--spacer--md)' }}>
                            <Alert variant="info" title="Terminal Access">
                              This is a read-only terminal simulation showing typical node commands and output. 
                              For full terminal access, use <code>oc debug node/{selectedNode.name}</code> from your local terminal.
                            </Alert>
                          </div>
                        </div>
                      </Tab>
                    </Tabs>
                  </CardBody>
                </Card>
              ) : (
                <Card>
                  <CardBody>
                    <EmptyState>
                      <Title headingLevel="h3" size="lg">
                        No Node Selected
                      </Title>
                      <EmptyStateBody>
                        Select a node from the list to view detailed information.
                      </EmptyStateBody>
                    </EmptyState>
                  </CardBody>
                </Card>
              )}
            </GridItem>
          </Grid>
        </StackItem>
      </Stack>
    </PageSection>
  );
};

export default NodesDashboard;
