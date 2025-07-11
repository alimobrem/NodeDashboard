// Formatting utility functions

/**
 * Format CPU value from string to number with unit
 * @param cpuValue - CPU value string (e.g., "100m", "1.5", "2000m")
 * @returns Object with formatted value and unit
 */
export const formatCPU = (cpuValue: string): { value: number; unit: string } => {
  if (cpuValue.endsWith('m')) {
    return { value: parseInt(cpuValue.slice(0, -1)), unit: 'm' };
  }
  return { value: parseFloat(cpuValue), unit: 'cores' };
};

/**
 * Format memory value for display
 * @param memoryValue - Memory value string (e.g., "1Gi", "512Mi", "1024000Ki")
 * @returns Human-readable memory string
 */
export const formatMemoryForDisplay = (memoryValue: string): string => {
  const units = ['Ki', 'Mi', 'Gi', 'Ti'];

  for (const unit of units) {
    if (memoryValue.endsWith(unit)) {
      const value = parseFloat(memoryValue.slice(0, -unit.length));
      return `${value.toFixed(1)} ${unit}`;
    }
  }

  // If no unit found, assume it's bytes and convert to appropriate unit
  const bytes = parseFloat(memoryValue);
  const kib = bytes / 1024;
  const mib = kib / 1024;
  const gib = mib / 1024;

  if (gib >= 1) {
    return `${gib.toFixed(1)} Gi`;
  } else if (mib >= 1) {
    return `${mib.toFixed(1)} Mi`;
  } else if (kib >= 1) {
    return `${kib.toFixed(1)} Ki`;
  } else {
    return `${bytes.toFixed(0)} bytes`;
  }
};

/**
 * Format percentage value for display
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format bytes to human-readable string
 * @param bytes - Number of bytes
 * @returns Human-readable size string
 */
export const formatBytes = (bytes: number): string => {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};
