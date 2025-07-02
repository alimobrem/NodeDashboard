# Testing Guide for Node Dashboard Plugin

This document provides comprehensive information about testing the Node Dashboard plugin for OpenShift Console.

## Overview

The test suite includes:
- **Unit Tests**: Component-level testing with Jest and React Testing Library
- **Integration Tests**: End-to-end testing with Cypress
- **Mock Data**: Realistic Kubernetes API mocks for reliable testing

## Test Structure

```
├── src/
│   ├── __mocks__/              # Mock data and utilities
│   │   ├── fileMock.js         # Static asset mocks
│   │   └── k8s-mocks.ts        # Kubernetes API mocks
│   ├── components/
│   │   └── __tests__/          # Component unit tests
│   │       └── NodesDashboard.test.tsx
│   ├── setupTests.ts           # Jest setup configuration
│   └── test-utils.tsx          # Custom testing utilities
├── integration-tests/
│   └── tests/
│       └── node-dashboard.cy.ts # Cypress integration tests
├── jest.config.js              # Jest configuration
└── TESTING.md                  # This file
```

## Running Tests

### Prerequisites

Install testing dependencies:
```bash
yarn install
```

### Unit Tests

Run all unit tests:
```bash
yarn test
```

Run tests in watch mode:
```bash
yarn test:watch
```

Generate coverage report:
```bash
yarn test:coverage
```

Run specific test files:
```bash
yarn test NodesDashboard.test.tsx
```

### Integration Tests

Run Cypress tests in interactive mode:
```bash
yarn cypress:open
```

Run Cypress tests in headless mode:
```bash
yarn cypress:run
```

### Type Checking

Verify TypeScript compilation:
```bash
yarn type-check
```

### Linting

Run ESLint:
```bash
yarn lint
```

Fix linting issues automatically:
```bash
yarn lint:fix
```

## Test Categories

### Unit Tests (`src/components/__tests__/NodesDashboard.test.tsx`)

#### Component Rendering
- ✅ Renders component title
- ✅ Shows loading state
- ✅ Displays error states
- ✅ Handles empty state

#### Node List Display
- ✅ Displays nodes when data is available
- ✅ Shows node status correctly
- ✅ Displays resource information
- ✅ Shows uptime calculations

#### Search and Filtering
- ✅ Filters nodes by search term
- ✅ Shows no results message
- ✅ Filters by node status
- ✅ Clears filters properly

#### Node Details Modal
- ✅ Opens modal on node click
- ✅ Displays all tabs (Overview, Logs, Alerts, Terminal)
- ✅ Closes modal properly

#### Terminal Functionality
- ✅ Renders terminal interface
- ✅ Handles terminal commands
- ✅ Processes help command
- ✅ Clears terminal output

#### Performance & Responsiveness
- ✅ Handles large datasets efficiently
- ✅ Debounces search input
- ✅ Responsive design support

### Integration Tests (`integration-tests/tests/node-dashboard.cy.ts`)

#### Navigation and Basic Functionality
- ✅ Navigates to node dashboard page
- ✅ Displays page title and description

#### Node List Display
- ✅ Shows nodes table
- ✅ Displays all required columns
- ✅ Shows status badges
- ✅ Displays resource usage
- ✅ Shows uptime information

#### Search and Filtering
- ✅ Filters by search term
- ✅ Shows no results message
- ✅ Filters by status
- ✅ Clears filters

#### Node Details Modal
- ✅ Opens on node click
- ✅ Displays all tabs
- ✅ Shows overview information
- ✅ Closes properly

#### Terminal Functionality
- ✅ Displays terminal interface
- ✅ Shows connection status
- ✅ Executes commands (help, uname, ps)
- ✅ Handles invalid commands
- ✅ Clears terminal

#### Performance and Responsiveness
- ✅ Loads within acceptable time
- ✅ Responsive on mobile
- ✅ Responsive on tablet

#### Error Handling
- ✅ Displays error messages
- ✅ Shows retry options

#### Accessibility
- ✅ Proper heading structure
- ✅ Table accessibility
- ✅ Keyboard navigation
- ✅ ARIA labels

## Mock Data

### Node Mock (`src/__mocks__/k8s-mocks.ts`)

Provides realistic mock data for:
- Node specifications (CPU, memory, storage)
- Node status and conditions
- Network addresses
- System information
- Resource allocation

### API Mocks

Mock functions for:
- `useK8sWatchResource`: Kubernetes resource watching
- `k8sGet`: Resource fetching
- `k8sListItems`: Resource listing
- `usePrometheusQuery`: Metrics queries

## Testing Best Practices

### Unit Tests

1. **Test Behavior, Not Implementation**
   ```tsx
   // ✅ Good - tests behavior
   expect(screen.getByText('Node Dashboard')).toBeInTheDocument();
   
   // ❌ Bad - tests implementation
   expect(component.find('.title')).toHaveLength(1);
   ```

2. **Use Meaningful Test Names**
   ```tsx
   // ✅ Good
   it('should display error message when API fails', () => {
   
   // ❌ Bad  
   it('should work', () => {
   ```

3. **Setup and Teardown**
   ```tsx
   beforeEach(() => {
     jest.clearAllMocks();
     // Reset mocks before each test
   });
   ```

### Integration Tests

1. **Use Data Test Attributes**
   ```tsx
   // In component
   <button data-test="refresh-button">Refresh</button>
   
   // In test
   cy.get('[data-test="refresh-button"]').click();
   ```

2. **Test User Journeys**
   ```tsx
   it('should allow user to view node details and access terminal', () => {
     cy.visit('/nodes-dashboard');
     cy.get('[data-test="node-row"]').first().click();
     cy.get('[data-test="tab-terminal"]').click();
     // ... test complete user flow
   });
   ```

3. **Handle Async Operations**
   ```tsx
   cy.get('[data-test="terminal-input"]').type('uname -a{enter}');
   cy.get('[data-test="terminal-output"]').should('contain', 'Linux');
   ```

## Coverage Goals

Maintain test coverage above:
- **Statements**: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Release builds

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout in Jest config
   - Use `waitFor` for async operations

2. **Mock data not working**
   - Verify mock setup in `beforeEach`
   - Check mock return values

3. **Cypress tests failing**
   - Ensure test data attributes are present
   - Check for timing issues with `cy.wait()`

### Debugging

1. **Debug Unit Tests**
   ```bash
   yarn test --verbose --no-coverage
   ```

2. **Debug Cypress Tests**
   ```bash
   yarn cypress:open
   # Use browser dev tools
   ```

3. **Check Test Output**
   ```bash
   yarn test --verbose 2>&1 | tee test-output.log
   ```

## Contributing

When adding new features:

1. **Write tests first** (TDD approach)
2. **Add data-test attributes** for integration tests
3. **Update mock data** if needed
4. **Run full test suite** before submitting PR
5. **Update this documentation** if needed

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Cypress Documentation](https://docs.cypress.io/)
- [OpenShift Console Testing Guide](https://github.com/openshift/console/blob/master/CONTRIBUTING.md#testing) 