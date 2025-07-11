export interface NodeDebugData {
  alerts: NodeDebugAlert[];
  logs: NodeDebugLog[];
  systemInfo: NodeDebugSystemInfo;
  networkStatus: Record<string, unknown>;
  resourcePressure: Record<string, unknown>;
}

export interface NodeDebugAlert {
  severity: 'warning' | 'critical' | 'info';
  message: string;
  reason: string;
  timestamp: string;
  count: number;
  source: string;
}

export interface NodeDebugLog {
  component: string;
  content: string;
  timestamp: string;
  level: string;
}

export interface NodeDebugSystemInfo {
  filesystem: Record<string, unknown>;
  runtime: Record<string, unknown>;
  rlimit: Record<string, unknown>;
}

export interface KubernetesEvent {
  type: 'Warning' | 'Normal';
  message: string;
  reason: string;
  firstTimestamp?: string;
  eventTime?: string;
  count?: number;
  source?: {
    component?: string;
  };
}

export interface KubernetesPod {
  metadata: {
    name: string;
  };
  status: {
    phase: string;
  };
}

export interface LogSource {
  path: string;
  name: string;
  files: string[];
}
