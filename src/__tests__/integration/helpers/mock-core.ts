/**
 * Mock @actions/core helper
 */

import * as core from '@actions/core';

export interface MockCore {
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  errors: string[];
  secrets: string[];
  setInput: (name: string, value: string) => void;
  getOutput: (name: string) => string | undefined;
  reset: () => void;
}

let mockCoreInstance: MockCore | null = null;

/**
 * Create a mock core instance
 */
export function createMockCore(): MockCore {
  const mock: MockCore = {
    inputs: {},
    outputs: {},
    errors: [],
    secrets: [],
    setInput: (name: string, value: string) => {
      mock.inputs[name] = value;
    },
    getOutput: (name: string) => {
      return mock.outputs[name];
    },
    reset: () => {
      mock.inputs = {};
      mock.outputs = {};
      mock.errors = [];
      mock.secrets = [];
    },
  };

  mockCoreInstance = mock;
  return mock;
}

/**
 * Setup mock for @actions/core
 */
export function setupMockCore(): MockCore {
  const mock = createMockCore();

  jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
    return mock.inputs[name] || '';
  });

  jest.spyOn(core, 'getBooleanInput').mockImplementation((name: string) => {
    const value = mock.inputs[name];
    return value === 'true' || value === '1' || value === 'yes';
  });

  jest.spyOn(core, 'setOutput').mockImplementation((name: string, value: string) => {
    mock.outputs[name] = value;
  });

  jest.spyOn(core, 'setFailed').mockImplementation((message: string | Error) => {
    mock.errors.push(message instanceof Error ? message.message : message);
  });

  jest.spyOn(core, 'setSecret').mockImplementation((secret: string) => {
    mock.secrets.push(secret);
  });

  jest.spyOn(core, 'info').mockImplementation(() => {});
  jest.spyOn(core, 'warning').mockImplementation(() => {});
  jest.spyOn(core, 'error').mockImplementation(() => {});
  jest.spyOn(core, 'debug').mockImplementation(() => {});

  return mock;
}

/**
 * Reset mock core
 */
export function resetMockCore(): void {
  if (mockCoreInstance) {
    mockCoreInstance.reset();
  }
  mockCoreInstance = null;
  jest.restoreAllMocks();
}

/**
 * Get the current mock core instance
 */
export function getMockCore(): MockCore | null {
  return mockCoreInstance;
}
