/**
 * Platform-agnostic cleanup utilities for E2E tests
 * Delegates to platform-specific implementations
 */

import { IProvider } from '../../types';
import { GitHubProvider } from '../../platform/github';
import { GiteaProvider } from '../../platform/gitea';
import {
  cleanupGitHubRelease,
  cleanupAllGitHubTestReleases,
} from './cleanup-github';
import {
  cleanupGiteaRelease,
  cleanupAllGiteaTestReleases,
} from './cleanup-gitea';

/**
 * Generate a unique test tag
 */
export function generateTestTag(prefix: string = 'test-'): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Cleanup a release by tag
 * Delegates to platform-specific cleanup implementation
 */
export async function cleanupRelease(
  provider: IProvider,
  tag: string
): Promise<void> {
  if (provider instanceof GitHubProvider) {
    await cleanupGitHubRelease(provider, tag);
  } else if (provider instanceof GiteaProvider) {
    await cleanupGiteaRelease(provider, tag);
  } else {
    console.warn(
      `Cannot cleanup release for tag ${tag}: Unknown provider type. Expected GitHubProvider or GiteaProvider.`
    );
  }
}

/**
 * Cleanup a tag
 * Note: Tags are typically deleted when releases are deleted
 * This is primarily for cleaning up orphaned tags
 */
export async function cleanupTag(
  provider: IProvider,
  tag: string
): Promise<void> {
  if (provider instanceof GitHubProvider) {
    // GitHub cleanup handles tag deletion automatically
    // If needed, we could add explicit tag cleanup here
    console.warn(
      `Tag cleanup for GitHub should be handled via cleanupRelease. Tag: ${tag}`
    );
  } else if (provider instanceof GiteaProvider) {
    // Gitea tags are automatically deleted when releases are deleted
    console.warn(
      `Tag cleanup for Gitea is automatic when releases are deleted. Tag: ${tag}`
    );
  } else {
    console.warn(
      `Cannot cleanup tag ${tag}: Unknown provider type. Expected GitHubProvider or GiteaProvider.`
    );
  }
}

/**
 * Cleanup all test releases with a given tag prefix
 * Delegates to platform-specific cleanup implementation
 */
export async function cleanupAllTestReleases(
  provider: IProvider,
  tagPrefix: string = 'test-'
): Promise<void> {
  if (provider instanceof GitHubProvider) {
    await cleanupAllGitHubTestReleases(provider, tagPrefix);
  } else if (provider instanceof GiteaProvider) {
    await cleanupAllGiteaTestReleases(provider, tagPrefix);
  } else {
    console.warn(
      `Cannot cleanup releases with prefix ${tagPrefix}: Unknown provider type. Expected GitHubProvider or GiteaProvider.`
    );
  }
}
