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
    it('should use explicit github platform', async () => {
      const result = await PlatformDetector.detect('github');
      expect(result.platform).toBe('github');
    });

    it('should use explicit gitea platform with GITHUB_SERVER_URL', async () => {
      process.env.GITHUB_SERVER_URL = 'https://gitea.example.com';
      process.env.GITHUB_REPOSITORY = 'owner/repo';
      const result = await PlatformDetector.detect('gitea');
      expect(result.platform).toBe('gitea');
      expect(result.baseUrl).toBe('https://gitea.example.com');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should use explicit gitea platform with repository URL', async () => {
      const result = await PlatformDetector.detect('gitea', 'https://gitea.example.com/owner/repo');
      expect(result.platform).toBe('gitea');
      expect(result.baseUrl).toBe('https://gitea.example.com');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should throw error for invalid platform', async () => {
      await expect(PlatformDetector.detect('invalid')).rejects.toThrow('Unsupported provider');
    });
  });

  describe('auto-detect from URL', () => {
    it('should detect GitHub from github.com URL', async () => {
      const result = await PlatformDetector.detect(undefined, 'https://github.com/owner/repo');
      expect(result.platform).toBe('github');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should detect Gitea from gitea.io URL', async () => {
      const result = await PlatformDetector.detect(
        undefined,
        'https://gitea.io/owner/repo'
      );
      expect(result.platform).toBe('gitea');
      expect(result.baseUrl).toBe('https://gitea.io');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should detect Gitea from custom domain', async () => {
      const result = await PlatformDetector.detect(
        undefined,
        'https://gitea.example.com/owner/repo'
      );
      expect(result.platform).toBe('gitea');
      expect(result.baseUrl).toBe('https://gitea.example.com');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });
  });

  describe('Gitea URL parsing', () => {
    it('should parse repository URL for Gitea', async () => {
      const result = await PlatformDetector.detect(
        'gitea',
        'https://gitea.example.com/owner/repo'
      );
      expect(result.platform).toBe('gitea');
      expect(result.baseUrl).toBe('https://gitea.example.com');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });
  });

  describe('default behavior', () => {
    it('should default to GitHub when URL cannot be parsed', async () => {
      const result = await PlatformDetector.detect(undefined, 'invalid-url');
      expect(result.platform).toBe('github');
      expect(core.warning).toHaveBeenCalled();
    });
  });
});
