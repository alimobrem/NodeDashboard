import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { createMockNodes } from './__mocks__/k8s-mocks';

// Mock the k8s hooks to return loaded data
jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: jest.fn(() => {
    const mockNodes = createMockNodes(3);
    return [mockNodes, true, null]; // [data, loaded, error]
  }),
}));

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () => new Promise((resolve) => resolve(undefined)),
    },
  }),
}));

// Mock console API provider for testing
const MockConsoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// Custom render function that includes providers
const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: MockConsoleProvider, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };
