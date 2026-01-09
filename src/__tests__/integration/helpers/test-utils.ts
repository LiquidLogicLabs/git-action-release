/**
 * Test utilities
 */

import { Logger } from '../../../logger';
import { ReleaseConfig, ReleaseResult } from '../../../types';

/**
 * Create a mock logger
 */
export function createMockLogger(verbose: boolean = false): Logger {
  return new Logger(verbose);
}

/**
 * Create a mock release configuration
 */
export function createMockReleaseConfig(overrides: Partial<ReleaseConfig> = {}): ReleaseConfig {
  return {
    tag: 'v1.0.0',
    name: 'v1.0.0',
    body: 'Test release body',
    draft: false,
    prerelease: false,
    ...overrides,
  };
}

/**
 * Create a mock release result
 */
export function createMockReleaseResult(overrides: Partial<ReleaseResult> = {}): ReleaseResult {
  return {
    id: '123456',
    html_url: 'https://example.com/releases/v1.0.0',
    upload_url: 'https://example.com/releases/123456/assets',
    tarball_url: 'https://example.com/releases/v1.0.0.tar.gz',
    zipball_url: 'https://example.com/releases/v1.0.0.zip',
    assets: {},
    draft: false,
    prerelease: false,
    ...overrides,
  };
}

/**
 * Wait for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a unique test tag
 */
export function generateTestTag(prefix: string = 'test-'): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
