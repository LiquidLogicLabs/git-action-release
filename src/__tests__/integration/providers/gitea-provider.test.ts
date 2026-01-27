/**
 * Gitea provider integration tests
 */

// Mock @actions/core before imports
jest.mock('@actions/core', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  setSecret: jest.fn(),
  setFailed: jest.fn(),
  setOutput: jest.fn(),
  getInput: jest.fn(),
  getBooleanInput: jest.fn(),
}));

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
  readFileSync: jest.fn(),
}));

import { GiteaProvider } from '../../../platform/gitea';
import { fetchMock } from '../mocks/fetch';
import { giteaResponses } from '../mocks/gitea-responses';
import { createMockLogger, createMockReleaseConfig } from '../helpers/test-utils';
import { ReleaseConfig } from '../../../types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('GiteaProvider Integration Tests', () => {
  let provider: GiteaProvider;
  const testToken = 'test-token';
  const testBaseUrl = 'https://git.ravenwolf.org';
  const testOwner = 'test-owner';
  const testRepo = 'test-repo';
  const apiBaseUrl = `${testBaseUrl}/api/v1`;

  beforeEach(() => {
    fetchMock.setup();
    provider = new GiteaProvider({
      token: testToken,
      baseUrl: testBaseUrl,
      owner: testOwner,
      repo: testRepo,
      logger: createMockLogger(false),
    });
  });

  afterEach(() => {
    fetchMock.reset();
    jest.clearAllMocks();
  });

  describe('createRelease', () => {
    it('should create a release successfully', async () => {
      // Set GITHUB_SHA for the test (will be used as fallback)
      const originalSha = process.env.GITHUB_SHA;
      process.env.GITHUB_SHA = 'abc123def456789';

      const config = createMockReleaseConfig({
        tag: 'v1.0.0',
        name: 'v1.0.0',
        body: 'Test release',
      });

      // Mock tag existence check (tag doesn't exist)
      fetchMock.mock404(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/git/refs/tags/v1.0.0`
      );

      // Mock creating the tag (using GITHUB_SHA from environment)
      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/tags`,
        {
          status: 201,
          data: giteaResponses.createTag,
        }
      );

      // Mock creating the release
      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases`,
        {
          status: 201,
          data: giteaResponses.createRelease,
        }
      );

      const result = await provider.createRelease(config);

      // Restore original SHA
      if (originalSha) {
        process.env.GITHUB_SHA = originalSha;
      } else {
        delete process.env.GITHUB_SHA;
      }

      expect(result.id).toBe('123456');
      expect(result.html_url).toBe(giteaResponses.createRelease.html_url);
      expect(result.draft).toBe(false);
      expect(result.prerelease).toBe(false);

      const lastCall = fetchMock.getLastCall();
      expect(lastCall?.method).toBe('POST');
      expect(lastCall?.url).toContain('/releases');
      if (lastCall?.body) {
        const body = typeof lastCall.body === 'string' ? JSON.parse(lastCall.body) : lastCall.body;
        expect(body.tag_name).toBe('v1.0.0');
        expect(body.name).toBe('v1.0.0');
        expect(body.body).toBe('Test release');
      }
    });

    it('should create a draft release', async () => {
      // Set GITHUB_SHA for the test
      const originalSha = process.env.GITHUB_SHA;
      process.env.GITHUB_SHA = 'abc123def456789';

      const config = createMockReleaseConfig({
        tag: 'v1.0.0',
        draft: true,
      });

      // Mock tag existence check (tag doesn't exist)
      fetchMock.mock404(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/git/refs/tags/v1.0.0`
      );

      // Mock creating the tag
      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/tags`,
        {
          status: 201,
          data: giteaResponses.createTag,
        }
      );

      // Mock creating the release
      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases`,
        {
          status: 201,
          data: { ...giteaResponses.createRelease, draft: true },
        }
      );

      const result = await provider.createRelease(config);

      // Restore original SHA
      if (originalSha) {
        process.env.GITHUB_SHA = originalSha;
      } else {
        delete process.env.GITHUB_SHA;
      }

      expect(result.draft).toBe(true);
    });

    it('should create a prerelease', async () => {
      // Set GITHUB_SHA for the test
      const originalSha = process.env.GITHUB_SHA;
      process.env.GITHUB_SHA = 'abc123def456789';

      const config = createMockReleaseConfig({
        tag: 'v1.0.0-alpha.1',
        prerelease: true,
      });

      // Mock tag existence check (tag doesn't exist)
      fetchMock.mock404(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/git/refs/tags/v1.0.0-alpha.1`
      );

      // Mock creating the tag
      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/tags`,
        {
          status: 201,
          data: giteaResponses.createTag,
        }
      );

      // Mock creating the release
      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases`,
        {
          status: 201,
          data: { ...giteaResponses.createRelease, prerelease: true },
        }
      );

      const result = await provider.createRelease(config);

      // Restore original SHA
      if (originalSha) {
        process.env.GITHUB_SHA = originalSha;
      } else {
        delete process.env.GITHUB_SHA;
      }

      expect(result.prerelease).toBe(true);
    });

    it('should handle API errors', async () => {
      // Set GITHUB_SHA for the test (so it doesn't try to get default branch)
      const originalSha = process.env.GITHUB_SHA;
      process.env.GITHUB_SHA = 'abc123def456789';

      const config = createMockReleaseConfig();

      // Mock tag existence check (tag doesn't exist)
      fetchMock.mock404(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/git/refs/tags/v1.0.0`
      );

      // Mock creating the tag - this will fail
      fetchMock.mockError(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/tags`,
        403,
        'user does not have permission'
      );

      await expect(provider.createRelease(config)).rejects.toThrow('user does not have permission');

      // Restore original SHA
      if (originalSha) {
        process.env.GITHUB_SHA = originalSha;
      } else {
        delete process.env.GITHUB_SHA;
      }
    });
  });

  describe('updateRelease', () => {
    it('should update a release successfully', async () => {
      const releaseId = '123456';
      const config: Partial<ReleaseConfig> = {
        name: 'Updated Name',
        body: 'Updated body',
      };

      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases/${releaseId}`,
        {
          status: 200,
          data: giteaResponses.updateRelease,
        }
      );

      const result = await provider.updateRelease(releaseId, config);

      expect(result.id).toBe(releaseId);
      expect(result.html_url).toBe(giteaResponses.updateRelease.html_url);

      const lastCall = fetchMock.getLastCall();
      expect(lastCall?.method).toBe('PATCH');
    });

    it('should handle partial updates', async () => {
      const releaseId = '123456';
      const config: Partial<ReleaseConfig> = {
        draft: false,
      };

      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases/${releaseId}`,
        {
          status: 200,
          data: giteaResponses.updateRelease,
        }
      );

      await provider.updateRelease(releaseId, config);

      const lastCall = fetchMock.getLastCall();
      if (lastCall?.body) {
        const body = typeof lastCall.body === 'string' ? JSON.parse(lastCall.body) : lastCall.body;
        expect(body.draft).toBe(false);
      }
    });
  });

  describe('getReleaseByTag', () => {
    it('should get a release by tag successfully', async () => {
      const tag = 'v1.0.0';

      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases/tags/${tag}`,
        {
          status: 200,
          data: giteaResponses.getReleaseByTag,
        }
      );

      const result = await provider.getReleaseByTag(tag);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('123456');
      expect(result?.assets['artifact.zip']).toBeDefined();
      expect(result?.assets['artifact.zip']).toBe('https://git.ravenwolf.org/l3io/git-action-release-tests/releases/download/v1.0.0/artifact.zip');
    });

    it('should return null for non-existent release', async () => {
      const tag = 'v999.0.0';

      fetchMock.mock404(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases/tags/${tag}`
      );

      const result = await provider.getReleaseByTag(tag);

      expect(result).toBeNull();
    });
  });

  describe('uploadAsset', () => {
    it('should upload an asset successfully', async () => {
      const releaseId = '123456';
      const uploadUrl = `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases/${releaseId}/assets`;
      const testFile = path.join(os.tmpdir(), 'test-file.zip');
      const testContent = Buffer.from('test content');

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue({
        isFile: () => true,
        size: testContent.length,
      } as fs.Stats);
      mockedFs.readFileSync.mockReturnValue(testContent);

      fetchMock.mockResponse(
        new RegExp(`^${uploadUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
        {
          status: 201,
          data: giteaResponses.uploadAsset,
        }
      );

      const result = await provider.uploadAsset(releaseId, uploadUrl, {
        path: testFile,
        name: 'test-file.zip',
        contentType: 'application/zip',
      });

      expect(result).toBe(giteaResponses.uploadAsset.browser_download_url);

      const lastCall = fetchMock.getLastCall();
      expect(lastCall?.method).toBe('POST');
    });

    it('should throw error if file does not exist', async () => {
      const testFile = '/nonexistent/file.zip';

      mockedFs.existsSync.mockReturnValue(false);

      await expect(
        provider.uploadAsset('123456', 'https://example.com/upload', {
          path: testFile,
        })
      ).rejects.toThrow('Asset file not found');
    });
  });

  describe('deleteAsset', () => {
    it('should delete an asset successfully', async () => {
      const assetId = '789';

      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases/attachments/${assetId}`,
        {
          status: 204,
          data: {},
        }
      );

      await provider.deleteAsset(assetId);

      const lastCall = fetchMock.getLastCall();
      expect(lastCall?.method).toBe('DELETE');
      expect(lastCall?.url).toContain(assetId);
    });
  });

  describe('listAssets', () => {
    it('should list assets via getReleaseByTag', async () => {
      const releaseId = '123456';

      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases/tags/v1.0.0`,
        {
          status: 200,
          data: giteaResponses.getReleaseByTag,
        }
      );

      // listAssets calls getReleaseByTag internally for Gitea
      const result = await provider.listAssets('v1.0.0');

      expect(result.length).toBeGreaterThan(0);
    });

    it('should list assets via release ID', async () => {
      const releaseId = '123456';

      // First call for getReleaseByTag will return null (not found by tag)
      fetchMock.mock404(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases/tags/${releaseId}`
      );

      // Second call for getting by ID
      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases/${releaseId}`,
        {
          status: 200,
          data: giteaResponses.getReleaseByTag,
        }
      );

      const result = await provider.listAssets(releaseId);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('createTag', () => {
    it('should create a tag successfully', async () => {
      const tag = 'v1.0.0';
      const commit = 'abc123';
      const message = 'Release v1.0.0';

      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/tags`,
        {
          status: 201,
          data: giteaResponses.createTag,
        }
      );

      await provider.createTag(tag, commit, message);

      const lastCall = fetchMock.getLastCall();
      expect(lastCall?.method).toBe('POST');
      if (lastCall?.body) {
        const body = typeof lastCall.body === 'string' ? JSON.parse(lastCall.body) : lastCall.body;
        expect(body.tag_name).toBe(tag);
        expect(body.target).toBe(commit);
        expect(body.message).toBe(message);
      }
    });
  });

  describe('generateReleaseNotes', () => {
    it('should return empty string (Gitea does not support release notes)', async () => {
      const tag = 'v1.0.0';

      const result = await provider.generateReleaseNotes(tag);

      expect(result).toBe('');
    });
  });
});
