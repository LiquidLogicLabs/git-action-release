import * as core from '@actions/core';
import { PlatformDetector } from '../../platform/detector';

jest.mock('@actions/core', () => ({
  warning: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  setFailed: jest.fn(),
  setSecret: jest.fn(),
  getInput: jest.fn(),
  getBooleanInput: jest.fn(),
  setOutput: jest.fn(),
}));

describe('PlatformDetector', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('explicit platform', () => {
    it('should use explicit github platform', () => {
      const result = PlatformDetector.detect('github');
      expect(result.platform).toBe('github');
    });

    it('should use explicit gitea platform', () => {
      const result = PlatformDetector.detect('gitea', 'https://gitea.example.com');
      expect(result.platform).toBe('gitea');
      expect(result.baseUrl).toBe('https://gitea.example.com');
    });

    it('should throw error for invalid platform', () => {
      expect(() => {
        PlatformDetector.detect('invalid');
      }).toThrow('Invalid platform: invalid');
    });

    it('should throw error for gitea without URL', () => {
      expect(() => {
        PlatformDetector.detect('gitea');
      }).toThrow('gitea_url is required');
    });
  });

  describe('auto-detect from URL', () => {
    it('should detect GitHub from github.com URL', () => {
      const result = PlatformDetector.detect(undefined, undefined, 'https://github.com/owner/repo');
      expect(result.platform).toBe('github');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should detect GitHub from custom GitHub Enterprise URL', () => {
      const result = PlatformDetector.detect(
        undefined,
        undefined,
        'https://github.example.com/owner/repo'
      );
      expect(result.platform).toBe('github');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should detect Gitea from gitea.io URL', () => {
      const result = PlatformDetector.detect(
        undefined,
        undefined,
        'https://gitea.io/owner/repo'
      );
      expect(result.platform).toBe('gitea');
    });

    it('should detect Gitea from custom domain with gitea_url', () => {
      const result = PlatformDetector.detect(
        undefined,
        'https://gitea.example.com',
        'https://gitea.example.com/owner/repo'
      );
      expect(result.platform).toBe('gitea');
      expect(result.baseUrl).toBe('https://gitea.example.com');
    });
  });

  describe('Gitea URL parsing', () => {
    it('should parse base URL', () => {
      const result = PlatformDetector.detect('gitea', 'https://gitea.example.com');
      expect(result.platform).toBe('gitea');
      expect(result.baseUrl).toBe('https://gitea.example.com');
    });

    it('should parse repository URL', () => {
      const result = PlatformDetector.detect(
        'gitea',
        'https://gitea.example.com/owner/repo'
      );
      expect(result.platform).toBe('gitea');
      expect(result.baseUrl).toBe('https://gitea.example.com');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should throw error for invalid URL format', () => {
      expect(() => {
        PlatformDetector.detect('gitea', 'not-a-url');
      }).toThrow('Invalid Gitea URL format');
    });
  });

  describe('default behavior', () => {
    it('should default to GitHub when URL cannot be parsed', () => {
      const result = PlatformDetector.detect(undefined, undefined, 'invalid-url');
      expect(result.platform).toBe('github');
    });
  });
});
