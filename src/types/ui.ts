// UI Component-related TypeScript interfaces

import { NodeDetail } from './node';

export interface MiniChartProps {
  data: Array<{ timestamp: number; value: number }>;
  color: string;
  width?: number;
  height?: number;
}

export interface EnhancedNodeCardProps {
  node: NodeDetail;
  onClick?: (node: NodeDetail) => void;
  isSelected?: boolean;
}
