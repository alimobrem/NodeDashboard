import * as React from 'react';
import { Grid, GridItem, Card, CardBody, Title } from '@patternfly/react-core';
import {
  ServerIcon,
  CheckCircleIcon,
  CubesIcon,
  ExclamationTriangleIcon,
} from '@patternfly/react-icons';

import type { NodeDetail } from '../../types';

interface NodeSummaryMetricsProps {
  nodes: NodeDetail[];
}

export const NodeSummaryMetrics: React.FC<NodeSummaryMetricsProps> = ({ nodes }) => {
  const readyNodes = nodes.filter((n) => n.status === 'Ready');
  const totalPods = nodes.reduce((sum, node) => sum + node.pods.length, 0);
  const needsAttention = nodes.filter(
    (n) => n.cordoned || n.drained || n.status === 'NotReady',
  ).length;

  return (
    <Grid hasGutter>
      <GridItem span={3}>
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

      <GridItem span={3}>
        <Card style={{ minHeight: '120px' }}>
          <CardBody style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <CheckCircleIcon style={{ color: '#3e8635', fontSize: '2rem' }} />
            </div>
            <Title headingLevel="h2" size="xl" style={{ color: '#3e8635' }}>
              {readyNodes.length}
            </Title>
            <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>Ready Nodes</div>
          </CardBody>
        </Card>
      </GridItem>

      <GridItem span={3}>
        <Card style={{ minHeight: '120px' }}>
          <CardBody style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <CubesIcon style={{ color: '#009639', fontSize: '2rem' }} />
            </div>
            <Title headingLevel="h2" size="xl" style={{ color: '#009639' }}>
              {totalPods}
            </Title>
            <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>Running Pods</div>
          </CardBody>
        </Card>
      </GridItem>

      <GridItem span={3}>
        <Card style={{ minHeight: '120px' }}>
          <CardBody style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <ExclamationTriangleIcon style={{ color: '#f0ab00', fontSize: '2rem' }} />
            </div>
            <Title headingLevel="h2" size="xl" style={{ color: '#f0ab00' }}>
              {needsAttention}
            </Title>
            <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>Needs Attention</div>
          </CardBody>
        </Card>
      </GridItem>
    </Grid>
  );
};

export default NodeSummaryMetrics;
