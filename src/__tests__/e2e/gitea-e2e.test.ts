/**
 * Gitea E2E tests
 * Full end-to-end tests that make real API calls to Gitea
 */

import { GiteaProvider } from '../../platform/gitea';
import { ReleaseManager } from '../../release';
import { ActionInputs, ReleaseConfig } from '../../types';
import { Logger } from '../../logger';
import { cleanupRelease, generateTestTag } from './cleanup';

async function getDefaultBranchSha(baseUrl: string, owner: string, repo: string, token: string): Promise<string> {
  const repoUrl = `${baseUrl.replace(/\/$/, '')}/api/v1/repos/${owner}/${repo}`;
  const repoResponse = await fetch(repoUrl, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/json',
    },
  });
  if (!repoResponse.ok) {
    throw new Error(`Failed to fetch repository info: ${repoResponse.status} ${repoResponse.statusText}`);
  }
  const repoData = (await repoResponse.json()) as { default_branch?: string };
  if (!repoData.default_branch) {
    throw new Error('Repository default branch not found');
  }

  const refUrl = `${baseUrl.replace(/\/$/, '')}/api/v1/repos/${owner}/${repo}/git/refs/heads/${repoData.default_branch}`;
  const refResponse = await fetch(refUrl, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/json',
    },
  });
  if (!refResponse.ok) {
    throw new Error(`Failed to fetch default branch ref: ${refResponse.status} ${refResponse.statusText}`);
  }
  const refData = (await refResponse.json()) as
    | { object?: { sha?: string }; sha?: string; commit?: { sha?: string } }
    | Array<{ object?: { sha?: string }; sha?: string; commit?: { sha?: string } }>;
  const normalized = Array.isArray(refData) ? refData[0] : refData;
  const sha = normalized?.object?.sha || normalized?.sha || normalized?.commit?.sha;
  if (!sha) {
    throw new Error(`Default branch HEAD SHA not found. Response: ${JSON.stringify(refData)}`);
  }
  return sha;
}

describe('Gitea E2E Tests', () => {
  const TEST_REPO = process.env.TEST_GITEA_REPO || 'liquidlogiclabs/git-action-release-tests';
  const TEST_GITEA_URL = process.env.TEST_GITEA_URL || 'https://git.ravenwolf.org';
  const TEST_TOKEN = process.env.GITEA_TOKEN;
  const [testOwner, testRepo] = TEST_REPO.split('/');

  let provider: GiteaProvider;
  let testTag: string;

  beforeAll(() => {
    if (!TEST_TOKEN) {
      throw new Error('GITEA_TOKEN required for Gitea E2E tests');
    }

    provider = new GiteaProvider({
      token: TEST_TOKEN,
      baseUrl: TEST_GITEA_URL,
      owner: testOwner,
      repo: testRepo,
      logger: new Logger(process.env.VERBOSE === 'true'),
    });
  });

  beforeEach(() => {
    // Generate a unique tag for each test
    testTag = generateTestTag('test-e2e-');
  });

  afterEach(async () => {
    // Cleanup: Delete releases/tags created during tests
    if (testTag) {
      try {
        await cleanupRelease(provider, testTag);
      } catch (error: any) {
        // Ignore cleanup errors - they're not critical for test results
        console.warn(`Cleanup warning for tag ${testTag}: ${error.message}`);
      }
    }
  });

  it('should create a release', async () => {
    const commit = await getDefaultBranchSha(TEST_GITEA_URL, testOwner, testRepo, TEST_TOKEN as string);
    const config: ReleaseConfig = {
      tag: testTag,
      name: `E2E Test Release ${testTag}`,
      body: 'This is a test release created by E2E tests',
      draft: false,
      prerelease: false,
      commit,
    };

    const result = await provider.createRelease(config);

    expect(result.id).toBeDefined();
    expect(result.html_url).toBeDefined();
    expect(result.html_url).toContain(testTag);

    // Verify release exists
    const release = await provider.getReleaseByTag(testTag);
    expect(release).not.toBeNull();
    expect(release?.id).toBe(result.id);
  }, 30000);

  it('should create a draft release', async () => {
    const commit = await getDefaultBranchSha(TEST_GITEA_URL, testOwner, testRepo, TEST_TOKEN as string);
    const config: ReleaseConfig = {
      tag: testTag,
      name: `E2E Test Draft Release ${testTag}`,
      body: 'This is a draft release',
      draft: true,
      prerelease: false,
      commit,
    };

    const result = await provider.createRelease(config);

    expect(result.id).toBeDefined();
    expect(result.draft).toBe(true);

    // Verify release exists and is draft
    const release = await provider.getReleaseByTag(testTag);
    expect(release).not.toBeNull();
    expect(release?.draft).toBe(true);
  }, 30000);

  it('should update an existing release', async () => {
    const commit = await getDefaultBranchSha(TEST_GITEA_URL, testOwner, testRepo, TEST_TOKEN as string);
    // Create a release first
    const createConfig: ReleaseConfig = {
      tag: testTag,
      name: `E2E Test Release ${testTag}`,
      body: 'Original body',
      draft: false,
      prerelease: false,
      commit,
    };

    const created = await provider.createRelease(createConfig);
    expect(created.id).toBeDefined();

    // Update the release
    const updateConfig: Partial<ReleaseConfig> = {
      name: `Updated E2E Test Release ${testTag}`,
      body: 'Updated body',
    };

    const updated = await provider.updateRelease(created.id, updateConfig);

    expect(updated.id).toBe(created.id);
    expect(updated.html_url).toBe(created.html_url);

    // Verify update
    const release = await provider.getReleaseByTag(testTag);
    expect(release).not.toBeNull();
    expect(release?.id).toBe(created.id);
  }, 30000);

  it('should handle release not found', async () => {
    const nonExistentTag = `non-existent-${Date.now()}`;
    const release = await provider.getReleaseByTag(nonExistentTag);

    expect(release).toBeNull();
  }, 30000);

  it('should create a release via ReleaseManager', async () => {
    if (!TEST_TOKEN) {
      throw new Error('GITEA_TOKEN is required');
    }

    const commit = await getDefaultBranchSha(TEST_GITEA_URL, testOwner, testRepo, TEST_TOKEN);
    const inputs: ActionInputs = {
      token: TEST_TOKEN,
      tag: testTag,
      name: `E2E Test Release via Manager ${testTag}`,
      body: 'Release created via ReleaseManager',
      draft: false,
      prerelease: false,
      commit,
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
      verbose: process.env.VERBOSE === 'true',
    };

    const manager = new ReleaseManager(provider, inputs, new Logger(inputs.verbose));
    const result = await manager.execute();

    expect(result.id).toBeDefined();
    expect(result.html_url).toBeDefined();
    expect(result.html_url).toContain(testTag);
  }, 30000);

  it('should handle self-hosted Gitea URL correctly', async () => {
    expect(provider).toBeDefined();
    // Verify provider is configured with correct base URL
    const commit = await getDefaultBranchSha(TEST_GITEA_URL, testOwner, testRepo, TEST_TOKEN as string);
    const config: ReleaseConfig = {
      tag: testTag,
      name: `E2E Test Self-Hosted ${testTag}`,
      body: 'Testing self-hosted Gitea',
      draft: false,
      prerelease: false,
      commit,
    };

    const result = await provider.createRelease(config);

    expect(result.id).toBeDefined();
    expect(result.html_url).toContain(TEST_GITEA_URL);
  }, 30000);
});
