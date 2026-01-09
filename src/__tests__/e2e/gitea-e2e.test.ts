/**
 * Gitea E2E tests
 * Full end-to-end tests that make real API calls to Gitea
 */

import { GiteaProvider } from '../../platform/gitea';
import { ReleaseManager } from '../../release';
import { ActionInputs, ReleaseConfig } from '../../types';
import { Logger } from '../../logger';
import { cleanupRelease, generateTestTag } from './cleanup';

describe('Gitea E2E Tests', () => {
  const TEST_REPO = process.env.TEST_GITEA_REPO || 'l3io/git-action-release-tests';
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
    const config: ReleaseConfig = {
      tag: testTag,
      name: `E2E Test Release ${testTag}`,
      body: 'This is a test release created by E2E tests',
      draft: false,
      prerelease: false,
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
    const config: ReleaseConfig = {
      tag: testTag,
      name: `E2E Test Draft Release ${testTag}`,
      body: 'This is a draft release',
      draft: true,
      prerelease: false,
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
    // Create a release first
    const createConfig: ReleaseConfig = {
      tag: testTag,
      name: `E2E Test Release ${testTag}`,
      body: 'Original body',
      draft: false,
      prerelease: false,
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

    const inputs: ActionInputs = {
      token: TEST_TOKEN,
      giteaUrl: TEST_GITEA_URL,
      tag: testTag,
      name: `E2E Test Release via Manager ${testTag}`,
      body: 'Release created via ReleaseManager',
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
    const config: ReleaseConfig = {
      tag: testTag,
      name: `E2E Test Self-Hosted ${testTag}`,
      body: 'Testing self-hosted Gitea',
      draft: false,
      prerelease: false,
    };

    const result = await provider.createRelease(config);

    expect(result.id).toBeDefined();
    expect(result.html_url).toContain(TEST_GITEA_URL);
  }, 30000);
});
