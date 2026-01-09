/**
 * Gitea-specific cleanup utilities for E2E tests
 */

import { GiteaProvider } from '../../platform/gitea';

/**
 * Cleanup configuration for Gitea
 */
interface GiteaCleanupConfig {
  token: string;
  owner: string;
  repo: string;
  apiBaseUrl: string;
}

/**
 * Get cleanup configuration from Gitea provider
 */
function getGiteaConfig(provider: GiteaProvider): GiteaCleanupConfig {
  // Access protected fields for cleanup purposes
  const giteaProvider = provider as any;
  return {
    token: giteaProvider.token,
    owner: giteaProvider.owner,
    repo: giteaProvider.repo,
    apiBaseUrl: giteaProvider.apiBaseUrl,
  };
}

/**
 * Delete a release via Gitea API
 */
async function deleteGiteaRelease(
  config: GiteaCleanupConfig,
  releaseId: string
): Promise<void> {
  const url = `${config.apiBaseUrl}/repos/${config.owner}/${config.repo}/releases/${releaseId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `token ${config.token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(
      `Failed to delete Gitea release ${releaseId}: HTTP ${response.status} ${response.statusText}: ${errorText}`
    );
  }
  
  // Note: Gitea automatically deletes tags when releases are deleted
}

/**
 * List all releases via Gitea API
 */
async function listGiteaReleases(
  config: GiteaCleanupConfig
): Promise<Array<{ id: number; tag_name: string }>> {
  const url = `${config.apiBaseUrl}/repos/${config.owner}/${config.repo}/releases`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `token ${config.token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(
      `Failed to list Gitea releases: HTTP ${response.status} ${response.statusText}: ${errorText}`
    );
  }

  const releases = (await response.json()) as Array<{
    id: number;
    tag_name: string;
  }>;
  return releases;
}

/**
 * Cleanup a Gitea release by tag
 * Note: Gitea automatically removes tags when releases are deleted
 */
export async function cleanupGiteaRelease(
  provider: GiteaProvider,
  tag: string
): Promise<void> {
  try {
    const release = await provider.getReleaseByTag(tag);
    if (!release) {
      // Release doesn't exist, nothing to clean up
      return;
    }

    const config = getGiteaConfig(provider);
    await deleteGiteaRelease(config, release.id);
    
    // Gitea automatically deletes tags when releases are deleted,
    // so no need to explicitly delete the tag
  } catch (error: any) {
    // Ignore errors - release might not exist or already be deleted
    if (
      error.message &&
      !error.message.includes('404') &&
      !error.message.includes('Not Found')
    ) {
      console.warn(
        `Error cleaning up Gitea release for tag ${tag}: ${error.message}`
      );
    }
  }
}

/**
 * Cleanup all Gitea test releases with a given tag prefix
 */
export async function cleanupAllGiteaTestReleases(
  provider: GiteaProvider,
  tagPrefix: string = 'test-'
): Promise<void> {
  try {
    const config = getGiteaConfig(provider);
    const releases = await listGiteaReleases(config);
    const testReleases = releases.filter((release) =>
      release.tag_name.startsWith(tagPrefix)
    );

    for (const release of testReleases) {
      try {
        await deleteGiteaRelease(config, release.id.toString());
        console.log(
          `Cleaned up Gitea release: ${release.tag_name} (${release.id})`
        );
      } catch (error: any) {
        console.warn(
          `Failed to cleanup Gitea release ${release.tag_name}: ${error.message}`
        );
      }
    }

    if (testReleases.length > 0) {
      console.log(
        `Cleaned up ${testReleases.length} Gitea test release(s) with prefix ${tagPrefix}`
      );
    }
  } catch (error: any) {
    console.warn(
      `Error cleaning up Gitea test releases with prefix ${tagPrefix}: ${error.message}`
    );
  }
}
