import React from 'react';
import {
  Grid,
  GridItem,
  Card,
  CardBody,
  Title,
  Stack,
  StackItem,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import {
  ServerIcon,
  CheckCircleIcon,
  CubesIcon,
  ExclamationTriangleIcon,
  CpuIcon,
  MemoryIcon,
  DatabaseIcon,
  NetworkIcon,
} from '@patternfly/react-icons';
import '../NodesDashboard.css';

interface ClusterMetrics {
  totalCpu: {
    cores: number;
    utilizationPercent: number;
  };
  totalMemory: {
    totalGB: number;
    utilizationPercent: number;
  };
  totalStorage: {
    totalTB: number;
    utilizationPercent: number;
  };
  networkThroughput: {
    ingressMbps: number;
    egressMbps: number;
  };
}

interface NodeSummaryCardsProps {
  totalNodes: number;
  readyNodes: number;
  runningPods: number;
  needsAttention: number;
  clusterMetrics: ClusterMetrics;
}

const NodeSummaryCards: React.FC<NodeSummaryCardsProps> = ({
  totalNodes,
  readyNodes,
  runningPods,
  needsAttention,
  clusterMetrics,
}) => {
  return (
    <Stack hasGutter>
      {/* Node Status Row */}
      <StackItem>
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
      </StackItem>

      {/* Cluster Resources Row */}
      <StackItem>
        <Grid hasGutter>
          <GridItem span={3}>
            <Card className="summary-card">
              <CardBody className="summary-card-body">
                <div className="summary-card-icon-container">
                  <CpuIcon className="summary-card-icon summary-card-icon--cpu" />
                </div>
                <Flex direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>
                    <Title headingLevel="h2" size="xl" className="summary-card-title--cpu">
                      {clusterMetrics.totalCpu.cores}
                    </Title>
                    <div className="summary-card-subtitle">Total CPU Cores</div>
                  </FlexItem>
                  <FlexItem>
                    <div className="summary-card-utilization">
                      {clusterMetrics.totalCpu.utilizationPercent.toFixed(1)}% utilized
                    </div>
                  </FlexItem>
                </Flex>
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={3}>
            <Card className="summary-card">
              <CardBody className="summary-card-body">
                <div className="summary-card-icon-container">
                  <MemoryIcon className="summary-card-icon summary-card-icon--memory" />
                </div>
                <Flex direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>
                                         <Title headingLevel="h2" size="xl" className="summary-card-title--memory">
                       {Math.round(clusterMetrics.totalMemory.totalGB)}
                     </Title>
                    <div className="summary-card-subtitle">Total Memory (GB)</div>
                  </FlexItem>
                  <FlexItem>
                    <div className="summary-card-utilization">
                      {clusterMetrics.totalMemory.utilizationPercent.toFixed(1)}% utilized
                    </div>
                  </FlexItem>
                </Flex>
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={3}>
            <Card className="summary-card">
              <CardBody className="summary-card-body">
                <div className="summary-card-icon-container">
                  <DatabaseIcon className="summary-card-icon summary-card-icon--storage" />
                </div>
                <Flex direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>
                    <Title headingLevel="h2" size="xl" className="summary-card-title--storage">
                      {clusterMetrics.totalStorage.totalTB === 0 ? 'N/A' : clusterMetrics.totalStorage.totalTB}
                    </Title>
                    <div className="summary-card-subtitle">Total Storage (TB)</div>
                  </FlexItem>
                  <FlexItem>
                    <div className="summary-card-utilization">
                      {clusterMetrics.totalStorage.utilizationPercent === 0 ? 'Not available' : `${clusterMetrics.totalStorage.utilizationPercent.toFixed(1)}% utilized`}
                    </div>
                  </FlexItem>
                </Flex>
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={3}>
            <Card className="summary-card">
              <CardBody className="summary-card-body">
                <div className="summary-card-icon-container">
                  <NetworkIcon className="summary-card-icon summary-card-icon--network" />
                </div>
                <Flex direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>
                    <Title headingLevel="h2" size="xl" className="summary-card-title--network">
                      {(clusterMetrics.networkThroughput.ingressMbps === 0 && clusterMetrics.networkThroughput.egressMbps === 0) 
                        ? 'N/A' 
                        : (clusterMetrics.networkThroughput.ingressMbps + clusterMetrics.networkThroughput.egressMbps).toFixed(0)}
                    </Title>
                    <div className="summary-card-subtitle">Network (Mbps)</div>
                  </FlexItem>
                  <FlexItem>
                    <div className="summary-card-utilization">
                      {(clusterMetrics.networkThroughput.ingressMbps === 0 && clusterMetrics.networkThroughput.egressMbps === 0)
                        ? 'Not available'
                        : `↓${clusterMetrics.networkThroughput.ingressMbps.toFixed(0)} ↑${clusterMetrics.networkThroughput.egressMbps.toFixed(0)}`}
                    </div>
                  </FlexItem>
                </Flex>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </StackItem>
    </Stack>
  );
};

export default NodeSummaryCards;
