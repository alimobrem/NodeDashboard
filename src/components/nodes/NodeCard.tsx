import React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Badge,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Progress,
  ProgressSize,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TimesCircleIcon,
  CpuIcon,
  MemoryIcon,
  ServerIcon,
} from '@patternfly/react-icons';
import type { NodeDetail } from '../../types';

interface NodeCardProps {
  node: NodeDetail;
  onClick?: (node: NodeDetail) => void;
  isSelected?: boolean;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, onClick, isSelected }) => {
  const getNodeHealthIcon = (node: NodeDetail) => {
    if (node.status === 'Ready') return <CheckCircleIcon />;
    if (node.status === 'NotReady') return <TimesCircleIcon />;
    return <ExclamationTriangleIcon />;
  };

  return (
    <Card
      isClickable={Boolean(onClick)}
      isSelected={isSelected}
      onClick={() => onClick?.(node)}
      className="node-card"
    >
      <CardTitle>
        <Flex alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <span className={`node-health-icon ${
              node.status === 'Ready' ? 'node-health-icon--ready' :
              node.status === 'NotReady' ? 'node-health-icon--not-ready' :
              node.status === 'Unknown' ? 'node-health-icon--unknown' :
              'node-health-icon--default'
            }`}>{getNodeHealthIcon(node)}</span>
          </FlexItem>
          <FlexItem>
            <strong>{node.name}</strong>
          </FlexItem>
          <FlexItem align={{ default: 'alignRight' }}>
            <Badge color={node.status === 'Ready' ? 'green' : 'red'}>{node.status}</Badge>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Grid hasGutter>
          <GridItem span={6}>
            <div>
              <CpuIcon className="icon-margin-right" />
              CPU: {node.metrics.cpu.current.toFixed(1)}%
            </div>
            <Progress
              value={node.metrics.cpu.current}
              size={ProgressSize.sm}
              variant={node.metrics.cpu.current > 80 ? 'danger' : 'success'}
            />
          </GridItem>
          <GridItem span={6}>
            <div>
              <MemoryIcon className="icon-margin-right" />
              Memory: {node.metrics.memory.current.toFixed(1)}%
            </div>
            <Progress
              value={node.metrics.memory.current}
              size={ProgressSize.sm}
              variant={node.metrics.memory.current > 80 ? 'danger' : 'success'}
            />
          </GridItem>
          <GridItem span={12}>
            <Flex>
              <FlexItem>
                <ServerIcon className="icon-margin-right" />
                {node.role}
              </FlexItem>
              <FlexItem>Pods: {node.pods.length}</FlexItem>
              <FlexItem>Age: {node.age}</FlexItem>
            </Flex>
          </GridItem>
        </Grid>
      </CardBody>
    </Card>
  );
};

export default NodeCard;
