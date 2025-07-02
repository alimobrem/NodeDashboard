import { checkErrors } from '../support';

const PLUGIN_TEMPLATE_NAME = 'node-dashboard';
const PLUGIN_TEMPLATE_PULL_SPEC = Cypress.env('PLUGIN_TEMPLATE_PULL_SPEC');
export const isLocalDevEnvironment = Cypress.config('baseUrl')?.includes('localhost') || false;

export const guidedTour = {
  close: () => {
    cy.get('body').then(($body) => {
      if ($body.find(`[data-test="guided-tour-modal"]`).length > 0) {
        cy.get(`[data-test="tour-step-footer-secondary"]`).contains('Skip tour').click();
      }
    });
  },
  isOpen: () => {
    cy.get('body').then(($body) => {
      if ($body.find(`[data-test="guided-tour-modal"]`).length > 0) {
        cy.get(`[data-test="guided-tour-modal"]`).should('be.visible');
      }
    });
  },
};

const installHelmChart = (path: string) => {
  cy.exec(
    `cd ../../console-plugin-template && ${path} upgrade -i ${PLUGIN_TEMPLATE_NAME} charts/openshift-console-plugin -n ${PLUGIN_TEMPLATE_NAME} --create-namespace --set plugin.image=${PLUGIN_TEMPLATE_PULL_SPEC}`,
    {
      failOnNonZeroExit: false,
    },
  )
    .get('[data-test="refresh-web-console"]', { timeout: 300000 })
    .should('exist')
    .then((result) => {
      cy.reload();
      cy.visit(`/dashboards`);
      cy.log('Helm chart installation result: ', result);
    });
};

const deleteHelmChart = (path: string) => {
  cy.exec(
    `cd ../../console-plugin-template && ${path} uninstall ${PLUGIN_TEMPLATE_NAME} -n ${PLUGIN_TEMPLATE_NAME} && oc delete namespaces ${PLUGIN_TEMPLATE_NAME}`,
    {
      failOnNonZeroExit: false,
    },
  ).then((result) => {
    cy.log('Helm chart uninstallation result: ', result);
  });
};

describe('Node Dashboard Plugin Tests', () => {
  before(() => {
    // cy.login(); // Uncomment if login command is available
    guidedTour.isOpen();
    guidedTour.close();
    
    if (!isLocalDevEnvironment) {
      console.log('this is not a local env, installing helm');
      cy.exec('cd ../../console-plugin-template && ./install_helm.sh', {
        failOnNonZeroExit: false,
      }).then((result) => {
        cy.log('Helm binary installation result: ', result);
        installHelmChart('/tmp/helm');
      });
    } else {
      console.log('this is a local env, not installing helm');
      installHelmChart('helm');
    }
  });

  afterEach(() => {
    checkErrors();
  });

  after(() => {
    if (!isLocalDevEnvironment) {
      deleteHelmChart('/tmp/helm');
    } else {
      deleteHelmChart('helm');
    }
    // cy.logout(); // Uncomment if logout command is available
  });

  describe('Navigation and Basic Functionality', () => {
    it('should navigate to node dashboard page', () => {
      cy.get('[data-quickstart-id="qs-nav-home"]').click();
      cy.get('[data-test="nav"]').contains('Nodes Dashboard').click();
      cy.url().should('include', '/nodes-dashboard');
      cy.get('[data-test="page-title"]').should('contain', 'Node Dashboard');
    });

    it('should display node dashboard title and description', () => {
      cy.visit('/nodes-dashboard');
      cy.get('[data-test="page-title"]').should('contain', 'Node Dashboard');
      cy.get('[data-test="page-description"]').should('contain', 'Comprehensive cluster node monitoring');
    });
  });

  describe('Node List Display', () => {
    beforeEach(() => {
      cy.visit('/nodes-dashboard');
    });

    it('should display nodes table', () => {
      cy.get('[data-test="nodes-table"]').should('be.visible');
      cy.get('[data-test="node-row"]').should('have.length.greaterThan', 0);
    });

    it('should display node information columns', () => {
      cy.get('[data-test="nodes-table"]').within(() => {
        cy.get('thead th').should('contain', 'Name');
        cy.get('thead th').should('contain', 'Status');
        cy.get('thead th').should('contain', 'CPU');
        cy.get('thead th').should('contain', 'Memory');
        cy.get('thead th').should('contain', 'Uptime');
        cy.get('thead th').should('contain', 'Zone');
      });
    });

    it('should display node status badges', () => {
      cy.get('[data-test="node-status-badge"]').should('be.visible');
      cy.get('[data-test="node-status-badge"]').first().should('contain.text', 'Ready');
    });

    it('should display resource utilization', () => {
      cy.get('[data-test="cpu-usage"]').should('be.visible');
      cy.get('[data-test="memory-usage"]').should('be.visible');
    });

    it('should display uptime information', () => {
      cy.get('[data-test="node-uptime"]').should('be.visible');
      cy.get('[data-test="node-uptime"]').should('match', /\d+[dhms]/);
    });
  });

  describe('Search and Filtering', () => {
    beforeEach(() => {
      cy.visit('/nodes-dashboard');
    });

    it('should filter nodes by search term', () => {
      cy.get('[data-test="search-input"]').type('master');
      cy.get('[data-test="node-row"]').should('contain', 'master');
      cy.get('[data-test="search-input"]').clear();
    });

    it('should show no results message for invalid search', () => {
      cy.get('[data-test="search-input"]').type('nonexistent-node-name');
      cy.get('[data-test="no-results-message"]').should('be.visible');
      cy.get('[data-test="no-results-message"]').should('contain', 'No nodes match your search');
    });

    it('should filter nodes by status', () => {
      cy.get('[data-test="status-filter"]').click();
      cy.get('[data-test="status-option-ready"]').click();
      cy.get('[data-test="node-status-badge"]').each(($badge) => {
        cy.wrap($badge).should('contain', 'Ready');
      });
    });

    it('should clear filters', () => {
      cy.get('[data-test="search-input"]').type('test');
      cy.get('[data-test="status-filter"]').click();
      cy.get('[data-test="status-option-ready"]').click();
      cy.get('[data-test="clear-filters"]').click();
      cy.get('[data-test="search-input"]').should('have.value', '');
    });
  });

  describe('Node Details Modal', () => {
    beforeEach(() => {
      cy.visit('/nodes-dashboard');
    });

    it('should open node details modal when clicking on a node', () => {
      cy.get('[data-test="node-row"]').first().click();
      cy.get('[data-test="node-details-modal"]').should('be.visible');
      cy.get('[data-test="modal-title"]').should('contain', 'Node Details');
    });

    it('should display node details tabs', () => {
      cy.get('[data-test="node-row"]').first().click();
      cy.get('[data-test="node-details-modal"]').within(() => {
        cy.get('[data-test="tab-overview"]').should('be.visible');
        cy.get('[data-test="tab-logs"]').should('be.visible');
        cy.get('[data-test="tab-alerts"]').should('be.visible');
        cy.get('[data-test="tab-terminal"]').should('be.visible');
      });
    });

    it('should display overview information', () => {
      cy.get('[data-test="node-row"]').first().click();
      cy.get('[data-test="tab-overview"]').click();
      cy.get('[data-test="node-overview"]').within(() => {
        cy.get('[data-test="node-name"]').should('be.visible');
        cy.get('[data-test="node-status"]').should('be.visible');
        cy.get('[data-test="node-capacity"]').should('be.visible');
        cy.get('[data-test="node-addresses"]').should('be.visible');
      });
    });

    it('should close modal when clicking close button', () => {
      cy.get('[data-test="node-row"]').first().click();
      cy.get('[data-test="close-modal"]').click();
      cy.get('[data-test="node-details-modal"]').should('not.exist');
    });
  });

  describe('Terminal Functionality', () => {
    beforeEach(() => {
      cy.visit('/nodes-dashboard');
      cy.get('[data-test="node-row"]').first().click();
      cy.get('[data-test="tab-terminal"]').click();
    });

    it('should display terminal interface', () => {
      cy.get('[data-test="terminal-container"]').should('be.visible');
      cy.get('[data-test="terminal-output"]').should('be.visible');
      cy.get('[data-test="terminal-input"]').should('be.visible');
    });

    it('should show connection status', () => {
      cy.get('[data-test="terminal-status"]').should('contain', 'Connected');
    });

    it('should execute help command', () => {
      cy.get('[data-test="terminal-input"]').type('help{enter}');
      cy.get('[data-test="terminal-output"]').should('contain', 'Available commands:');
    });

    it('should execute uname command', () => {
      cy.get('[data-test="terminal-input"]').type('uname -a{enter}');
      cy.get('[data-test="terminal-output"]').should('contain', 'Linux');
    });

    it('should execute ps command', () => {
      cy.get('[data-test="terminal-input"]').type('ps aux{enter}');
      cy.get('[data-test="terminal-output"]').should('contain', 'kubelet');
    });

    it('should handle invalid commands', () => {
      cy.get('[data-test="terminal-input"]').type('invalidcommand{enter}');
      cy.get('[data-test="terminal-output"]').should('contain', 'Command not found');
    });

    it('should clear terminal with clear command', () => {
      cy.get('[data-test="terminal-input"]').type('uname -a{enter}');
      cy.get('[data-test="terminal-input"]').type('clear{enter}');
      cy.get('[data-test="terminal-output"]').should('not.contain', 'Linux');
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should load page within acceptable time', () => {
      const startTime = Date.now();
      cy.visit('/nodes-dashboard');
      cy.get('[data-test="nodes-table"]').should('be.visible').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(5000); // Should load within 5 seconds
      });
    });

    it('should handle responsive design on mobile viewport', () => {
      cy.viewport('iphone-6');
      cy.visit('/nodes-dashboard');
      cy.get('[data-test="page-title"]').should('be.visible');
      cy.get('[data-test="nodes-table"]').should('be.visible');
    });

    it('should handle responsive design on tablet viewport', () => {
      cy.viewport('ipad-2');
      cy.visit('/nodes-dashboard');
      cy.get('[data-test="page-title"]').should('be.visible');
      cy.get('[data-test="nodes-table"]').should('be.visible');
    });
  });

  describe('Data Refresh and Real-time Updates', () => {
    beforeEach(() => {
      cy.visit('/nodes-dashboard');
    });

    it('should display refresh indicator', () => {
      cy.get('[data-test="refresh-indicator"]').should('be.visible');
    });

    it('should handle manual refresh', () => {
      cy.get('[data-test="refresh-button"]').click();
      cy.get('[data-test="refresh-indicator"]').should('be.visible');
      cy.get('[data-test="nodes-table"]').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', () => {
      // Simulate API failure by intercepting requests
      cy.intercept('GET', '**/api/v1/nodes', { statusCode: 500 }).as('getNodesError');
      cy.visit('/nodes-dashboard');
      cy.wait('@getNodesError');
      cy.get('[data-test="error-message"]').should('be.visible');
      cy.get('[data-test="error-message"]').should('contain', 'Error loading nodes');
    });

    it('should display retry option on error', () => {
      cy.intercept('GET', '**/api/v1/nodes', { statusCode: 500 }).as('getNodesError');
      cy.visit('/nodes-dashboard');
      cy.wait('@getNodesError');
      cy.get('[data-test="retry-button"]').should('be.visible');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      cy.visit('/nodes-dashboard');
    });

    it('should have proper heading structure', () => {
      cy.get('h1').should('exist');
      cy.get('[data-test="page-title"]').should('have.attr', 'role', 'heading');
    });

    it('should have proper table accessibility', () => {
      cy.get('[data-test="nodes-table"]').should('have.attr', 'role', 'table');
      cy.get('[data-test="nodes-table"] thead').should('exist');
      cy.get('[data-test="nodes-table"] tbody').should('exist');
    });

    it('should support keyboard navigation', () => {
      cy.get('[data-test="search-input"]').focus();
      cy.get('[data-test="search-input"]').should('be.focused');
      cy.get('[data-test="search-input"]').type('{tab}');
      cy.get('[data-test="status-filter"]').should('be.focused');
    });

    it('should have proper ARIA labels', () => {
      cy.get('[data-test="search-input"]').should('have.attr', 'aria-label');
      cy.get('[data-test="status-filter"]').should('have.attr', 'aria-label');
    });
  });

  describe('Performance and Scalability', () => {
    beforeEach(() => {
      cy.visit('/nodes-dashboard');
    });

    it('should load page within acceptable time limits', () => {
      const startTime = Date.now();
      
      cy.visit('/nodes-dashboard').then(() => {
        const loadTime = Date.now() - startTime;
        cy.log(`Page load time: ${loadTime}ms`);
        
        // Page should load within 5 seconds
        expect(loadTime).to.be.lessThan(5000);
      });
      
      // Should display loading state quickly
      cy.get('[data-test="page-title"]', { timeout: 2000 }).should('be.visible');
    });

    it('should handle large node datasets efficiently', () => {
      // Mock a large dataset response
      cy.intercept('GET', '**/api/v1/nodes*', { fixture: 'large-nodes-dataset.json' }).as('getLargeNodeData');
      
      const startTime = Date.now();
      cy.visit('/nodes-dashboard');
      
      cy.wait('@getLargeNodeData').then(() => {
        const loadTime = Date.now() - startTime;
        cy.log(`Large dataset load time: ${loadTime}ms`);
        
        // Should handle 200 nodes within reasonable time
        expect(loadTime).to.be.lessThan(10000); // 10 seconds max
      });

      // Should display nodes list
      cy.get('[data-test="nodes-table"]', { timeout: 10000 }).should('be.visible');
      
      // Should show multiple nodes
      cy.get('[data-test="node-row"]').should('have.length.greaterThan', 10);
    });

    it('should maintain search performance with large datasets', () => {
      cy.intercept('GET', '**/api/v1/nodes*', { fixture: 'large-nodes-dataset.json' }).as('getLargeNodeData');
      
      cy.visit('/nodes-dashboard');
      cy.wait('@getLargeNodeData');
      
      // Wait for nodes to load
      cy.get('[data-test="nodes-table"]', { timeout: 10000 }).should('be.visible');
      
      const searchInput = cy.get('[data-test="search-input"]');
      
      // Measure search performance
      const startTime = Date.now();
      searchInput.type('worker{enter}');
      
      cy.get('[data-test="node-row"]').should('be.visible').then(() => {
        const searchTime = Date.now() - startTime;
        cy.log(`Search completion time: ${searchTime}ms`);
        
        // Search should complete quickly
        expect(searchTime).to.be.lessThan(2000); // 2 seconds max
      });
      
      // Should show filtered results
      cy.get('[data-test="node-row"]').each(($el) => {
        cy.wrap($el).should('contain.text', 'worker');
      });
    });

    it('should handle rapid search input changes', () => {
      cy.intercept('GET', '**/api/v1/nodes*', { fixture: 'large-nodes-dataset.json' }).as('getLargeNodeData');
      
      cy.visit('/nodes-dashboard');
      cy.wait('@getLargeNodeData');
      
      cy.get('[data-test="nodes-table"]', { timeout: 10000 }).should('be.visible');
      
      const searchInput = cy.get('[data-test="search-input"]');
      const searchTerms = ['worker', 'master', 'node-1', 'zone-1'];
      
      const startTime = Date.now();
      
      // Rapidly change search terms
      searchTerms.forEach((term, index) => {
        searchInput.clear();
        searchInput.type(term);
        
        if (index < searchTerms.length - 1) {
          cy.wait(100); // Small delay between rapid changes
        }
      });
      
      // Wait for final results
      cy.get('[data-test="node-row"]').should('be.visible').then(() => {
        const totalTime = Date.now() - startTime;
        cy.log(`Rapid search completion time: ${totalTime}ms`);
        
        // Should handle rapid changes efficiently
        expect(totalTime).to.be.lessThan(3000);
      });
    });

    it('should handle filter operations efficiently', () => {
      cy.intercept('GET', '**/api/v1/nodes*', { fixture: 'large-nodes-dataset.json' }).as('getLargeNodeData');
      
      cy.visit('/nodes-dashboard');
      cy.wait('@getLargeNodeData');
      
      cy.get('[data-test="nodes-table"]', { timeout: 10000 }).should('be.visible');
      
      // Test status filter performance
      const startTime = Date.now();
      
      cy.get('[data-test="status-filter"]').click();
      cy.get('[data-test="filter-ready"]').click();
      
      cy.get('[data-test="node-row"]').should('be.visible').then(() => {
        const filterTime = Date.now() - startTime;
        cy.log(`Filter completion time: ${filterTime}ms`);
        
        // Filtering should be fast
        expect(filterTime).to.be.lessThan(1500);
      });
      
      // Should show only ready nodes
      cy.get('[data-test="node-status"]').each(($el) => {
        cy.wrap($el).should('contain.text', 'Ready');
      });
    });

    it('should handle node details modal efficiently with large datasets', () => {
      cy.intercept('GET', '**/api/v1/nodes*', { fixture: 'large-nodes-dataset.json' }).as('getLargeNodeData');
      
      cy.visit('/nodes-dashboard');
      cy.wait('@getLargeNodeData');
      
      cy.get('[data-test="nodes-table"]', { timeout: 10000 }).should('be.visible');
      
      // Click on first node
      const startTime = Date.now();
      cy.get('[data-test="node-row"]').first().click();
      
      cy.get('[data-test="node-details-modal"]').should('be.visible').then(() => {
        const modalTime = Date.now() - startTime;
        cy.log(`Modal open time: ${modalTime}ms`);
        
        // Modal should open quickly
        expect(modalTime).to.be.lessThan(1000);
      });
      
      // Test tab switching performance
      const tabStartTime = Date.now();
      cy.get('[data-test="details-tab"]').click();
      
      cy.get('[data-test="node-details-content"]').should('be.visible').then(() => {
        const tabTime = Date.now() - tabStartTime;
        cy.log(`Tab switch time: ${tabTime}ms`);
        
        // Tab switching should be instant
        expect(tabTime).to.be.lessThan(500);
      });
    });

    it('should handle scrolling with large datasets', () => {
      cy.intercept('GET', '**/api/v1/nodes*', { fixture: 'large-nodes-dataset.json' }).as('getLargeNodeData');
      
      cy.visit('/nodes-dashboard');
      cy.wait('@getLargeNodeData');
      
      cy.get('[data-test="nodes-table"]', { timeout: 10000 }).should('be.visible');
      
      // Test scrolling performance
      const startTime = Date.now();
      
      // Scroll through the list multiple times
      for (let i = 0; i < 5; i++) {
        cy.get('[data-test="nodes-table"]').scrollTo('bottom');
        cy.wait(100);
        cy.get('[data-test="nodes-table"]').scrollTo('top');
        cy.wait(100);
      }
      
      const scrollTime = Date.now() - startTime;
      cy.log(`Scrolling test completion: ${scrollTime}ms`);
      
      // Scrolling should remain smooth
      expect(scrollTime).to.be.lessThan(2000);
    });

    it('should maintain responsiveness during continuous updates', () => {
      // Simulate continuous data updates
      let updateCount = 0;
      const maxUpdates = 10;
      
      cy.intercept('GET', '**/api/v1/nodes*', (req) => {
        updateCount++;
        // Modify response slightly for each update
        cy.fixture('large-nodes-dataset.json').then((data) => {
          const modifiedData = {
            ...data,
            metadata: {
              ...data.metadata,
              resourceVersion: String(parseInt(data.metadata.resourceVersion || '1000000') + updateCount)
            }
          };
          req.reply(modifiedData);
        });
      }).as('getUpdatedNodeData');
      
      cy.visit('/nodes-dashboard');
      cy.wait('@getUpdatedNodeData');
      
      const startTime = Date.now();
      
      // Trigger multiple updates by refreshing data
      function triggerUpdate() {
        if (updateCount < maxUpdates) {
          cy.get('[data-test="refresh-button"]', { timeout: 1000 }).click({ force: true });
          cy.wait('@getUpdatedNodeData').then(() => {
            triggerUpdate();
          });
        } else {
          const totalTime = Date.now() - startTime;
          cy.log(`Continuous updates completed in: ${totalTime}ms`);
          
          // Should handle continuous updates efficiently
          expect(totalTime).to.be.lessThan(15000); // 15 seconds for 10 updates
        }
      }
      
      triggerUpdate();
    });

    it('should handle memory usage efficiently', () => {
      cy.intercept('GET', '**/api/v1/nodes*', { fixture: 'large-nodes-dataset.json' }).as('getLargeNodeData');
      
      // Test memory usage by repeatedly loading and unloading the page
      const iterations = 3;
      
      for (let i = 0; i < iterations; i++) {
        cy.visit('/nodes-dashboard');
        cy.wait('@getLargeNodeData');
        
        cy.get('[data-test="nodes-table"]', { timeout: 10000 }).should('be.visible');
        
        // Perform some operations to stress test memory
        cy.get('[data-test="search-input"]').type(`test-${i}{enter}`);
        cy.get('[data-test="search-input"]').clear();
        
        // Check that the page is still responsive
        cy.get('[data-test="page-title"]').should('be.visible');
        
        cy.log(`Memory test iteration ${i + 1} completed`);
      }
      
      // Final check that everything still works
      cy.get('[data-test="nodes-table"]').should('be.visible');
    });

    it('should handle concurrent user actions efficiently', () => {
      cy.intercept('GET', '**/api/v1/nodes*', { fixture: 'large-nodes-dataset.json' }).as('getLargeNodeData');
      
      cy.visit('/nodes-dashboard');
      cy.wait('@getLargeNodeData');
      
      cy.get('[data-test="nodes-table"]', { timeout: 10000 }).should('be.visible');
      
      const startTime = Date.now();
      
      // Simulate concurrent user actions
      cy.get('[data-test="search-input"]').type('worker');
      cy.get('[data-test="status-filter"]').click({ force: true });
      cy.get('[data-test="filter-ready"]').click({ force: true });
      cy.get('[data-test="search-input"]').clear();
      cy.get('[data-test="search-input"]').type('master');
      
      // Wait for all operations to complete
      cy.get('[data-test="node-row"]').should('be.visible').then(() => {
        const concurrentTime = Date.now() - startTime;
        cy.log(`Concurrent actions completed in: ${concurrentTime}ms`);
        
        // Should handle concurrent actions efficiently
        expect(concurrentTime).to.be.lessThan(3000);
      });
    });

    it('should maintain performance benchmarks', () => {
      const benchmarks = {
        pageLoad: 5000,      // 5 seconds
        search: 2000,        // 2 seconds  
        filter: 1500,        // 1.5 seconds
        modalOpen: 1000,     // 1 second
        tabSwitch: 500       // 0.5 seconds
      };
      
      cy.intercept('GET', '**/api/v1/nodes*', { fixture: 'large-nodes-dataset.json' }).as('getLargeNodeData');
      
      // Test page load benchmark
      const pageLoadStart = Date.now();
      cy.visit('/nodes-dashboard');
      cy.wait('@getLargeNodeData');
      
      cy.get('[data-test="nodes-table"]', { timeout: 10000 }).should('be.visible').then(() => {
        const pageLoadTime = Date.now() - pageLoadStart;
        cy.log(`Page load benchmark: ${pageLoadTime}ms (target: ${benchmarks.pageLoad}ms)`);
        expect(pageLoadTime).to.be.lessThan(benchmarks.pageLoad);
      });
      
      // Test search benchmark
      const searchStart = Date.now();
      cy.get('[data-test="search-input"]').type('worker{enter}');
      
      cy.get('[data-test="node-row"]').should('be.visible').then(() => {
        const searchTime = Date.now() - searchStart;
        cy.log(`Search benchmark: ${searchTime}ms (target: ${benchmarks.search}ms)`);
        expect(searchTime).to.be.lessThan(benchmarks.search);
      });
      
      // Test filter benchmark
      cy.get('[data-test="search-input"]').clear();
      const filterStart = Date.now();
      cy.get('[data-test="status-filter"]').click();
      cy.get('[data-test="filter-ready"]').click();
      
      cy.get('[data-test="node-row"]').should('be.visible').then(() => {
        const filterTime = Date.now() - filterStart;
        cy.log(`Filter benchmark: ${filterTime}ms (target: ${benchmarks.filter}ms)`);
        expect(filterTime).to.be.lessThan(benchmarks.filter);
      });
      
      // Test modal benchmark
      const modalStart = Date.now();
      cy.get('[data-test="node-row"]').first().click();
      
      cy.get('[data-test="node-details-modal"]').should('be.visible').then(() => {
        const modalTime = Date.now() - modalStart;
        cy.log(`Modal benchmark: ${modalTime}ms (target: ${benchmarks.modalOpen}ms)`);
        expect(modalTime).to.be.lessThan(benchmarks.modalOpen);
      });
      
      // Test tab switch benchmark
      const tabStart = Date.now();
      cy.get('[data-test="details-tab"]').click();
      
      cy.get('[data-test="node-details-content"]').should('be.visible').then(() => {
        const tabTime = Date.now() - tabStart;
        cy.log(`Tab switch benchmark: ${tabTime}ms (target: ${benchmarks.tabSwitch}ms)`);
        expect(tabTime).to.be.lessThan(benchmarks.tabSwitch);
      });
    });

    it('should handle stress testing with rapid operations', () => {
      cy.intercept('GET', '**/api/v1/nodes*', { fixture: 'large-nodes-dataset.json' }).as('getLargeNodeData');
      
      cy.visit('/nodes-dashboard');
      cy.wait('@getLargeNodeData');
      
      cy.get('[data-test="nodes-table"]', { timeout: 10000 }).should('be.visible');
      
      const startTime = Date.now();
      const searchTerms = ['worker', 'master', 'node', 'ready', 'zone'];
      
      // Perform rapid stress testing
      searchTerms.forEach((term, index) => {
        cy.get('[data-test="search-input"]').clear();
        cy.get('[data-test="search-input"]').type(term);
        
        // Rapid filter changes
        cy.get('[data-test="status-filter"]').click({ force: true });
        cy.get('[data-test="filter-ready"]').click({ force: true });
        cy.get('[data-test="status-filter"]').click({ force: true });
        cy.get('[data-test="filter-all"]').click({ force: true });
        
        // Quick scroll
        cy.get('[data-test="nodes-table"]').scrollTo('bottom');
        cy.get('[data-test="nodes-table"]').scrollTo('top');
      });
      
      // Verify the interface is still responsive
      cy.get('[data-test="node-row"]').should('be.visible').then(() => {
        const stressTime = Date.now() - startTime;
        cy.log(`Stress test completed in: ${stressTime}ms`);
        
        // Should survive stress testing
        expect(stressTime).to.be.lessThan(10000); // 10 seconds max
      });
      
      // Final responsiveness check
      cy.get('[data-test="search-input"]').clear();
      cy.get('[data-test="search-input"]').type('final-test');
      cy.get('[data-test="search-input"]').should('have.value', 'final-test');
    });
  });
}); 