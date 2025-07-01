import * as React from 'react';
import { useState, useEffect } from 'react';

// PatternFly Core Components
import {
  Alert,
  AlertVariant,
  Badge,
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  PageSection,
  Spinner,
  Title,
} from '@patternfly/react-core';

// PatternFly Table Components
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

// PatternFly Icons
import {
  CheckCircleIcon,
  ContainerNodeIcon,
  ExclamationTriangleIcon,
  SearchIcon,
} from '@patternfly/react-icons';

// Local interfaces
interface NodeDetails {
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
}

const NodesPage: React.FC = () => {
  const [nodes, setNodes] = useState<NodeDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNodeData = async (): Promise<NodeDetails[]> => {
    try {
      const response = await fetch('/api/kubernetes/api/v1/nodes');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Unable to connect to Kubernetes API`);
      }

      const data = await response.json();

      return data.items.map((node: any): NodeDetails => {
        const conditions = node.status?.conditions || [];
        const readyCondition = conditions.find((c: any) => c.type === 'Ready');

        const nodeInfo = node.status?.nodeInfo || {};
        const labels = node.metadata?.labels || {};

        // Determine node role
        const role = labels['node-role.kubernetes.io/control-plane']
          ? 'Control Plane'
          : labels['node-role.kubernetes.io/worker']
          ? 'Worker'
          : 'Unknown';

        return {
          name: node.metadata?.name || 'unknown',
          status: readyCondition?.status === 'True' ? 'Ready' : 'NotReady',
          role,
          version: nodeInfo.kubeletVersion || 'unknown',
          age: node.metadata?.creationTimestamp
            ? new Date(node.metadata.creationTimestamp).toLocaleDateString()
            : 'unknown',
          zone: labels['topology.kubernetes.io/zone'] || 'unknown',
          instanceType:
            labels['beta.kubernetes.io/instance-type'] ||
            labels['node.kubernetes.io/instance-type'] ||
            'unknown',
          operatingSystem: nodeInfo.osImage || 'unknown',
          architecture: nodeInfo.architecture || 'unknown',
          containerRuntime: nodeInfo.containerRuntimeVersion || 'unknown',
          cordoned: node.spec?.unschedulable === true,
          drained: false, // This would require additional API calls to determine
          labels,
          annotations: node.metadata?.annotations || {},
        };
      });
    } catch (error) {
      console.error('Error fetching node data:', error);
      throw error;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async (): Promise<void> => {
      if (!isMounted) return;

      setLoading(true);
      try {
        const nodeData = await fetchNodeData();

        if (isMounted) {
          setNodes(nodeData);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unable to fetch node data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Load data once - removed auto-refresh interval to prevent screen flashing
    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Ready':
        return '#3e8635';
      case 'NotReady':
        return '#c9190b';
      default:
        return '#6a6e73';
    }
  };

  const getStatusIcon = (status: string): React.ReactElement => {
    switch (status) {
      case 'Ready':
        return <CheckCircleIcon style={{ color: '#3e8635' }} />;
      case 'NotReady':
        return <ExclamationTriangleIcon style={{ color: '#c9190b' }} />;
      default:
        return <ExclamationTriangleIcon style={{ color: '#6a6e73' }} />;
    }
  };

  if (loading) {
    return (
      <PageSection>
        <Bullseye>
          <EmptyState>
            <Spinner size="xl" />
            <Title headingLevel="h2" size="lg">
              Loading Node Information...
            </Title>
            <EmptyStateBody>Fetching cluster node data from Kubernetes API...</EmptyStateBody>
          </EmptyState>
        </Bullseye>
      </PageSection>
    );
  }

  if (error) {
    return (
      <PageSection>
        <Alert variant={AlertVariant.danger} title="Unable to Load Node Data">
          <p>{error}</p>
          <p>
            Please check your cluster connection and ensure you have proper permissions to view node
            information.
          </p>
        </Alert>
      </PageSection>
    );
  }

  if (nodes.length === 0) {
    return (
      <PageSection>
        <EmptyState>
          <SearchIcon style={{ fontSize: '4rem', color: '#6a6e73' }} />
          <Title headingLevel="h2" size="lg">
            No Nodes Found
          </Title>
          <EmptyStateBody>
            No cluster nodes are currently available. This may indicate a connection issue or
            insufficient permissions.
          </EmptyStateBody>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <PageSection>
      <Title
        headingLevel="h1"
        size="2xl"
        style={{ marginBottom: 'var(--pf-v5-global--spacer--md)' }}
      >
        <ContainerNodeIcon
          style={{ marginRight: 'var(--pf-v5-global--spacer--sm)', color: '#0066cc' }}
        />
        Cluster Nodes ({nodes.length})
      </Title>

      <Table aria-label="Cluster Nodes Table" variant="compact">
        <Thead>
          <Tr>
            <Th>Node Name</Th>
            <Th>Status</Th>
            <Th>Role</Th>
            <Th>Version</Th>
            <Th>Age</Th>
            <Th>Zone</Th>
            <Th>Instance Type</Th>
            <Th>OS</Th>
            <Th>Architecture</Th>
          </Tr>
        </Thead>
        <Tbody>
          {nodes.map((node) => (
            <Tr key={node.name}>
              <Td dataLabel="Node Name">
                <div style={{ fontWeight: 600 }}>{node.name}</div>
                {node.cordoned && (
                  <Badge
                    screenReaderText="cordoned"
                    style={{ backgroundColor: '#f0ab00', color: '#151515', marginTop: '4px' }}
                  >
                    Cordoned
                  </Badge>
                )}
              </Td>
              <Td dataLabel="Status">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getStatusIcon(node.status)}
                  <span style={{ color: getStatusColor(node.status), fontWeight: 600 }}>
                    {node.status}
                  </span>
                </div>
              </Td>
              <Td dataLabel="Role">
                <Badge
                  screenReaderText={node.role}
                  style={{
                    backgroundColor: node.role === 'Control Plane' ? '#0066cc' : '#8a2be2',
                    color: 'white',
                  }}
                >
                  {node.role}
                </Badge>
              </Td>
              <Td dataLabel="Version">{node.version}</Td>
              <Td dataLabel="Age">{node.age}</Td>
              <Td dataLabel="Zone">{node.zone}</Td>
              <Td dataLabel="Instance Type">{node.instanceType}</Td>
              <Td dataLabel="OS">{node.operatingSystem}</Td>
              <Td dataLabel="Architecture">{node.architecture}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </PageSection>
  );
};

export default NodesPage;
