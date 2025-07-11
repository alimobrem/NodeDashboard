// Time-related utility functions

import type { NodeCondition } from '../types';

/**
 * Calculate the age of a resource from its creation timestamp
 * @param creationTimestamp - ISO string timestamp when resource was created
 * @returns Human-readable age string (e.g., "2d", "5h", "30m")
 */
export const getAge = (creationTimestamp: string): string => {
  const now = new Date();
  const created = new Date(creationTimestamp);
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDays > 0) {
    return `${diffDays}d`;
  } else if (diffHours > 0) {
    return `${diffHours}h`;
  } else {
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffMinutes}m`;
  }
};

/**
 * Calculate the uptime of a node based on its conditions
 * @param conditions - Array of node conditions
 * @returns Human-readable uptime string or "Unknown"
 */
export const getUptime = (conditions: NodeCondition[]): string => {
  const readyCondition = conditions.find((c) => c.type === 'Ready');
  if (readyCondition && readyCondition.lastTransitionTime) {
    return getAge(readyCondition.lastTransitionTime);
  }
  return 'Unknown';
};
