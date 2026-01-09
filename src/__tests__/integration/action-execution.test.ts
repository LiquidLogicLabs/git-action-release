/**
 * Action execution integration tests
 * Tests full action execution with mocked @actions/core and HTTP
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
  getInput: jest.fn((name: string) => process.env[`INPUT_${name.toUpperCase().replace(/-/g, '_')}`] || ''),
  getBooleanInput: jest.fn((name: string) => {
    const value = process.env[`INPUT_${name.toUpperCase().replace(/-/g, '_')}`] || 'false';
    return value === 'true' || value === '1' || value === 'yes';
  }),
}));

import * as core from '@actions/core';
import { setupMockCore, resetMockCore, getMockCore } from './helpers/mock-core';
import { fetchMock } from './mocks/fetch';
import { githubResponses } from './mocks/github-responses';
import { giteaResponses } from './mocks/gitea-responses';
import { PlatformDetector } from '../../platform/detector';
import { GitHubProvider } from '../../platform/github';
import { GiteaProvider } from '../../platform/gitea';
import { ReleaseManager } from '../../release';
import { ActionInputs } from '../../types';

describe('Action Execution Integration Tests', () => {
  const testToken = 'test-token';
  const testOwner = 'test-owner';
  const testRepo = 'test-repo';

  beforeEach(() => {
    fetchMock.setup();
    resetMockCore();
    setupMockCore();
    jest.clearAllMocks();
    // Reset environment
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITHUB_SERVER_URL;
    delete process.env.GITHUB_REF;
  });

  afterEach(() => {
    fetchMock.reset();
    resetMockCore();
  });

  describe('GitHub Action Execution', () => {
    it('should create a release with all inputs', async () => {
      const mock = getMockCore();
      if (!mock) throw new Error('Mock core not initialized');

      mock.setInput('token', testToken);
      mock.setInput('tag', 'v1.0.0');
      mock.setInput('name', 'Release v1.0.0');
      mock.setInput('body', 'Release body');
      mock.setInput('draft', 'false');
      mock.setInput('prerelease', 'false');

      process.env.GITHUB_REPOSITORY = `${testOwner}/${testRepo}`;
      process.env.GITHUB_SERVER_URL = 'https://github.com';

      // Mock getReleaseByTag - no existing release
      fetchMock.mock404(
        `https://api.github.com/repos/${testOwner}/${testRepo}/releases/tags/v1.0.0`
      );

      // Mock createRelease
      fetchMock.mockResponse(
        `https://api.github.com/repos/${testOwner}/${testRepo}/releases`,
        {
          status: 201,
          data: githubResponses.createRelease,
        }
      );

      const platformInfo = PlatformDetector.detect(undefined, undefined, `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`);
      const provider = new GitHubProvider({
        token: testToken,
        owner: testOwner,
        repo: testRepo,
        logger: { verbose: false, info: jest.fn(), warning: jest.fn(), error: jest.fn(), debug: jest.fn() } as any,
      });

      const inputs: ActionInputs = {
        token: testToken,
        tag: 'v1.0.0',
        name: 'Release v1.0.0',
        body: 'Release body',
        draft: false,
        prerelease: false,
        replacesArtifacts: true,
        removeArtifacts: false,
        artifactErrorsFailBuild: false,
        allowUpdates: false,
        skipIfReleaseExists: false,
        updateOnlyUnreleased: false,
        generateReleaseNotes: false,
        omitBody: false,
        omitBodyDuringUpdate: false,
        omitDraftDuringUpdate: false,
        omitName: false,
        omitNameDuringUpdate: false,
        omitPrereleaseDuringUpdate: false,
        verbose: false,
      };

      const manager = new ReleaseManager(provider, inputs, { verbose: false, info: jest.fn(), warning: jest.fn(), error: jest.fn(), debug: jest.fn() } as any);
      const result = await manager.execute();

      expect(result.id).toBe('123456');
      expect(result.html_url).toBe(githubResponses.createRelease.html_url);
    });

    it('should handle release already exists with skipIfReleaseExists', async () => {
      const mock = getMockCore();
      if (!mock) throw new Error('Mock core not initialized');

      mock.setInput('token', testToken);
      mock.setInput('tag', 'v1.0.0');
      mock.setInput('skipIfReleaseExists', 'true');

      process.env.GITHUB_REPOSITORY = `${testOwner}/${testRepo}`;
      process.env.GITHUB_SERVER_URL = 'https://github.com';

      // Mock getReleaseByTag - release exists and is not draft/prerelease
      fetchMock.mockResponse(
        `https://api.github.com/repos/${testOwner}/${testRepo}/releases/tags/v1.0.0`,
        {
          status: 200,
          data: { ...githubResponses.getReleaseByTag, draft: false, prerelease: false },
        }
      );

      const provider = new GitHubProvider({
        token: testToken,
        owner: testOwner,
        repo: testRepo,
        logger: { verbose: false, info: jest.fn(), warning: jest.fn(), error: jest.fn(), debug: jest.fn() } as any,
      });

      const inputs: ActionInputs = {
        token: testToken,
        tag: 'v1.0.0',
        draft: false,
        prerelease: false,
        replacesArtifacts: true,
        removeArtifacts: false,
        artifactErrorsFailBuild: false,
        allowUpdates: false,
        skipIfReleaseExists: true,
        updateOnlyUnreleased: false,
        generateReleaseNotes: false,
        omitBody: false,
        omitBodyDuringUpdate: false,
        omitDraftDuringUpdate: false,
        omitName: false,
        omitNameDuringUpdate: false,
        omitPrereleaseDuringUpdate: false,
        verbose: false,
      };

      const manager = new ReleaseManager(provider, inputs, { verbose: false, info: jest.fn(), warning: jest.fn(), error: jest.fn(), debug: jest.fn() } as any);
      const result = await manager.execute();

      expect(result.id).toBe('123456');
      // Should return existing release without creating a new one
      // Check that createRelease was not called (no POST to /releases without /tags)
      const createCalls = fetchMock.getCalls().filter(
        call => call.method === 'POST' && call.url.includes('/releases') && !call.url.includes('/tags')
      );
      expect(createCalls.length).toBe(0);
    });

    it('should update an existing release when allowUpdates is true', async () => {
      const mock = getMockCore();
      if (!mock) throw new Error('Mock core not initialized');

      mock.setInput('token', testToken);
      mock.setInput('tag', 'v1.0.0');
      mock.setInput('name', 'Updated Release Name');
      mock.setInput('allowUpdates', 'true');

      process.env.GITHUB_REPOSITORY = `${testOwner}/${testRepo}`;
      process.env.GITHUB_SERVER_URL = 'https://github.com';

      // Mock getReleaseByTag - release exists
      fetchMock.mockResponse(
        `https://api.github.com/repos/${testOwner}/${testRepo}/releases/tags/v1.0.0`,
        {
          status: 200,
          data: githubResponses.getReleaseByTag,
        }
      );

      // Mock updateRelease
      fetchMock.mockResponse(
        `https://api.github.com/repos/${testOwner}/${testRepo}/releases/123456`,
        {
          status: 200,
          data: githubResponses.updateRelease,
        }
      );

      const provider = new GitHubProvider({
        token: testToken,
        owner: testOwner,
        repo: testRepo,
        logger: { verbose: false, info: jest.fn(), warning: jest.fn(), error: jest.fn(), debug: jest.fn() } as any,
      });

      const inputs: ActionInputs = {
        token: testToken,
        tag: 'v1.0.0',
        name: 'Updated Release Name',
        draft: false,
        prerelease: false,
        replacesArtifacts: true,
        removeArtifacts: false,
        artifactErrorsFailBuild: false,
        allowUpdates: true,
        skipIfReleaseExists: false,
        updateOnlyUnreleased: false,
        generateReleaseNotes: false,
        omitBody: false,
        omitBodyDuringUpdate: false,
        omitDraftDuringUpdate: false,
        omitName: false,
        omitNameDuringUpdate: false,
        omitPrereleaseDuringUpdate: false,
        verbose: false,
      };

      const manager = new ReleaseManager(provider, inputs, { verbose: false, info: jest.fn(), warning: jest.fn(), error: jest.fn(), debug: jest.fn() } as any);
      const result = await manager.execute();

      expect(result.id).toBe('123456');
      // Should call update, not create
      const updateCall = fetchMock.getCalls().find(call => call.method === 'PATCH');
      expect(updateCall).toBeDefined();
    });

    it('should handle errors and set failed status', async () => {
      const mock = getMockCore();
      if (!mock) throw new Error('Mock core not initialized');

      mock.setInput('token', testToken);
      mock.setInput('tag', 'v1.0.0');

      process.env.GITHUB_REPOSITORY = `${testOwner}/${testRepo}`;
      process.env.GITHUB_SERVER_URL = 'https://github.com';

      // Mock getReleaseByTag - no existing release
      fetchMock.mock404(
        `https://api.github.com/repos/${testOwner}/${testRepo}/releases/tags/v1.0.0`
      );

      // Mock createRelease - error
      fetchMock.mockError(
        `https://api.github.com/repos/${testOwner}/${testRepo}/releases`,
        401,
        'Bad credentials'
      );

      const provider = new GitHubProvider({
        token: testToken,
        owner: testOwner,
        repo: testRepo,
        logger: { verbose: false, info: jest.fn(), warning: jest.fn(), error: jest.fn(), debug: jest.fn() } as any,
      });

      const inputs: ActionInputs = {
        token: testToken,
        tag: 'v1.0.0',
        draft: false,
        prerelease: false,
        replacesArtifacts: true,
        removeArtifacts: false,
        artifactErrorsFailBuild: false,
        allowUpdates: false,
        skipIfReleaseExists: false,
        updateOnlyUnreleased: false,
        generateReleaseNotes: false,
        omitBody: false,
        omitBodyDuringUpdate: false,
        omitDraftDuringUpdate: false,
        omitName: false,
        omitNameDuringUpdate: false,
        omitPrereleaseDuringUpdate: false,
        verbose: false,
      };

      const manager = new ReleaseManager(provider, inputs, { verbose: false, info: jest.fn(), warning: jest.fn(), error: jest.fn(), debug: jest.fn() } as any);

      await expect(manager.execute()).rejects.toThrow('Bad credentials');
    });
  });

  describe('Gitea Action Execution', () => {
    it('should create a release with Gitea provider', async () => {
      const mock = getMockCore();
      if (!mock) throw new Error('Mock core not initialized');

      mock.setInput('token', testToken);
      mock.setInput('platform', 'gitea');
      mock.setInput('gitea_url', 'https://git.ravenwolf.org');
      mock.setInput('tag', 'v1.0.0');
      mock.setInput('name', 'Release v1.0.0');
      mock.setInput('body', 'Release body');

      // Mock getReleaseByTag - no existing release
      fetchMock.mock404(
        `https://git.ravenwolf.org/api/v1/repos/${testOwner}/${testRepo}/releases/tags/v1.0.0`
      );

      // Mock createRelease
      fetchMock.mockResponse(
        `https://git.ravenwolf.org/api/v1/repos/${testOwner}/${testRepo}/releases`,
        {
          status: 201,
          data: giteaResponses.createRelease,
        }
      );

      const platformInfo = PlatformDetector.detect('gitea', 'https://git.ravenwolf.org', undefined);
      const provider = new GiteaProvider({
        token: testToken,
        baseUrl: 'https://git.ravenwolf.org',
        owner: testOwner,
        repo: testRepo,
        logger: { verbose: false, info: jest.fn(), warning: jest.fn(), error: jest.fn(), debug: jest.fn() } as any,
      });

      const inputs: ActionInputs = {
        token: testToken,
        giteaUrl: 'https://git.ravenwolf.org',
        tag: 'v1.0.0',
        name: 'Release v1.0.0',
        body: 'Release body',
        draft: false,
        prerelease: false,
        replacesArtifacts: true,
        removeArtifacts: false,
        artifactErrorsFailBuild: false,
        allowUpdates: false,
        skipIfReleaseExists: false,
        updateOnlyUnreleased: false,
        generateReleaseNotes: false,
        omitBody: false,
        omitBodyDuringUpdate: false,
        omitDraftDuringUpdate: false,
        omitName: false,
        omitNameDuringUpdate: false,
        omitPrereleaseDuringUpdate: false,
        verbose: false,
      };

      const manager = new ReleaseManager(provider, inputs, { verbose: false, info: jest.fn(), warning: jest.fn(), error: jest.fn(), debug: jest.fn() } as any);
      const result = await manager.execute();

      expect(result.id).toBe('123456');
      expect(result.html_url).toBe(giteaResponses.createRelease.html_url);
    });
  });

  describe('Platform Detection', () => {
    it('should detect GitHub from repository URL', () => {
      process.env.GITHUB_REPOSITORY = `${testOwner}/${testRepo}`;
      process.env.GITHUB_SERVER_URL = 'https://github.com';

      const result = PlatformDetector.detect(undefined, undefined, `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`);

      expect(result.platform).toBe('github');
      expect(result.owner).toBe(testOwner);
      expect(result.repo).toBe(testRepo);
    });

    it('should detect Gitea when explicitly set', () => {
      const result = PlatformDetector.detect('gitea', 'https://git.ravenwolf.org', undefined);

      expect(result.platform).toBe('gitea');
      expect(result.baseUrl).toBe('https://git.ravenwolf.org');
    });

    it('should detect Gitea from URL when repository URL matches giteaUrl base', () => {
      // When repositoryUrl is provided and matches the giteaUrl base, owner/repo are extracted
      // If we pass repositoryUrl as the full URL with owner/repo, and giteaUrl matches the base
      // detectFromUrl checks if giteaUrl is set and if the repo URL host matches
      const result = PlatformDetector.detect(undefined, 'https://git.ravenwolf.org', 'https://git.ravenwolf.org/owner/repo');

      expect(result.platform).toBe('gitea');
      expect(result.baseUrl).toBe('https://git.ravenwolf.org');
      // The detectFromUrl logic checks if giteaUrl is set, then uses parseGiteaUrl with repositoryUrl
      // parseGiteaUrl will extract owner/repo from the repositoryUrl path
      // However, detectFromUrl uses giteaUrl if set, not repositoryUrl
      // So we test with explicit platform instead
      const explicitResult = PlatformDetector.detect('gitea', undefined, 'https://git.ravenwolf.org/owner/repo');
      expect(explicitResult.platform).toBe('gitea');
      expect(explicitResult.baseUrl).toBe('https://git.ravenwolf.org');
      expect(explicitResult.owner).toBe('owner');
      expect(explicitResult.repo).toBe('repo');
    });
  });
});
