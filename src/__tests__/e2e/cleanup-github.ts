/**
 * GitHub-specific cleanup utilities for E2E tests
 */

import { GitHubProvider } from '../../platform/github';
import { IProvider } from '../../types';

/**
 * Cleanup configuration for GitHub
 */
interface GitHubCleanupConfig {
  token: string;
  owner: string;
  repo: string;
}

/**
 * Get cleanup configuration from GitHub provider
 */
function getGitHubConfig(provider: GitHubProvider): GitHubCleanupConfig {
  // Access protected fields for cleanup purposes
  const githubProvider = provider as any;
  return {
    token: githubProvider.token,
    owner: githubProvider.owner,
    repo: githubProvider.repo,
  };
}

/**
 * Delete a release via GitHub API
 */
async function deleteGitHubRelease(
  config: GitHubCleanupConfig,
  releaseId: string
): Promise<void> {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/releases/${releaseId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `token ${config.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(
      `Failed to delete GitHub release ${releaseId}: HTTP ${response.status} ${response.statusText}: ${errorText}`
    );
  }
}

/**
 * Delete a tag via GitHub API
 */
async function deleteGitHubTag(
  config: GitHubCleanupConfig,
  tag: string
): Promise<void> {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/git/refs/tags/${tag}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `token ${config.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(
      `Failed to delete GitHub tag ${tag}: HTTP ${response.status} ${response.statusText}: ${errorText}`
    );
  }
}

/**
 * List all releases via GitHub API
 */
async function listGitHubReleases(
  config: GitHubCleanupConfig
): Promise<Array<{ id: number; tag_name: string }>> {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/releases`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `token ${config.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(
      `Failed to list GitHub releases: HTTP ${response.status} ${response.statusText}: ${errorText}`
    );
  }

  const releases = (await response.json()) as Array<{
    id: number;
    tag_name: string;
  }>;
  return releases;
}

/**
 * Cleanup a GitHub release by tag
 */
export async function cleanupGitHubRelease(
  provider: GitHubProvider,
  tag: string
): Promise<void> {
  try {
    const release = await provider.getReleaseByTag(tag);
    if (!release) {
      // Release doesn't exist, nothing to clean up
      return;
    }

    const config = getGitHubConfig(provider);
    await deleteGitHubRelease(config, release.id);
    
    // Also delete the tag ref (GitHub requires explicit tag deletion)
    try {
      await deleteGitHubTag(config, tag);
    } catch (error: any) {
      // Tag might already be deleted or not exist, that's okay
      if (!error.message?.includes('404') && !error.message?.includes('Not Found')) {
        console.warn(`Failed to delete GitHub tag ${tag}: ${error.message}`);
      }
    }
  } catch (error: any) {
    // Ignore errors - release might not exist or already be deleted
    if (
      error.message &&
      !error.message.includes('404') &&
      !error.message.includes('Not Found')
    ) {
      console.warn(
        `Error cleaning up GitHub release for tag ${tag}: ${error.message}`
      );
    }
  }
}

/**
 * Cleanup all GitHub test releases with a given tag prefix
 */
export async function cleanupAllGitHubTestReleases(
  provider: GitHubProvider,
  tagPrefix: string = 'test-'
): Promise<void> {
  try {
    const config = getGitHubConfig(provider);
    const releases = await listGitHubReleases(config);
    const testReleases = releases.filter((release) =>
      release.tag_name.startsWith(tagPrefix)
    );

    for (const release of testReleases) {
      try {
        await deleteGitHubRelease(config, release.id.toString());
        // Also delete the tag
        try {
          await deleteGitHubTag(config, release.tag_name);
        } catch (error: any) {
          // Tag might already be deleted, that's okay
        }
        console.log(
          `Cleaned up GitHub release: ${release.tag_name} (${release.id})`
        );
      } catch (error: any) {
        console.warn(
          `Failed to cleanup GitHub release ${release.tag_name}: ${error.message}`
        );
      }
    }

    if (testReleases.length > 0) {
      console.log(
        `Cleaned up ${testReleases.length} GitHub test release(s) with prefix ${tagPrefix}`
      );
    }
  } catch (error: any) {
    console.warn(
      `Error cleaning up GitHub test releases with prefix ${tagPrefix}: ${error.message}`
    );
  }
}
