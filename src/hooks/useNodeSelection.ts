import * as React from 'react';
import type { NodeDetail } from '../types';

interface UseNodeSelectionReturn {
  selectedNode: NodeDetail | null;
  setSelectedNode: (node: NodeDetail | null) => void;
  handleNodeSelection: (node: NodeDetail) => void;
}

export const useNodeSelection = (): UseNodeSelectionReturn => {
  const [selectedNode, setSelectedNode] = React.useState<NodeDetail | null>(null);

  const handleNodeSelection = React.useCallback(
    (node: NodeDetail) => {
      setSelectedNode(selectedNode?.name === node.name ? null : node);
    },
    [selectedNode],
  );

  return {
    selectedNode,
    setSelectedNode,
    handleNodeSelection,
  };
};
