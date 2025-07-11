// Core Node-related TypeScript interfaces

export interface NodeCondition {
  type: string;
  status: string;
  lastTransitionTime: string;
  reason: string;
  message: string;
}

export interface NodeTaint {
  key: string;
  value?: string;
  effect: string;
  timeAdded?: string;
}

export interface NodeMetrics {
  cpu: {
    current: number;
    history: Array<{ timestamp: number; value: number }>;
  };
  memory: {
    current: number;
    history: Array<{ timestamp: number; value: number }>;
  };
}

export interface NodeAlert {
  severity: 'warning' | 'critical' | 'info';
  message: string;
  reason: string;
  timestamp: string;
  count: number;
  source: string;
}

export interface NodeEvent {
  type: 'Warning' | 'Normal';
  reason: string;
  message: string;
  timestamp: string;
  count: number;
}

export interface NodeLog {
  component: string;
  content: string;
  timestamp: string;
  level?: string;
}

export interface NodeDetail {
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

// Import dependencies from other type files
import { PodResource } from './pod';
import { NodeSystemInfo } from './system';
