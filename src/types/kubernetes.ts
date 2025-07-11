// Kubernetes API types to replace 'any' usage

export interface KubernetesResource {
  apiVersion: string;
  kind: string;
  metadata: KubernetesMetadata;
}

export interface KubernetesMetadata {
  name: string;
  namespace?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  creationTimestamp?: string;
  resourceVersion?: string;
  uid?: string;
  generation?: number;
  deletionTimestamp?: string;
  finalizers?: string[];
  ownerReferences?: KubernetesOwnerReference[];
}

export interface KubernetesOwnerReference {
  apiVersion: string;
  kind: string;
  name: string;
  uid: string;
  controller?: boolean;
  blockOwnerDeletion?: boolean;
}

export interface NodeResource extends KubernetesResource {
  kind: 'Node';
  spec: NodeSpec;
  status: NodeStatus;
}

export interface NodeSpec {
  podCIDR?: string;
  podCIDRs?: string[];
  providerID?: string;
  unschedulable?: boolean;
  taints?: NodeTaint[];
  configSource?: NodeConfigSource;
}

export interface NodeTaint {
  key: string;
  value?: string;
  effect: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
  timeAdded?: string;
}

export interface NodeConfigSource {
  configMap?: ConfigMapNodeConfigSource;
}

export interface ConfigMapNodeConfigSource {
  name: string;
  namespace: string;
  uid?: string;
  resourceVersion?: string;
  kubeletConfigKey: string;
}

export interface NodeStatus {
  capacity?: NodeResourceList;
  allocatable?: NodeResourceList;
  phase?: string;
  conditions?: NodeCondition[];
  addresses?: NodeAddress[];
  daemonEndpoints?: NodeDaemonEndpoints;
  nodeInfo?: NodeSystemInfo;
  images?: ContainerImage[];
  volumesInUse?: string[];
  volumesAttached?: AttachedVolume[];
  config?: NodeConfigStatus;
}

export interface NodeResourceList {
  cpu?: string;
  memory?: string;
  'ephemeral-storage'?: string;
  hugepages?: Record<string, string>;
  pods?: string;
  [key: string]: string | Record<string, string> | undefined;
}

export interface NodeCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  lastHeartbeatTime?: string;
  lastTransitionTime?: string;
  reason?: string;
  message?: string;
}

export interface NodeAddress {
  type: 'Hostname' | 'ExternalIP' | 'InternalIP' | 'ExternalDNS' | 'InternalDNS';
  address: string;
}

export interface NodeDaemonEndpoints {
  kubeletEndpoint?: DaemonEndpoint;
}

export interface DaemonEndpoint {
  Port: number;
}

export interface NodeSystemInfo {
  machineID: string;
  systemUUID: string;
  bootID: string;
  kernelVersion: string;
  osImage: string;
  containerRuntimeVersion: string;
  kubeletVersion: string;
  kubeProxyVersion: string;
  operatingSystem: string;
  architecture: string;
}

export interface ContainerImage {
  names: string[];
  sizeBytes?: number;
}

export interface AttachedVolume {
  name: string;
  devicePath: string;
}

export interface NodeConfigStatus {
  assigned?: NodeConfigSource;
  active?: NodeConfigSource;
  lastKnownGood?: NodeConfigSource;
  error?: string;
}

// Pod-related types
export interface PodResource extends KubernetesResource {
  kind: 'Pod';
  spec: PodSpec;
  status: PodStatus;
}

export interface PodSpec {
  containers: Container[];
  restartPolicy?: 'Always' | 'OnFailure' | 'Never';
  terminationGracePeriodSeconds?: number;
  activeDeadlineSeconds?: number;
  dnsPolicy?: 'ClusterFirst' | 'Default' | 'None' | 'ClusterFirstWithHostNet';
  nodeSelector?: Record<string, string>;
  serviceAccountName?: string;
  serviceAccount?: string;
  automountServiceAccountToken?: boolean;
  nodeName?: string;
  hostNetwork?: boolean;
  hostPID?: boolean;
  hostIPC?: boolean;
  shareProcessNamespace?: boolean;
  securityContext?: PodSecurityContext;
  imagePullSecrets?: LocalObjectReference[];
  hostname?: string;
  subdomain?: string;
  affinity?: Affinity;
  schedulerName?: string;
  tolerations?: Toleration[];
  hostAliases?: HostAlias[];
  priorityClassName?: string;
  priority?: number;
  runtimeClassName?: string;
  enableServiceLinks?: boolean;
  preemptionPolicy?: string;
  overhead?: ResourceRequirements;
  topologySpreadConstraints?: TopologySpreadConstraint[];
  setHostnameAsFQDN?: boolean;
  os?: PodOS;
  hostUsers?: boolean;
  schedulingGates?: PodSchedulingGate[];
  resourceClaims?: PodResourceClaim[];
  volumes?: Volume[];
  initContainers?: Container[];
  ephemeralContainers?: EphemeralContainer[];
  readinessGates?: PodReadinessGate[];
  dnsConfig?: PodDNSConfig;
}

export interface Container {
  name: string;
  image?: string;
  command?: string[];
  args?: string[];
  workingDir?: string;
  ports?: ContainerPort[];
  envFrom?: EnvFromSource[];
  env?: EnvVar[];
  resources?: ResourceRequirements;
  volumeMounts?: VolumeMount[];
  volumeDevices?: VolumeDevice[];
  livenessProbe?: Probe;
  readinessProbe?: Probe;
  startupProbe?: Probe;
  lifecycle?: Lifecycle;
  terminationMessagePath?: string;
  terminationMessagePolicy?: string;
  imagePullPolicy?: 'Always' | 'Never' | 'IfNotPresent';
  securityContext?: SecurityContext;
  stdin?: boolean;
  stdinOnce?: boolean;
  tty?: boolean;
  restartPolicy?: 'Always' | 'OnFailure' | 'Never';
}

export interface PodStatus {
  phase?: 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'Unknown';
  conditions?: PodCondition[];
  message?: string;
  reason?: string;
  nominatedNodeName?: string;
  hostIP?: string;
  podIP?: string;
  podIPs?: PodIP[];
  startTime?: string;
  initContainerStatuses?: ContainerStatus[];
  containerStatuses?: ContainerStatus[];
  ephemeralContainerStatuses?: ContainerStatus[];
  qosClass?: 'Guaranteed' | 'Burstable' | 'BestEffort';
  resize?: 'Proposed' | 'InProgress' | 'Deferred' | 'Infeasible';
  resourceClaimStatuses?: PodResourceClaimStatus[];
  hostIPs?: HostIP[];
}

export interface PodCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  lastProbeTime?: string;
  lastTransitionTime?: string;
  reason?: string;
  message?: string;
}

export interface ContainerStatus {
  name: string;
  state?: ContainerState;
  lastState?: ContainerState;
  ready: boolean;
  restartCount: number;
  image: string;
  imageID: string;
  containerID?: string;
  started?: boolean;
  allocatedResources?: ResourceRequirements;
  resources?: ResourceRequirements;
  volumeMounts?: VolumeMountStatus[];
  user?: ContainerUser;
}

export interface ContainerState {
  waiting?: ContainerStateWaiting;
  running?: ContainerStateRunning;
  terminated?: ContainerStateTerminated;
}

export interface ContainerStateWaiting {
  reason?: string;
  message?: string;
}

export interface ContainerStateRunning {
  startedAt?: string;
}

export interface ContainerStateTerminated {
  exitCode: number;
  signal?: number;
  reason?: string;
  message?: string;
  startedAt?: string;
  finishedAt?: string;
  containerID?: string;
}

// Metrics types
export interface NodeMetrics extends KubernetesResource {
  kind: 'NodeMetrics';
  timestamp: string;
  window: string;
  usage: NodeResourceUsage;
}

export interface NodeResourceUsage {
  cpu: string;
  memory: string;
  [key: string]: string;
}

export interface PodMetrics extends KubernetesResource {
  kind: 'PodMetrics';
  timestamp: string;
  window: string;
  containers: ContainerMetrics[];
}

export interface ContainerMetrics {
  name: string;
  usage: ContainerResourceUsage;
}

export interface ContainerResourceUsage {
  cpu: string;
  memory: string;
  [key: string]: string;
}

// API Response types
export interface KubernetesListResponse<T> {
  kind: string;
  apiVersion: string;
  metadata: {
    resourceVersion: string;
    continue?: string;
    remainingItemCount?: number;
  };
  items: T[];
}

export interface KubernetesAPIError {
  kind: 'Status';
  apiVersion: string;
  metadata: Record<string, unknown>;
  status: 'Failure';
  message: string;
  reason: string;
  code: number;
}

// Utility types
export type NodeListResponse = KubernetesListResponse<NodeResource>;
export type PodListResponse = KubernetesListResponse<PodResource>;
export type NodeMetricsResponse = KubernetesListResponse<NodeMetrics>;
export type PodMetricsResponse = KubernetesListResponse<PodMetrics>;

// Additional helper types for complex nested structures
export interface ResourceRequirements {
  limits?: Record<string, string>;
  requests?: Record<string, string>;
  claims?: ResourceClaim[];
}

export interface ResourceClaim {
  name: string;
  request?: string;
}

export interface LocalObjectReference {
  name: string;
}

export interface PodSecurityContext {
  seLinuxOptions?: SELinuxOptions;
  windowsOptions?: WindowsSecurityContextOptions;
  runAsUser?: number;
  runAsGroup?: number;
  runAsNonRoot?: boolean;
  supplementalGroups?: number[];
  fsGroup?: number;
  seccompProfile?: SeccompProfile;
  fsGroupChangePolicy?: string;
  sysctls?: Sysctl[];
}

export interface SELinuxOptions {
  user?: string;
  role?: string;
  type?: string;
  level?: string;
}

export interface WindowsSecurityContextOptions {
  gmsaCredentialSpecName?: string;
  gmsaCredentialSpec?: string;
  runAsUserName?: string;
  hostProcess?: boolean;
}

export interface SeccompProfile {
  type: string;
  localhostProfile?: string;
}

export interface Sysctl {
  name: string;
  value: string;
}

export interface Affinity {
  nodeAffinity?: NodeAffinity;
  podAffinity?: PodAffinity;
  podAntiAffinity?: PodAntiAffinity;
}

export interface NodeAffinity {
  requiredDuringSchedulingIgnoredDuringExecution?: NodeSelector;
  preferredDuringSchedulingIgnoredDuringExecution?: PreferredSchedulingTerm[];
}

export interface NodeSelector {
  nodeSelectorTerms: NodeSelectorTerm[];
}

export interface NodeSelectorTerm {
  matchExpressions?: NodeSelectorRequirement[];
  matchFields?: NodeSelectorRequirement[];
}

export interface NodeSelectorRequirement {
  key: string;
  operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist' | 'Gt' | 'Lt';
  values?: string[];
}

export interface PreferredSchedulingTerm {
  weight: number;
  preference: NodeSelectorTerm;
}

export interface PodAffinity {
  requiredDuringSchedulingIgnoredDuringExecution?: PodAffinityTerm[];
  preferredDuringSchedulingIgnoredDuringExecution?: WeightedPodAffinityTerm[];
}

export interface PodAntiAffinity {
  requiredDuringSchedulingIgnoredDuringExecution?: PodAffinityTerm[];
  preferredDuringSchedulingIgnoredDuringExecution?: WeightedPodAffinityTerm[];
}

export interface PodAffinityTerm {
  labelSelector?: LabelSelector;
  namespaces?: string[];
  topologyKey: string;
  namespaceSelector?: LabelSelector;
  matchLabelKeys?: string[];
  mismatchLabelKeys?: string[];
}

export interface WeightedPodAffinityTerm {
  weight: number;
  podAffinityTerm: PodAffinityTerm;
}

export interface LabelSelector {
  matchLabels?: Record<string, string>;
  matchExpressions?: LabelSelectorRequirement[];
}

export interface LabelSelectorRequirement {
  key: string;
  operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist';
  values?: string[];
}

export interface Toleration {
  key?: string;
  operator?: 'Exists' | 'Equal';
  value?: string;
  effect?: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
  tolerationSeconds?: number;
}

export interface HostAlias {
  ip: string;
  hostnames: string[];
}

export interface TopologySpreadConstraint {
  maxSkew: number;
  topologyKey: string;
  whenUnsatisfiable: 'DoNotSchedule' | 'ScheduleAnyway';
  labelSelector?: LabelSelector;
  minDomains?: number;
  nodeAffinityPolicy?: string;
  nodeTaintsPolicy?: string;
  matchLabelKeys?: string[];
}

export interface PodOS {
  name: string;
}

export interface PodSchedulingGate {
  name: string;
}

export interface PodResourceClaim {
  name: string;
  source?: ClaimSource;
}

export interface ClaimSource {
  resourceClaimName?: string;
  resourceClaimTemplateName?: string;
}

export interface Volume {
  name: string;
  hostPath?: HostPathVolumeSource;
  emptyDir?: EmptyDirVolumeSource;
  gcePersistentDisk?: GCEPersistentDiskVolumeSource;
  awsElasticBlockStore?: AWSElasticBlockStoreVolumeSource;
  gitRepo?: GitRepoVolumeSource;
  secret?: SecretVolumeSource;
  nfs?: NFSVolumeSource;
  iscsi?: ISCSIVolumeSource;
  glusterfs?: GlusterfsVolumeSource;
  persistentVolumeClaim?: PersistentVolumeClaimVolumeSource;
  rbd?: RBDVolumeSource;
  flexVolume?: FlexVolumeSource;
  cinder?: CinderVolumeSource;
  cephfs?: CephFSVolumeSource;
  flocker?: FlockerVolumeSource;
  downwardAPI?: DownwardAPIVolumeSource;
  fc?: FCVolumeSource;
  azureFile?: AzureFileVolumeSource;
  configMap?: ConfigMapVolumeSource;
  vsphereVolume?: VsphereVirtualDiskVolumeSource;
  quobyte?: QuobyteVolumeSource;
  azureDisk?: AzureDiskVolumeSource;
  photonPersistentDisk?: PhotonPersistentDiskVolumeSource;
  projected?: ProjectedVolumeSource;
  portworxVolume?: PortworxVolumeSource;
  scaleIO?: ScaleIOVolumeSource;
  storageos?: StorageOSVolumeSource;
  csi?: CSIVolumeSource;
  ephemeral?: EphemeralVolumeSource;
  [key: string]: any;
}

export interface HostPathVolumeSource {
  path: string;
  type?: string;
}

export interface EmptyDirVolumeSource {
  medium?: string;
  sizeLimit?: string;
}

export interface GCEPersistentDiskVolumeSource {
  pdName: string;
  fsType?: string;
  partition?: number;
  readOnly?: boolean;
}

export interface AWSElasticBlockStoreVolumeSource {
  volumeID: string;
  fsType?: string;
  partition?: number;
  readOnly?: boolean;
}

export interface GitRepoVolumeSource {
  repository: string;
  revision?: string;
  directory?: string;
}

export interface SecretVolumeSource {
  secretName?: string;
  items?: KeyToPath[];
  defaultMode?: number;
  optional?: boolean;
}

export interface KeyToPath {
  key: string;
  path: string;
  mode?: number;
}

export interface NFSVolumeSource {
  server: string;
  path: string;
  readOnly?: boolean;
}

export interface ISCSIVolumeSource {
  targetPortal: string;
  iqn: string;
  lun: number;
  iscsiInterface?: string;
  fsType?: string;
  readOnly?: boolean;
  portals?: string[];
  chapAuthDiscovery?: boolean;
  chapAuthSession?: boolean;
  secretRef?: LocalObjectReference;
  initiatorName?: string;
}

export interface GlusterfsVolumeSource {
  endpoints: string;
  path: string;
  readOnly?: boolean;
}

export interface PersistentVolumeClaimVolumeSource {
  claimName: string;
  readOnly?: boolean;
}

export interface RBDVolumeSource {
  monitors: string[];
  image: string;
  fsType?: string;
  pool?: string;
  user?: string;
  keyring?: string;
  secretRef?: LocalObjectReference;
  readOnly?: boolean;
}

export interface FlexVolumeSource {
  driver: string;
  fsType?: string;
  secretRef?: LocalObjectReference;
  readOnly?: boolean;
  options?: Record<string, string>;
}

export interface CinderVolumeSource {
  volumeID: string;
  fsType?: string;
  readOnly?: boolean;
  secretRef?: LocalObjectReference;
}

export interface CephFSVolumeSource {
  monitors: string[];
  path?: string;
  user?: string;
  secretFile?: string;
  secretRef?: LocalObjectReference;
  readOnly?: boolean;
}

export interface FlockerVolumeSource {
  datasetName?: string;
  datasetUUID?: string;
}

export interface DownwardAPIVolumeSource {
  items?: DownwardAPIVolumeFile[];
  defaultMode?: number;
}

export interface DownwardAPIVolumeFile {
  path: string;
  fieldRef?: ObjectFieldSelector;
  resourceFieldRef?: ResourceFieldSelector;
  mode?: number;
}

export interface ObjectFieldSelector {
  apiVersion?: string;
  fieldPath: string;
}

export interface ResourceFieldSelector {
  containerName?: string;
  resource: string;
  divisor?: string;
}

export interface FCVolumeSource {
  targetWWNs?: string[];
  lun?: number;
  fsType?: string;
  readOnly?: boolean;
  wwids?: string[];
}

export interface AzureFileVolumeSource {
  secretName: string;
  shareName: string;
  readOnly?: boolean;
}

export interface ConfigMapVolumeSource {
  name?: string;
  items?: KeyToPath[];
  defaultMode?: number;
  optional?: boolean;
}

export interface VsphereVirtualDiskVolumeSource {
  volumePath: string;
  fsType?: string;
  storagePolicyName?: string;
  storagePolicyID?: string;
}

export interface QuobyteVolumeSource {
  registry: string;
  volume: string;
  readOnly?: boolean;
  user?: string;
  group?: string;
  tenant?: string;
}

export interface AzureDiskVolumeSource {
  diskName: string;
  diskURI: string;
  cachingMode?: string;
  fsType?: string;
  readOnly?: boolean;
  kind?: string;
}

export interface PhotonPersistentDiskVolumeSource {
  pdID: string;
  fsType?: string;
}

export interface ProjectedVolumeSource {
  sources: VolumeProjection[];
  defaultMode?: number;
}

export interface VolumeProjection {
  secret?: SecretProjection;
  downwardAPI?: DownwardAPIProjection;
  configMap?: ConfigMapProjection;
  serviceAccountToken?: ServiceAccountTokenProjection;
  clusterTrustBundle?: ClusterTrustBundleProjection;
}

export interface SecretProjection {
  name?: string;
  items?: KeyToPath[];
  optional?: boolean;
}

export interface DownwardAPIProjection {
  items?: DownwardAPIVolumeFile[];
}

export interface ConfigMapProjection {
  name?: string;
  items?: KeyToPath[];
  optional?: boolean;
}

export interface ServiceAccountTokenProjection {
  audience?: string;
  expirationSeconds?: number;
  path: string;
}

export interface ClusterTrustBundleProjection {
  name?: string;
  signerName?: string;
  labelSelector?: LabelSelector;
  optional?: boolean;
  path: string;
}

export interface PortworxVolumeSource {
  volumeID: string;
  fsType?: string;
  readOnly?: boolean;
}

export interface ScaleIOVolumeSource {
  gateway: string;
  system: string;
  secretRef: LocalObjectReference;
  sslEnabled?: boolean;
  protectionDomain?: string;
  storagePool?: string;
  storageMode?: string;
  volumeName?: string;
  fsType?: string;
  readOnly?: boolean;
}

export interface StorageOSVolumeSource {
  volumeName?: string;
  volumeNamespace?: string;
  fsType?: string;
  readOnly?: boolean;
  secretRef?: LocalObjectReference;
}

export interface CSIVolumeSource {
  driver: string;
  readOnly?: boolean;
  fsType?: string;
  volumeAttributes?: Record<string, string>;
  nodePublishSecretRef?: LocalObjectReference;
}

export interface EphemeralVolumeSource {
  volumeClaimTemplate?: PersistentVolumeClaimTemplate;
}

export interface PersistentVolumeClaimTemplate {
  metadata?: KubernetesMetadata;
  spec: PersistentVolumeClaimSpec;
}

export interface PersistentVolumeClaimSpec {
  accessModes?: string[];
  selector?: LabelSelector;
  resources?: VolumeResourceRequirements;
  volumeName?: string;
  storageClassName?: string;
  volumeMode?: string;
  dataSource?: TypedLocalObjectReference;
  dataSourceRef?: TypedObjectReference;
  volumeAttributesClassName?: string;
}

export interface VolumeResourceRequirements {
  limits?: Record<string, string>;
  requests?: Record<string, string>;
}

export interface TypedLocalObjectReference {
  apiGroup?: string;
  kind: string;
  name: string;
}

export interface TypedObjectReference {
  apiGroup?: string;
  kind: string;
  name: string;
  namespace?: string;
}

export interface EphemeralContainer {
  name: string;
  image?: string;
  command?: string[];
  args?: string[];
  workingDir?: string;
  ports?: ContainerPort[];
  envFrom?: EnvFromSource[];
  env?: EnvVar[];
  resources?: ResourceRequirements;
  volumeMounts?: VolumeMount[];
  volumeDevices?: VolumeDevice[];
  livenessProbe?: Probe;
  readinessProbe?: Probe;
  startupProbe?: Probe;
  lifecycle?: Lifecycle;
  terminationMessagePath?: string;
  terminationMessagePolicy?: string;
  imagePullPolicy?: string;
  securityContext?: SecurityContext;
  stdin?: boolean;
  stdinOnce?: boolean;
  tty?: boolean;
  targetContainerName?: string;
}

export interface ContainerPort {
  name?: string;
  hostPort?: number;
  containerPort: number;
  protocol?: string;
  hostIP?: string;
}

export interface EnvFromSource {
  prefix?: string;
  configMapRef?: ConfigMapEnvSource;
  secretRef?: SecretEnvSource;
}

export interface ConfigMapEnvSource {
  name?: string;
  optional?: boolean;
}

export interface SecretEnvSource {
  name?: string;
  optional?: boolean;
}

export interface EnvVar {
  name: string;
  value?: string;
  valueFrom?: EnvVarSource;
}

export interface EnvVarSource {
  fieldRef?: ObjectFieldSelector;
  resourceFieldRef?: ResourceFieldSelector;
  configMapKeyRef?: ConfigMapKeySelector;
  secretKeyRef?: SecretKeySelector;
}

export interface ConfigMapKeySelector {
  name?: string;
  key: string;
  optional?: boolean;
}

export interface SecretKeySelector {
  name?: string;
  key: string;
  optional?: boolean;
}

export interface VolumeMount {
  name: string;
  readOnly?: boolean;
  mountPath: string;
  subPath?: string;
  mountPropagation?: string;
  subPathExpr?: string;
  recursiveReadOnly?: string;
}

export interface VolumeDevice {
  name: string;
  devicePath: string;
}

export interface Probe {
  exec?: ExecAction;
  httpGet?: HTTPGetAction;
  tcpSocket?: TCPSocketAction;
  grpc?: GRPCAction;
  initialDelaySeconds?: number;
  timeoutSeconds?: number;
  periodSeconds?: number;
  successThreshold?: number;
  failureThreshold?: number;
  terminationGracePeriodSeconds?: number;
}

export interface ExecAction {
  command?: string[];
}

export interface HTTPGetAction {
  path?: string;
  port: number | string;
  host?: string;
  scheme?: string;
  httpHeaders?: HTTPHeader[];
}

export interface HTTPHeader {
  name: string;
  value: string;
}

export interface TCPSocketAction {
  port: number | string;
  host?: string;
}

export interface GRPCAction {
  port: number;
  service?: string;
}

export interface Lifecycle {
  postStart?: LifecycleHandler;
  preStop?: LifecycleHandler;
}

export interface LifecycleHandler {
  exec?: ExecAction;
  httpGet?: HTTPGetAction;
  tcpSocket?: TCPSocketAction;
  sleep?: SleepAction;
}

export interface SleepAction {
  seconds: number;
}

export interface SecurityContext {
  capabilities?: Capabilities;
  privileged?: boolean;
  seLinuxOptions?: SELinuxOptions;
  windowsOptions?: WindowsSecurityContextOptions;
  runAsUser?: number;
  runAsGroup?: number;
  runAsNonRoot?: boolean;
  readOnlyRootFilesystem?: boolean;
  allowPrivilegeEscalation?: boolean;
  procMount?: string;
  seccompProfile?: SeccompProfile;
  appArmorProfile?: AppArmorProfile;
}

export interface Capabilities {
  add?: string[];
  drop?: string[];
}

export interface AppArmorProfile {
  type: string;
  localhostProfile?: string;
}

export interface PodReadinessGate {
  conditionType: string;
}

export interface PodDNSConfig {
  nameservers?: string[];
  searches?: string[];
  options?: PodDNSConfigOption[];
}

export interface PodDNSConfigOption {
  name?: string;
  value?: string;
}

export interface PodIP {
  ip?: string;
}

export interface PodResourceClaimStatus {
  name: string;
  resourceClaimName?: string;
}

export interface HostIP {
  ip?: string;
}

export interface VolumeMountStatus {
  name: string;
  mountPath: string;
  readOnly?: boolean;
  recursiveReadOnly?: string;
}

export interface ContainerUser {
  linux?: LinuxContainerUser;
  windows?: WindowsContainerUser;
}

export interface LinuxContainerUser {
  uid: number;
  gid: number;
  supplementalGroups?: number[];
}

export interface WindowsContainerUser {
  username: string;
}
