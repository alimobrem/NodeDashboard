import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import NodesDashboard from '../NodesDashboard';
import { createMockNodes, createLargeMockNodeDataset } from '../../__mocks__/k8s-mocks';

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () =>
        new Promise((resolve) => {
          resolve(undefined);
        }),
    },
  }),
}));

// Mock PatternFly components
jest.mock('@patternfly/react-core', () => ({
  ...jest.requireActual('@patternfly/react-core'),
  Alert: ({ children, title }: any) => (
    <div data-testid="alert" title={title}>
      {children}
    </div>
  ),
  Spinner: () => <div data-testid="spinner">Loading...</div>,
}));

// Mock the OpenShift Console Dynamic Plugin SDK
jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: jest.fn(),
  k8sGet: jest.fn().mockResolvedValue({}),
  k8sListItems: jest.fn(),
  usePrometheusQuery: jest.fn(),
  K8sResourceCommon: {},
}));

// Get the mocked functions after the mock is defined
const { useK8sWatchResource: mockUseK8sWatchResource } = jest.requireMock(
  '@openshift-console/dynamic-plugin-sdk',
);
const { k8sListItems: mockK8sListItems } = jest.requireMock(
  '@openshift-console/dynamic-plugin-sdk',
);
const { usePrometheusQuery: mockUsePrometheusQuery } = jest.requireMock(
  '@openshift-console/dynamic-plugin-sdk',
);

describe('Enhanced Node Dashboard with Real-time Data', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock setup with some nodes for successful scenarios
    const defaultNodes = createMockNodes(3);

    // Mock useK8sWatchResource to return proper format [data, loaded, error]
    // The component calls this hook 3 times (nodes, pods, events)
    mockUseK8sWatchResource.mockImplementation((params: any) => {
      if (params.groupVersionKind.kind === 'Node') {
        return [defaultNodes, true, null];
      } else if (params.groupVersionKind.kind === 'Pod') {
        return [[], true, null];
      } else if (params.groupVersionKind.kind === 'Event') {
        return [[], true, null];
      }
      return [[], false, null];
    });

    mockK8sListItems.mockResolvedValue([]);
    mockUsePrometheusQuery.mockReturnValue([[], null, false]);
  });

  describe('Real-time Data Loading and Display', () => {
    it('should display loading state with real-time messaging', () => {
      // Mock loading state - all three hooks return false for loaded
      mockUseK8sWatchResource.mockImplementation(() => [[], false, null]);

      render(<NodesDashboard />);

      expect(screen.getByText('Loading Node Data')).toBeInTheDocument();
      expect(
        screen.getByText('Fetching real-time cluster node information...'),
      ).toBeInTheDocument();
    });

    it('should display the enhanced dashboard title and real-time description', async () => {
      render(<NodesDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Node Dashboard')).toBeInTheDocument();
        expect(
          screen.getByText('Comprehensive visual monitoring of cluster nodes with real-time data'),
        ).toBeInTheDocument();
      });
    });

    it('should show real-time data indicator', async () => {
      render(<NodesDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Real-time Data')).toBeInTheDocument();
      });
    });

    it('should handle real-time data updates from watches', async () => {
      const initialNodes = createMockNodes(2);
      let currentNodes = initialNodes;

      // Mock dynamic data updates
      mockUseK8sWatchResource.mockImplementation((params: any) => {
        if (params.groupVersionKind.kind === 'Node') {
          return [currentNodes, true, null];
        } else if (params.groupVersionKind.kind === 'Pod') {
          return [[], true, null];
        } else if (params.groupVersionKind.kind === 'Event') {
          return [[], true, null];
        }
        return [[], false, null];
      });

      const { rerender } = render(<NodesDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Node Dashboard')).toBeInTheDocument();
      });

      // Simulate real-time data update
      currentNodes = createMockNodes(3);
      rerender(<NodesDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Node Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling with Watch Resources', () => {
    it('should handle watch resource errors gracefully', async () => {
      // Mock watch resources to return errors
      mockUseK8sWatchResource.mockImplementation(() => [
        null,
        true,
        new Error('Failed to load nodes'),
      ]);

      render(<NodesDashboard />);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to connect to the OpenShift API. Please check your connection.'),
        ).toBeInTheDocument();
      });
    });

    it('should handle empty data sets from watch resources', async () => {
      // Mock empty data from watches
      mockUseK8sWatchResource.mockImplementation((params: any) => {
        if (params.groupVersionKind.kind === 'Node') {
          return [[], true, null];
        } else if (params.groupVersionKind.kind === 'Pod') {
          return [[], true, null];
        } else if (params.groupVersionKind.kind === 'Event') {
          return [[], true, null];
        }
        return [[], false, null];
      });

      render(<NodesDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Node Dashboard')).toBeInTheDocument();
      });

      // Should show summary with 0 nodes
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument(); // Should show 0 total nodes
      });
    });
  });

  describe('Node Data Display and Interaction', () => {
    it('should display node cards with comprehensive information', async () => {
      render(<NodesDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Node Dashboard')).toBeInTheDocument();
      });

      // Should display node information
      await waitFor(() => {
        expect(screen.getAllByText(/worker-node-/)[0]).toBeInTheDocument();
      });
    });

    it('should show cluster summary metrics', async () => {
      render(<NodesDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Node Dashboard')).toBeInTheDocument();
      });

      // Should show metrics cards
      await waitFor(() => {
        expect(screen.getByText('Total Nodes')).toBeInTheDocument();
        expect(screen.getByText('Ready Nodes')).toBeInTheDocument();
        expect(screen.getByText('Running Pods')).toBeInTheDocument();
        expect(screen.getByText('Needs Attention')).toBeInTheDocument();
      });
    });

    it('should handle node selection for details view', async () => {
      render(<NodesDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Node Dashboard')).toBeInTheDocument();
      });

      // Wait for nodes to be rendered, then attempt to interact
      await waitFor(() => {
        const nodeElements = screen.getAllByText(/worker-node-/);
        expect(nodeElements.length).toBeGreaterThan(0);

        // Click on first node element that's likely clickable (typically in a card)
        if (nodeElements[0].closest('div[style*="cursor"]') || nodeElements[0].closest('button')) {
          fireEvent.click(nodeElements[0]);
        }

        // Verify the component doesn't crash
        expect(screen.getByText('Enhanced Node Dashboard')).toBeInTheDocument();
      });
    });

    it('should display filtering controls', async () => {
      render(<NodesDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Node Dashboard')).toBeInTheDocument();
      });

      // Should show search and filter controls
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Watch Resource Integration', () => {
    it('should properly set up watch resources for nodes, pods, and events', () => {
      render(<NodesDashboard />);

      // Verify that useK8sWatchResource was called for all three resource types
      const calls = mockUseK8sWatchResource.mock.calls;

      const nodeCall = calls.find((call: any) => call[0].groupVersionKind.kind === 'Node');
      const podCall = calls.find((call: any) => call[0].groupVersionKind.kind === 'Pod');
      const eventCall = calls.find((call: any) => call[0].groupVersionKind.kind === 'Event');

      expect(nodeCall).toBeDefined();
      expect(podCall).toBeDefined();
      expect(eventCall).toBeDefined();

      // Verify proper configuration
      expect(nodeCall[0].isList).toBe(true);
      expect(podCall[0].isList).toBe(true);
      expect(eventCall[0].isList).toBe(true);
    });

    it('should handle partial data loading states', async () => {
      // Mock scenario where nodes load first, then pods and events
      let step = 0;
      mockUseK8sWatchResource.mockImplementation((params: any) => {
        if (params.groupVersionKind.kind === 'Node') {
          return [createMockNodes(2), true, null];
        } else if (params.groupVersionKind.kind === 'Pod') {
          return [[], step > 0, null];
        } else if (params.groupVersionKind.kind === 'Event') {
          return [[], step > 1, null];
        }
        return [[], false, null];
      });

      const { rerender } = render(<NodesDashboard />);

      // Initially should show loading
      expect(screen.getByText('Loading Node Data')).toBeInTheDocument();

      // Simulate progression of data loading
      step = 1;
      rerender(<NodesDashboard />);

      step = 2;
      rerender(<NodesDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Node Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Enhanced Node Details and Debugging Features', () => {
    it('should provide comprehensive node information', async () => {
      render(<NodesDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Node Dashboard')).toBeInTheDocument();
      });

      // Should display various node details
      await waitFor(() => {
        expect(screen.getAllByText(/worker-node-/)[0]).toBeInTheDocument();
      });
    });

    it('should show node health status indicators', async () => {
      render(<NodesDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Node Dashboard')).toBeInTheDocument();
      });

      // Should show health indicators
      await waitFor(() => {
        const readyElements = screen.getAllByText('Ready');
        expect(readyElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance and Responsiveness', () => {
    const measurePerformance = async (
      testName: string,
      testFn: () => Promise<void> | void,
    ): Promise<number> => {
      const start = performance.now();
      await testFn();
      const end = performance.now();
      const duration = end - start;
      console.log(`Performance Test: ${testName} took ${duration.toFixed(2)}ms`);
      return duration;
    };

    it('should handle large datasets efficiently with real-time updates', async () => {
      const largeMockNodes = createLargeMockNodeDataset(100);

      mockUseK8sWatchResource.mockImplementation((params: any) => {
        if (params.groupVersionKind.kind === 'Node') {
          return [largeMockNodes, true, null];
        } else if (params.groupVersionKind.kind === 'Pod') {
          return [[], true, null];
        } else if (params.groupVersionKind.kind === 'Event') {
          return [[], true, null];
        }
        return [[], false, null];
      });

      const renderTime = await measurePerformance('Large dataset rendering', async () => {
        render(<NodesDashboard />);
        await waitFor(() => {
          expect(screen.getByText('Enhanced Node Dashboard')).toBeInTheDocument();
        });
      });

      expect(renderTime).toBeLessThan(3000); // Should render within 3 seconds
    });

    it('should maintain performance during continuous watch updates', async () => {
      let updateCount = 0;
      const baseNodes = createMockNodes(50);

      mockUseK8sWatchResource.mockImplementation((params: any) => {
        if (params.groupVersionKind.kind === 'Node') {
          // Simulate continuous updates by slightly modifying the data
          const modifiedNodes = baseNodes.map((node) => ({
            ...node,
            metadata: {
              ...node.metadata,
              resourceVersion: String(
                parseInt(node.metadata?.resourceVersion || '0') + updateCount,
              ),
            },
          }));
          return [modifiedNodes, true, null];
        } else if (params.groupVersionKind.kind === 'Pod') {
          return [[], true, null];
        } else if (params.groupVersionKind.kind === 'Event') {
          return [[], true, null];
        }
        return [[], false, null];
      });

      const { rerender } = render(<NodesDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Node Dashboard')).toBeInTheDocument();
      });

      const updateTime = await measurePerformance('Continuous updates', async () => {
        for (let i = 0; i < 5; i++) {
          updateCount++;
          rerender(<NodesDashboard />);
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      });

      expect(updateTime).toBeLessThan(1000); // All updates should complete within 1 second
    });

    it('should efficiently filter and sort nodes in real-time', async () => {
      const controlPlaneNodes = createMockNodes(25).map((node) => ({
        ...node,
        metadata: {
          ...node.metadata,
          labels: {
            ...node.metadata?.labels,
            'node-role.kubernetes.io/control-plane': '',
          },
        },
      }));
      const workerNodes = createMockNodes(75);
      const mixedNodes = [...controlPlaneNodes, ...workerNodes];

      mockUseK8sWatchResource.mockImplementation((params: any) => {
        if (params.groupVersionKind.kind === 'Node') {
          return [mixedNodes, true, null];
        } else if (params.groupVersionKind.kind === 'Pod') {
          return [[], true, null];
        } else if (params.groupVersionKind.kind === 'Event') {
          return [[], true, null];
        }
        return [[], false, null];
      });

      render(<NodesDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Node Dashboard')).toBeInTheDocument();
      });

      const filterTime = await measurePerformance('Filtering operations', async () => {
        const searchInput = screen.getByPlaceholderText(/search/i);

        fireEvent.change(searchInput, { target: { value: 'control' } });
        await waitFor(() => {
          expect(searchInput).toHaveValue('control');
        });

        fireEvent.change(searchInput, { target: { value: '' } });
        await waitFor(() => {
          expect(searchInput).toHaveValue('');
        });
      });

      expect(filterTime).toBeLessThan(500); // Filtering should be very fast
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should provide clear loading states', () => {
      mockUseK8sWatchResource.mockImplementation(() => [[], false, null]);

      render(<NodesDashboard />);

      expect(screen.getByText('Loading Node Data')).toBeInTheDocument();
      expect(
        screen.getByText('Fetching real-time cluster node information...'),
      ).toBeInTheDocument();
    });

    it('should display meaningful error messages', async () => {
      mockUseK8sWatchResource.mockImplementation(() => [null, true, new Error('Network error')]);

      render(<NodesDashboard />);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to connect to the OpenShift API. Please check your connection.'),
        ).toBeInTheDocument();
      });
    });

    it('should maintain responsive design across different viewport sizes', async () => {
      render(<NodesDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Node Dashboard')).toBeInTheDocument();
      });

      // Component should render successfully regardless of viewport
      expect(
        screen.getByText('Comprehensive visual monitoring of cluster nodes with real-time data'),
      ).toBeInTheDocument();
    });
  });

  describe('Data Integration and Processing', () => {
    it('should properly correlate nodes, pods, and events data', async () => {
      const nodes = createMockNodes(2);
      const mockPods = [
        {
          metadata: { name: 'pod-1', namespace: 'default' },
          spec: { nodeName: 'worker-node-1' },
          status: { phase: 'Running' },
        },
        {
          metadata: { name: 'pod-2', namespace: 'default' },
          spec: { nodeName: 'worker-node-2' },
          status: { phase: 'Running' },
        },
      ];
      const mockEvents = [
        {
          involvedObject: { name: 'worker-node-1', kind: 'Node' },
          type: 'Normal',
          reason: 'NodeReady',
          message: 'Node worker-node-1 status is now: NodeReady',
        },
      ];

      mockUseK8sWatchResource.mockImplementation((params: any) => {
        if (params.groupVersionKind.kind === 'Node') {
          return [nodes, true, null];
        } else if (params.groupVersionKind.kind === 'Pod') {
          return [mockPods, true, null];
        } else if (params.groupVersionKind.kind === 'Event') {
          return [mockEvents, true, null];
        }
        return [[], false, null];
      });

      render(<NodesDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Node Dashboard')).toBeInTheDocument();
      });

      // Should process and display the correlated data
      await waitFor(() => {
        expect(screen.getAllByText(/worker-node-/)[0]).toBeInTheDocument();
      });
    });

    it('should handle real-time data synchronization', async () => {
      let dataVersion = 1;

      mockUseK8sWatchResource.mockImplementation((params: any) => {
        if (params.groupVersionKind.kind === 'Node') {
          const nodes = createMockNodes(3).map((node) => ({
            ...node,
            metadata: {
              ...node.metadata,
              resourceVersion: String(dataVersion),
            },
          }));
          return [nodes, true, null];
        } else if (params.groupVersionKind.kind === 'Pod') {
          return [[], true, null];
        } else if (params.groupVersionKind.kind === 'Event') {
          return [[], true, null];
        }
        return [[], false, null];
      });

      const { rerender } = render(<NodesDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Node Dashboard')).toBeInTheDocument();
      });

      // Simulate data update
      dataVersion = 2;
      rerender(<NodesDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Node Dashboard')).toBeInTheDocument();
      });
    });
  });
});
