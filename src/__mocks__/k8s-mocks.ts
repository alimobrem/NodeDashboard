import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

// Extended types for testing
interface MockNode extends K8sResourceCommon {
  spec?: {
    podCIDR?: string;
    providerID?: string;
  };
  status?: {
    capacity?: Record<string, string>;
    allocatable?: Record<string, string>;
    conditions?: Array<{
      type: string;
      status: string;
      lastHeartbeatTime?: string;
      lastTransitionTime?: string;
      reason?: string;
      message?: string;
    }>;
    addresses?: Array<{
      type: string;
      address: string;
    }>;
    nodeInfo?: {
      machineID?: string;
      systemUUID?: string;
      bootID?: string;
      kernelVersion?: string;
      osImage?: string;
      containerRuntimeVersion?: string;
      kubeletVersion?: string;
      kubeProxyVersion?: string;
      operatingSystem?: string;
      architecture?: string;
    };
  };
}

interface MockPod extends K8sResourceCommon {
  spec?: {
    nodeName?: string;
    containers?: Array<{
      name: string;
      image: string;
      resources?: {
        requests?: Record<string, string>;
        limits?: Record<string, string>;
      };
    }>;
  };
  status?: {
    phase?: string;
    podIP?: string;
    hostIP?: string;
    conditions?: Array<{
      type: string;
      status: string;
      lastTransitionTime?: string;
    }>;
    containerStatuses?: Array<{
      name: string;
      ready: boolean;
      restartCount: number;
      state?: {
        running?: {
          startedAt: string;
        };
      };
    }>;
  };
}

// Mock Node data
export const mockNode: MockNode = {
  apiVersion: 'v1',
  kind: 'Node',
  metadata: {
    name: 'worker-node-1',
    labels: {
      'kubernetes.io/arch': 'amd64',
      'kubernetes.io/os': 'linux',
      'node-role.kubernetes.io/worker': '',
      'topology.kubernetes.io/zone': 'us-east-1a',
    },
    annotations: {
      'node.alpha.kubernetes.io/ttl': '0',
    },
    creationTimestamp: '2024-01-01T00:00:00Z',
  },
  spec: {
    podCIDR: '10.244.1.0/24',
    providerID: 'aws:///us-east-1a/i-1234567890abcdef0',
  },
  status: {
    capacity: {
      cpu: '4',
      memory: '16Gi',
      pods: '110',
      'ephemeral-storage': '100Gi',
    },
    allocatable: {
      cpu: '3800m',
      memory: '14Gi',
      pods: '110',
      'ephemeral-storage': '95Gi',
    },
    conditions: [
      {
        type: 'Ready',
        status: 'True',
        lastHeartbeatTime: '2024-01-02T12:00:00Z',
        lastTransitionTime: '2024-01-01T00:05:00Z',
        reason: 'KubeletReady',
        message: 'kubelet is posting ready status',
      },
      {
        type: 'MemoryPressure',
        status: 'False',
        lastHeartbeatTime: '2024-01-02T12:00:00Z',
        lastTransitionTime: '2024-01-01T00:00:00Z',
        reason: 'KubeletHasSufficientMemory',
        message: 'kubelet has sufficient memory available',
      },
      {
        type: 'DiskPressure',
        status: 'False',
        lastHeartbeatTime: '2024-01-02T12:00:00Z',
        lastTransitionTime: '2024-01-01T00:00:00Z',
        reason: 'KubeletHasNoDiskPressure',
        message: 'kubelet has no disk pressure',
      },
      {
        type: 'PIDPressure',
        status: 'False',
        lastHeartbeatTime: '2024-01-02T12:00:00Z',
        lastTransitionTime: '2024-01-01T00:00:00Z',
        reason: 'KubeletHasSufficientPID',
        message: 'kubelet has sufficient PID available',
      },
    ],
    addresses: [
      {
        type: 'InternalIP',
        address: '10.0.1.100',
      },
      {
        type: 'ExternalIP',
        address: '54.123.45.67',
      },
      {
        type: 'Hostname',
        address: 'worker-node-1',
      },
    ],
    nodeInfo: {
      machineID: '1234567890abcdef1234567890abcdef',
      systemUUID: '12345678-1234-1234-1234-123456789012',
      bootID: '12345678-1234-1234-1234-123456789012',
      kernelVersion: '5.4.0-74-generic',
      osImage: 'Red Hat Enterprise Linux CoreOS 4.8.2',
      containerRuntimeVersion: 'cri-o://1.21.2-3.rhaos4.8.git94e7e05.el8',
      kubeletVersion: 'v1.21.1',
      kubeProxyVersion: 'v1.21.1',
      operatingSystem: 'linux',
      architecture: 'amd64',
    },
  },
};

// Mock Pod data
export const mockPod: MockPod = {
  apiVersion: 'v1',
  kind: 'Pod',
  metadata: {
    name: 'test-pod-1',
    namespace: 'default',
    labels: {
      app: 'test-app',
    },
    creationTimestamp: '2024-01-01T00:00:00Z',
  },
  spec: {
    nodeName: 'worker-node-1',
    containers: [
      {
        name: 'test-container',
        image: 'nginx:latest',
        resources: {
          requests: {
            cpu: '100m',
            memory: '128Mi',
          },
          limits: {
            cpu: '200m',
            memory: '256Mi',
          },
        },
      },
    ],
  },
  status: {
    phase: 'Running',
    podIP: '10.244.1.5',
    hostIP: '10.0.1.100',
    conditions: [
      {
        type: 'Ready',
        status: 'True',
        lastTransitionTime: '2024-01-01T00:01:00Z',
      },
    ],
    containerStatuses: [
      {
        name: 'test-container',
        ready: true,
        restartCount: 0,
        state: {
          running: {
            startedAt: '2024-01-01T00:01:00Z',
          },
        },
      },
    ],
  },
};

// Mock metrics data
export const mockMetrics = {
  cpu: {
    timestamp: '2024-01-02T12:00:00Z',
    value: '2.5',
    unit: 'cores',
  },
  memory: {
    timestamp: '2024-01-02T12:00:00Z',
    value: '8Gi',
    unit: 'bytes',
  },
};

// Helper to create multiple mock nodes
export const createMockNodes = (count: number): MockNode[] => {
  return Array.from({ length: count }, (_, index) => ({
    ...mockNode,
    metadata: {
      ...mockNode.metadata,
      name: `worker-node-${index + 1}`,
    },
    status: {
      ...mockNode.status,
      addresses: [
        {
          type: 'InternalIP',
          address: `10.0.1.${100 + index}`,
        },
        {
          type: 'ExternalIP',
          address: `54.123.45.${67 + index}`,
        },
        {
          type: 'Hostname',
          address: `worker-node-${index + 1}`,
        },
      ],
    },
  }));
};

// Helper to create mock pods for a node
export const createMockPodsForNode = (nodeName: string, count: number): MockPod[] => {
  return Array.from({ length: count }, (_, index) => ({
    ...mockPod,
    metadata: {
      ...mockPod.metadata,
      name: `${nodeName}-pod-${index + 1}`,
    },
    spec: {
      ...mockPod.spec,
      nodeName,
    },
  }));
};

// Helper function to create a large number of nodes for performance testing
export const createLargeMockNodeDataset = (count: number): MockNode[] => {
  const nodes: MockNode[] = [];

  for (let i = 1; i <= count; i++) {
    const nodeIndex = i.toString().padStart(3, '0');
    const isWorker = i > 3; // First 3 are masters, rest are workers
    const zone = `zone-${(i % 3) + 1}`; // Distribute across 3 zones
    const ready = Math.random() > 0.1; // 90% of nodes are ready

    nodes.push({
      apiVersion: 'v1',
      kind: 'Node',
      metadata: {
        name: isWorker ? `worker-node-${nodeIndex}` : `master-node-${nodeIndex}`,
        uid: `node-uid-${nodeIndex}`,
        resourceVersion: '1000' + nodeIndex,
        creationTimestamp: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        ).toISOString(), // Random age up to 30 days
        labels: {
          ...(isWorker
            ? { 'node-role.kubernetes.io/worker': '' }
            : { 'node-role.kubernetes.io/master': '' }),
          'topology.kubernetes.io/zone': zone,
          'node.openshift.io/os_id': 'rhcos',
          'kubernetes.io/arch': 'amd64',
          'kubernetes.io/os': 'linux',
        },
        annotations: {
          'machine.openshift.io/machine': `openshift-machine-api/${
            isWorker ? 'worker' : 'master'
          }-${nodeIndex}`,
          'volumes.kubernetes.io/controller-managed-attach-detach': 'true',
        },
      },
      spec: {
        podCIDR: `10.${Math.floor(i / 255)}.${i % 255}.0/24`,
        providerID: `aws:///us-west-2${zone.slice(-1)}/${
          isWorker ? 'worker' : 'master'
        }-${nodeIndex}`,
      },
      status: {
        capacity: {
          cpu: `${isWorker ? 4 + (i % 8) : 8}`, // Workers: 4-11 CPUs, Masters: 8 CPUs
          memory: `${isWorker ? 8 + (i % 24) : 32}Gi`, // Workers: 8-31Gi, Masters: 32Gi
          pods: '110',
          'ephemeral-storage': `${100 + (i % 400)}Gi`,
        },
        allocatable: {
          cpu: `${isWorker ? 3.5 + (i % 8) * 0.8 : 7.5}`, // Slightly less than capacity
          memory: `${isWorker ? 7 + (i % 24) : 30}Gi`,
          pods: '110',
          'ephemeral-storage': `${90 + (i % 400)}Gi`,
        },
        conditions: [
          {
            type: 'Ready',
            status: ready ? 'True' : 'False',
            lastHeartbeatTime: new Date(Date.now() - Math.random() * 60000).toISOString(),
            lastTransitionTime: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            reason: ready ? 'KubeletReady' : 'KubeletNotReady',
            message: ready ? 'kubelet is posting ready status' : 'kubelet is not ready',
          },
          {
            type: 'MemoryPressure',
            status: Math.random() > 0.95 ? 'True' : 'False', // 5% chance of memory pressure
            lastHeartbeatTime: new Date().toISOString(),
            lastTransitionTime: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            reason: 'KubeletHasSufficientMemory',
            message: 'kubelet has sufficient memory available',
          },
          {
            type: 'DiskPressure',
            status: Math.random() > 0.98 ? 'True' : 'False', // 2% chance of disk pressure
            lastHeartbeatTime: new Date().toISOString(),
            lastTransitionTime: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            reason: 'KubeletHasNoDiskPressure',
            message: 'kubelet has no disk pressure',
          },
          {
            type: 'PIDPressure',
            status: 'False',
            lastHeartbeatTime: new Date().toISOString(),
            lastTransitionTime: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            reason: 'KubeletHasSufficientPID',
            message: 'kubelet has sufficient PID available',
          },
        ],
        addresses: [
          {
            type: 'InternalIP',
            address: `10.0.${Math.floor(i / 255)}.${i % 255}`,
          },
          {
            type: 'ExternalIP',
            address: `192.168.${Math.floor(i / 255)}.${i % 255}`,
          },
          {
            type: 'Hostname',
            address: isWorker ? `worker-node-${nodeIndex}` : `master-node-${nodeIndex}`,
          },
        ],
        nodeInfo: {
          machineID: `machine-id-${nodeIndex}`,
          systemUUID: `system-uuid-${nodeIndex}`,
          bootID: `boot-id-${nodeIndex}`,
          kernelVersion: '4.18.0-305.el8.x86_64',
          osImage: 'Red Hat Enterprise Linux CoreOS 4.8.14',
          containerRuntimeVersion: 'cri-o://1.21.6-6.rhaos4.8.git4bf9c72.el8',
          kubeletVersion: 'v1.21.8+ee73ea2',
          kubeProxyVersion: 'v1.21.8+ee73ea2',
          operatingSystem: 'linux',
          architecture: 'amd64',
        },
      },
    });
  }

  return nodes;
};

// Export mock node and pod types for testing
export type { MockNode, MockPod };
