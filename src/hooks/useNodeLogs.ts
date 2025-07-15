import { useState, useCallback, useEffect } from 'react';

export interface NodeLogEntry {
  component: string;
  content: string;
  timestamp: string;
  level: string;
}

interface UseNodeLogsResult {
  logs: NodeLogEntry[];
  isLoading: boolean;
  error: string | null;
  availablePaths: string[];
  selectedPath: string;
  setSelectedPath: (path: string) => void;
  availableLogFiles: string[];
  selectedLogFile: string;
  setSelectedLogFile: (file: string) => void;
  refetchLogs: () => void;
}

export const useNodeLogs = (
  nodeName: string,
  nodeLabels: Record<string, string> = {},
): UseNodeLogsResult => {
  const [logs, setLogs] = useState<NodeLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableLogFiles, setAvailableLogFiles] = useState<string[]>([]);
  const [selectedLogFile, setSelectedLogFile] = useState<string>('');

  // Determine available log paths based on node characteristics
  const availablePaths = ['journal', 'kubelet', 'containers'];

  // Add master node specific paths if this is a control plane node
  if (
    nodeLabels?.['node-role.kubernetes.io/master'] === '' ||
    nodeLabels?.['node-role.kubernetes.io/control-plane'] === ''
  ) {
    availablePaths.push('kube-apiserver', 'etcd', 'kube-controller-manager', 'kube-scheduler');
  }

  const [selectedPath, setSelectedPath] = useState<string>(availablePaths[0] || 'journal');

  // Build log URL for API calls
  const getLogURL = useCallback(
    (path: string, logFile?: string) => {
      const baseURL = `/api/v1/nodes/${nodeName}/proxy/logs/${path}`;
      if (logFile && path !== 'journal') {
        return `${baseURL}/${logFile}`;
      }
      return baseURL;
    },
    [nodeName],
  );

  // Fetch available log files for a given path
  const fetchLogFiles = useCallback(
    async (path: string) => {
      if (path === 'journal') {
        setAvailableLogFiles([]);
        return;
      }

      try {
        const response = await fetch(`/api/kubernetes${getLogURL(path)}`);
        const responseText = await response.text();

        // Parse HTML response to extract log file names
        const parser = new DOMParser();
        const doc = parser.parseFromString(responseText, 'text/html');
        const links = doc.querySelectorAll('a[href]:not([href=".."])');

        const filenames: string[] = [];
        links.forEach((link) => {
          const href = link.getAttribute('href');
          const text = link.textContent;
          if (href && text && href !== '../' && !href.startsWith('?')) {
            filenames.push(text.trim());
          }
        });

        setAvailableLogFiles(filenames);
        // Auto-select first log file if available
        if (filenames.length > 0 && !selectedLogFile) {
          setSelectedLogFile(filenames[0]);
        }
      } catch (err) {
        console.error('Error fetching log files:', err);
        setAvailableLogFiles([]);
      }
    },
    [getLogURL, selectedLogFile],
  );

  // Parse log content into structured entries
  const parseLogContent = useCallback((content: string, component: string): NodeLogEntry[] => {
    const lines = content.split('\n').filter((line) => line.trim());

    return lines.map((line) => {
      // Try to extract timestamp from common log formats
      const timestampMatch = line.match(
        /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)/,
      );
      const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();

      // Detect log level
      let level = 'INFO';
      const upperLine = line.toUpperCase();
      if (
        upperLine.includes('ERROR') ||
        upperLine.includes('FATAL') ||
        upperLine.includes('CRITICAL')
      ) {
        level = 'ERROR';
      } else if (upperLine.includes('WARN')) {
        level = 'WARNING';
      } else if (upperLine.includes('DEBUG') || upperLine.includes('TRACE')) {
        level = 'DEBUG';
      }

      return {
        component,
        content: line,
        timestamp,
        level,
      };
    });
  }, []);

  // Fetch logs from the selected path/file
  const fetchLogs = useCallback(async () => {
    if (!nodeName || !selectedPath) return;

    setIsLoading(true);
    setError(null);

    try {
      let logURL = getLogURL(selectedPath);

      // For non-journal paths, we need a specific log file
      if (selectedPath !== 'journal') {
        if (!selectedLogFile) {
          // Try to fetch available files first
          await fetchLogFiles(selectedPath);
          setIsLoading(false);
          return;
        }
        logURL = getLogURL(selectedPath, selectedLogFile);
      }

      const response = await fetch(`/api/kubernetes${logURL}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.status} ${response.statusText}`);
      }

      const logContent = await response.text();

      // Parse the log content
      const parsedLogs = parseLogContent(logContent, selectedPath);

      // Limit to last 1000 entries for performance
      const limitedLogs = parsedLogs.slice(-1000);

      setLogs(limitedLogs);
    } catch (err: unknown) {
      console.error('Error fetching logs:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch logs';
      setError(errorMessage);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [nodeName, selectedPath, selectedLogFile, getLogURL, fetchLogFiles, parseLogContent]);

  // Fetch log files when path changes
  useEffect(() => {
    if (selectedPath && selectedPath !== 'journal') {
      fetchLogFiles(selectedPath);
    } else {
      setAvailableLogFiles([]);
      setSelectedLogFile('');
    }
  }, [selectedPath, fetchLogFiles]);

  // Fetch logs when path or file changes
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const refetchLogs = useCallback(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    isLoading,
    error,
    availablePaths,
    selectedPath,
    setSelectedPath,
    availableLogFiles,
    selectedLogFile,
    setSelectedLogFile,
    refetchLogs,
  };
};
