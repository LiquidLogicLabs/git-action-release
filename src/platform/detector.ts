import * as core from '@actions/core';
import { detectPlatform } from 'git-platform-detector';
import { Platform } from '../types';

/**
 * Platform detection result
 */
export interface PlatformInfo {
  platform: Platform;
  baseUrl?: string;
  owner?: string;
  repo?: string;
}

/**
 * Detects the platform from various sources
 */
export class PlatformDetector {
  /**
   * Detect platform from explicit input or auto-detect
   */
  static async detect(
    explicitPlatform?: string,
    repositoryUrl?: string,
    token?: string
  ): Promise<PlatformInfo> {
    const result = await detectPlatform({
      requestedProvider: explicitPlatform,
      repositoryUrl,
      env: process.env,
      credentials: token ? { token } : undefined
    });

    if (result.providerId !== 'github' && result.providerId !== 'gitea') {
      core.warning(`Unsupported platform detected (${result.providerId}), defaulting to GitHub`);
      return { platform: 'github' };
    }

    const repoEnv = process.env.GITHUB_REPOSITORY || process.env.GITEA_REPOSITORY;
    const [envOwner, envRepo] = repoEnv ? repoEnv.split('/') : [];
    const baseUrl =
      result.baseUrl ||
      (result.providerId === 'gitea'
        ? process.env.GITHUB_SERVER_URL || process.env.GITEA_SERVER_URL
        : undefined);

    return {
      platform: result.providerId as Platform,
      baseUrl,
      owner: result.owner || envOwner,
      repo: result.repo || envRepo
    };
  }
}
