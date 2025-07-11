// Pod-related TypeScript interfaces

export interface PodResource {
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
