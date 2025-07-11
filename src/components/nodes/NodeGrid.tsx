import React from 'react';
import { Grid, GridItem } from '@patternfly/react-core';
import type { NodeDetail } from '../../types';

// Import the existing EnhancedNodeCard component
// We'll need to extract this from NodesDashboard.tsx later
interface NodeGridProps {
  nodes: NodeDetail[];
  selectedNode: NodeDetail | null;
  onNodeSelect: (node: NodeDetail) => void;
  EnhancedNodeCardComponent: React.ComponentType<{
    node: NodeDetail;
    onClick: (node: NodeDetail) => void;
    isSelected: boolean;
  }>;
}

const NodeGrid: React.FC<NodeGridProps> = ({
  nodes,
  selectedNode,
  onNodeSelect,
  EnhancedNodeCardComponent,
}) => {
  return (
    <Grid hasGutter>
      {nodes.map((node) => (
        <GridItem key={node.name} span={12} md={6} lg={4}>
          <EnhancedNodeCardComponent
            node={node}
            onClick={onNodeSelect}
            isSelected={selectedNode?.name === node.name}
          />
        </GridItem>
      ))}
    </Grid>
  );
};

export default NodeGrid;
