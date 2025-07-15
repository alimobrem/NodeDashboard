import React from 'react';
import {
  Grid,
  GridItem,
  Card,
  CardBody,
  Title,
} from '@patternfly/react-core';
import {
  ServerIcon,
  CheckCircleIcon,
  CubesIcon,
  ExclamationTriangleIcon,
} from '@patternfly/react-icons';
import '../NodesDashboard.css';

interface NodeSummaryMetricsProps {
  totalNodes: number;
  readyNodes: number;
  runningPods: number;
  needsAttention: number;
}

const NodeSummaryMetrics: React.FC<NodeSummaryMetricsProps> = ({
  totalNodes,
  readyNodes,
  runningPods,
  needsAttention,
}) => {
  return (
    <Grid hasGutter>
      <GridItem span={3}>
        <Card className="summary-card">
          <CardBody className="summary-card-body">
            <div className="summary-card-icon-container">
              <ServerIcon className="summary-card-icon summary-card-icon--primary" />
            </div>
            <Title headingLevel="h2" size="xl" className="summary-card-title--primary">
              {totalNodes}
            </Title>
            <div className="summary-card-subtitle">Total Nodes</div>
          </CardBody>
        </Card>
      </GridItem>

      <GridItem span={3}>
        <Card className="summary-card">
          <CardBody className="summary-card-body">
            <div className="summary-card-icon-container">
              <CheckCircleIcon className="summary-card-icon summary-card-icon--success" />
            </div>
            <Title headingLevel="h2" size="xl" className="summary-card-title--success">
              {readyNodes}
            </Title>
            <div className="summary-card-subtitle">Ready Nodes</div>
          </CardBody>
        </Card>
      </GridItem>

      <GridItem span={3}>
        <Card className="summary-card">
          <CardBody className="summary-card-body">
            <div className="summary-card-icon-container">
              <CubesIcon className="summary-card-icon summary-card-icon--running" />
            </div>
            <Title headingLevel="h2" size="xl" className="summary-card-title--running">
              {runningPods}
            </Title>
            <div className="summary-card-subtitle">Running Pods</div>
          </CardBody>
        </Card>
      </GridItem>

      <GridItem span={3}>
        <Card className="summary-card">
          <CardBody className="summary-card-body">
            <div className="summary-card-icon-container">
              <ExclamationTriangleIcon className="summary-card-icon summary-card-icon--warning" />
            </div>
            <Title headingLevel="h2" size="xl" className="summary-card-title--warning">
              {needsAttention}
            </Title>
            <div className="summary-card-subtitle">Needs Attention</div>
          </CardBody>
        </Card>
      </GridItem>
    </Grid>
  );
};

export default NodeSummaryMetrics;
