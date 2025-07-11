import * as React from 'react';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

import type {
  NodeDetail,
  NodeCondition,
  NodeMetrics,
  NodeEvent,
  NodeAlert,
  NodeLog,
  NodeSystemInfo,
  NodeResource,
  PodResource as K8sPodResource,
} from '../types';

import type { PodResource } from '../types/pod';
import { getAge } from '../utils';

// Resource configurations for useK8sWatchResource
const nodeResource = {
  groupVersionKind: {
    group: '',
    version: 'v1',
    kind: 'Node',
  },
  namespaced: false,
};

const podResource = {
  groupVersionKind: {
    group: '',
    version: 'v1',
    kind: 'Pod',
  },
  namespaced: false,
};

const eventResource = {
  groupVersionKind: {
    group: '',
    version: 'v1',
    kind: 'Event',
  },
  namespaced: false,
};

interface UseNodeDataReturn {
  nodes: NodeDetail[];
  loading: boolean;
  error: string | null;
}

export const useNodeData = (): UseNodeDataReturn => {
  const [nodes, setNodes] = React.useState<NodeDetail[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Watch Kubernetes resources
  const [watchedNodes, nodesLoaded, nodesError] = useK8sWatchResource(nodeResource);
  const [watchedPods, podsLoaded, podsError] = useK8sWatchResource(podResource);
  const [watchedEvents, eventsLoaded, eventsError] = useK8sWatchResource(eventResource);

  // Mock debug data fetcher (in real implementation, this would be actual API calls)
  const fetchNodeDebugData = React.useCallback(async (_nodeName: string) => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      alerts: [] as NodeAlert[],
      logs: [] as NodeLog[],
      systemInfo: {
        filesystem: {},
        runtime: { imageFs: {} },
        rlimit: {},
      } as NodeSystemInfo,
    };
  }, []);

  // Process node data function
  const processNodeData = React.useCallback(
    (
      nodeData: NodeResource,
      nodePods: K8sPodResource[],
      nodeEvents: any[],
      _nodeMetrics?: any,
      debugData?: Record<string, unknown>,
    ): NodeDetail => {
      const metadata = nodeData.metadata;
      const labels = metadata.labels || {};
      const annotations = metadata.annotations || {};

      // Extract role
      const role = labels['node-role.kubernetes.io/control-plane']
        ? 'control-plane'
        : labels['node-role.kubernetes.io/worker']
        ? 'worker'
        : labels['node-role.kubernetes.io/master']
        ? 'master'
        : 'worker';

      // Extract status
      const readyCondition = nodeData.status?.conditions?.find((c: any) => c.type === 'Ready');
      const status = readyCondition?.status === 'True' ? 'Ready' : 'NotReady';

      // Extract version
      const version = nodeData.status?.nodeInfo?.kubeletVersion || 'Unknown';

      // Calculate age
      const age = getAge(nodeData.metadata.creationTimestamp || '');

      // Extract system info
      const nodeInfo = nodeData.status?.nodeInfo || {};
      const operatingSystem = (nodeInfo as any).operatingSystem || 'Unknown';
      const architecture = (nodeInfo as any).architecture || 'Unknown';
      const containerRuntime = (nodeInfo as any).containerRuntimeVersion || 'Unknown';

      // Check cordoned/drained status
      const cordoned = nodeData.spec?.unschedulable === true;
      const drained = annotations['node.alpha.kubernetes.io/ttl'] === '0';

      // Extract allocatable resources
      const allocatable = nodeData.status?.allocatable || {};
      const allocatableResources = {
        cpu: allocatable.cpu || '0',
        memory: allocatable.memory || '0Gi',
        pods: allocatable.pods || '0',
      };

      // Extract network information
      const networkInfo = {
        internalIP: nodeData.status?.addresses?.find((addr: any) => addr.type === 'InternalIP')
          ?.address,
        externalIP: nodeData.status?.addresses?.find((addr: any) => addr.type === 'ExternalIP')
          ?.address,
        hostname: nodeData.status?.addresses?.find((addr: any) => addr.type === 'Hostname')
          ?.address,
      };

      // Extract taints
      const taints = (nodeData.spec?.taints || []).map((taint: any) => ({
        key: taint.key,
        value: taint.value,
        effect: taint.effect,
        timeAdded: taint.timeAdded,
      }));

      // Process conditions
      const conditions: NodeCondition[] = (nodeData.status?.conditions || []).map(
        (condition: any) => ({
          type: condition.type,
          status: condition.status,
          lastTransitionTime: condition.lastTransitionTime,
          reason: condition.reason || '',
          message: condition.message || '',
        }),
      );

      // Calculate metrics (simplified version)
      const calculateNodeMetrics = (pods: any[], _allocatable: any): NodeMetrics => {
        const cpuUsed = pods.reduce((sum, pod) => sum + (pod.cpuUsage || 0), 0);
        const memoryUsed = pods.reduce((sum, pod) => sum + (pod.memoryUsage || 0), 0);

        const cpuCurrent = Math.min(95, Math.max(5, cpuUsed));
        const memoryCurrent = Math.min(95, Math.max(5, memoryUsed));

        const generateHistory = (currentValue: number) => {
          return Array.from({ length: 20 }, (_, i) => ({
            timestamp: Date.now() - (19 - i) * 60000,
            value: Math.max(0, currentValue + (Math.random() - 0.5) * 20),
          }));
        };

        return {
          cpu: {
            current: cpuCurrent,
            history: generateHistory(cpuCurrent),
          },
          memory: {
            current: memoryCurrent,
            history: generateHistory(memoryCurrent),
          },
        };
      };

      const metrics = calculateNodeMetrics(nodePods, allocatable);

      // Process pods
      const pods: PodResource[] = nodePods.map((pod: any) => ({
        name: pod.metadata?.name || 'Unknown',
        namespace: pod.metadata?.namespace || 'default',
        status: pod.status?.phase || 'Unknown',
        cpuUsage: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        restarts: pod.status?.containerStatuses?.[0]?.restartCount || 0,
        age: getAge(pod.metadata?.creationTimestamp || ''),
        containers: pod.spec?.containers?.length || 0,
        readyContainers: pod.status?.containerStatuses?.filter((c: any) => c.ready).length || 0,
      }));

      // Process events
      const events: NodeEvent[] = nodeEvents.map((event: any) => ({
        type: event.type || 'Normal',
        reason: event.reason || '',
        message: event.message || '',
        timestamp: event.firstTimestamp || event.eventTime || '',
        count: event.count || 1,
      }));

      // Determine resource pressure
      const resourcePressure = {
        memory: conditions.some((c) => c.type === 'MemoryPressure' && c.status === 'True'),
        disk: conditions.some((c) => c.type === 'DiskPressure' && c.status === 'True'),
        pid: conditions.some((c) => c.type === 'PIDPressure' && c.status === 'True'),
      };

      return {
        name: metadata.name || 'Unknown',
        role,
        status,
        version,
        age,
        uptime: getAge(readyCondition?.lastTransitionTime || metadata.creationTimestamp || ''),
        zone: labels['topology.kubernetes.io/zone'] || 'Unknown',
        instanceType: labels['node.kubernetes.io/instance-type'] || 'Unknown',
        operatingSystem,
        architecture,
        containerRuntime,
        cordoned,
        drained,
        labels,
        annotations,
        allocatableResources,
        conditions,
        metrics,
        pods,
        events,
        // Enhanced debugging information
        alerts: (debugData?.alerts as NodeAlert[]) || [],
        logs: (debugData?.logs as NodeLog[]) || [],
        systemInfo: (debugData?.systemInfo as NodeSystemInfo) || {
          filesystem: {},
          runtime: { imageFs: {} },
          rlimit: {},
        },
        taints: taints,
        resourcePressure: resourcePressure,
        networkInfo: networkInfo,
      };
    },
    [],
  );

  // Process watched data into our enhanced node format
  const processWatchedData = React.useCallback(async () => {
    if (!nodesLoaded || !podsLoaded || !eventsLoaded) {
      setLoading(true);
      return;
    }

    if (nodesError || podsError || eventsError) {
      setError('Failed to connect to the OpenShift API. Please check your connection.');
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Process data with enhanced debugging info
      const nodesArray = watchedNodes
        ? Array.isArray(watchedNodes)
          ? watchedNodes
          : [watchedNodes]
        : [];
      const podsArray = watchedPods
        ? Array.isArray(watchedPods)
          ? watchedPods
          : [watchedPods]
        : [];
      const eventsArray = watchedEvents
        ? Array.isArray(watchedEvents)
          ? watchedEvents
          : [watchedEvents]
        : [];

      const processedNodes = await Promise.all(
        nodesArray.map(async (nodeData: any) => {
          const nodePods = podsArray.filter(
            (pod: any) => pod.spec.nodeName === nodeData.metadata.name,
          ) as K8sPodResource[];
          const nodeEvents = eventsArray.filter(
            (event: any) =>
              event.involvedObject?.name === nodeData.metadata.name &&
              event.involvedObject?.kind === 'Node',
          ) as any[];

          // Fetch additional debugging data for this node
          const debugData = await fetchNodeDebugData(nodeData.metadata.name);

          return processNodeData(nodeData, nodePods, nodeEvents, undefined, debugData);
        }),
      );

      setNodes(processedNodes);
      setLoading(false);
    } catch (error) {
      console.error('Error processing watched node data:', error);
      setError('Failed to process node data. Please check your connection.');
      setLoading(false);
    }
  }, [
    watchedNodes,
    watchedPods,
    watchedEvents,
    nodesLoaded,
    podsLoaded,
    eventsLoaded,
    nodesError,
    podsError,
    eventsError,
    fetchNodeDebugData,
    processNodeData,
  ]);

  React.useEffect(() => {
    processWatchedData();
  }, [processWatchedData]);

  return {
    nodes,
    loading,
    error,
  };
};
