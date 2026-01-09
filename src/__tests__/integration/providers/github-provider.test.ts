/**
 * GitHub provider integration tests
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

import { GitHubProvider } from '../../../platform/github';
import { fetchMock, MockResponse } from '../mocks/fetch';
import { githubResponses } from '../mocks/github-responses';
import { createMockLogger, createMockReleaseConfig } from '../helpers/test-utils';
import { ReleaseConfig } from '../../../types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('GitHubProvider Integration Tests', () => {
  let provider: GitHubProvider;
  const testToken = 'test-token';
  const testOwner = 'test-owner';
  const testRepo = 'test-repo';
  const apiBaseUrl = 'https://api.github.com';

  beforeEach(() => {
    fetchMock.setup();
    provider = new GitHubProvider({
      token: testToken,
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
      const config = createMockReleaseConfig({
        tag: 'v1.0.0',
        name: 'v1.0.0',
        body: 'Test release',
      });

      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases`,
        {
          status: 201,
          data: githubResponses.createRelease,
        }
      );

      const result = await provider.createRelease(config);

      expect(result.id).toBe('123456');
      expect(result.html_url).toBe(githubResponses.createRelease.html_url);
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
      const config = createMockReleaseConfig({
        tag: 'v1.0.0',
        draft: true,
      });

      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases`,
        {
          status: 201,
          data: { ...githubResponses.createRelease, draft: true },
        }
      );

      const result = await provider.createRelease(config);

      expect(result.draft).toBe(true);
    });

    it('should create a prerelease', async () => {
      const config = createMockReleaseConfig({
        tag: 'v1.0.0-alpha.1',
        prerelease: true,
      });

      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases`,
        {
          status: 201,
          data: { ...githubResponses.createRelease, prerelease: true },
        }
      );

      const result = await provider.createRelease(config);

      expect(result.prerelease).toBe(true);
    });

    it('should handle API errors', async () => {
      const config = createMockReleaseConfig();

      fetchMock.mockError(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases`,
        401,
        'Bad credentials'
      );

      await expect(provider.createRelease(config)).rejects.toThrow('Bad credentials');
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
          data: githubResponses.updateRelease,
        }
      );

      const result = await provider.updateRelease(releaseId, config);

      expect(result.id).toBe(releaseId);
      expect(result.html_url).toBe(githubResponses.updateRelease.html_url);

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
          data: githubResponses.updateRelease,
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
          data: githubResponses.getReleaseByTag,
        }
      );

      const result = await provider.getReleaseByTag(tag);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('123456');
      expect(result?.assets['artifact.zip']).toBeDefined();
      expect(result?.assets['artifact.zip']).toBe('https://github.com/owner/repo/releases/download/v1.0.0/artifact.zip');
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
      const uploadUrl = `https://uploads.github.com/repos/${testOwner}/${testRepo}/releases/${releaseId}/assets`;
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
          data: githubResponses.uploadAsset,
        }
      );

      const result = await provider.uploadAsset(releaseId, uploadUrl, {
        path: testFile,
        name: 'test-file.zip',
        contentType: 'application/zip',
      });

      expect(result).toBe(githubResponses.uploadAsset.browser_download_url);

      const lastCall = fetchMock.getLastCall();
      expect(lastCall?.method).toBe('POST');
      expect(lastCall?.url).toContain('test-file.zip');
    });

    it('should throw error if file does not exist', async () => {
      const testFile = '/nonexistent/file.zip';

      mockedFs.existsSync.mockReturnValue(false);

      await expect(
        provider.uploadAsset('123456', 'https://uploads.github.com/upload', {
          path: testFile,
        })
      ).rejects.toThrow('Asset file not found');
    });
  });

  describe('deleteAsset', () => {
    it('should delete an asset successfully', async () => {
      const assetId = '789';

      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases/assets/${assetId}`,
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
    it('should list assets successfully', async () => {
      const releaseId = '123456';

      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases/${releaseId}/assets`,
        {
          status: 200,
          data: githubResponses.listAssets,
        }
      );

      const result = await provider.listAssets(releaseId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('artifact.zip');
      expect(result[0].id).toBe('789');
    });
  });

  describe('createTag', () => {
    it('should create a lightweight tag', async () => {
      const tag = 'v1.0.0';
      const commit = 'abc123';

      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/git/refs`,
        {
          status: 201,
          data: githubResponses.createTagRef,
        }
      );

      await provider.createTag(tag, commit);

      const lastCall = fetchMock.getLastCall();
      expect(lastCall?.method).toBe('POST');
      if (lastCall?.body) {
        const body = typeof lastCall.body === 'string' ? JSON.parse(lastCall.body) : lastCall.body;
        expect(body.ref).toBe(`refs/tags/${tag}`);
        expect(body.sha).toBe(commit);
      }
    });

    it('should create an annotated tag with message', async () => {
      const tag = 'v1.0.0';
      const commit = 'abc123';
      const message = 'Release v1.0.0';

      // Mock ref creation
      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/git/refs`,
        {
          status: 201,
          data: githubResponses.createTagRef,
        }
      );

      // Mock tag object creation
      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/git/tags`,
        {
          status: 201,
          data: githubResponses.createTagObject,
        }
      );

      // Mock ref update
      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/git/refs/tags/${tag}`,
        {
          status: 200,
          data: {},
        }
      );

      await provider.createTag(tag, commit, message);

      const calls = fetchMock.getCalls();
      expect(calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('generateReleaseNotes', () => {
    it('should generate release notes successfully', async () => {
      const tag = 'v1.0.0';

      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases/generate-notes`,
        {
          status: 201,
          data: githubResponses.generateReleaseNotes,
        }
      );

      const result = await provider.generateReleaseNotes(tag);

      expect(result).toBe(githubResponses.generateReleaseNotes.body);
      expect(result).toContain("What's Changed");

      const lastCall = fetchMock.getLastCall();
      expect(lastCall?.method).toBe('POST');
      if (lastCall?.body) {
        const body = typeof lastCall.body === 'string' ? JSON.parse(lastCall.body) : lastCall.body;
        expect(body.tag_name).toBe(tag);
      }
    });

    it('should generate release notes with previous tag', async () => {
      const tag = 'v1.0.0';
      const previousTag = 'v0.9.0';

      fetchMock.mockResponse(
        `${apiBaseUrl}/repos/${testOwner}/${testRepo}/releases/generate-notes`,
        {
          status: 201,
          data: githubResponses.generateReleaseNotes,
        }
      );

      await provider.generateReleaseNotes(tag, previousTag);

      const lastCall = fetchMock.getLastCall();
      if (lastCall?.body) {
        const body = typeof lastCall.body === 'string' ? JSON.parse(lastCall.body) : lastCall.body;
        expect(body.previous_tag_name).toBe(previousTag);
      }
    });
  });
});
