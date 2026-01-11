import * as core from '@actions/core';
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
  static detect(
    explicitPlatform?: string,
    repositoryUrl?: string
  ): PlatformInfo {
    // If platform is explicitly set, use it
    if (explicitPlatform) {
      const platform = explicitPlatform.toLowerCase().trim();
      if (platform === 'github' || platform === 'gitea') {
        return this.detectWithPlatform(platform as Platform, repositoryUrl);
      }
      throw new Error(`Invalid platform: ${explicitPlatform}. Supported platforms: github, gitea`);
    }

    // Auto-detect from repository URL
    const repoUrl = repositoryUrl || (process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`
      : undefined);
    if (repoUrl) {
      return this.detectFromUrl(repoUrl);
    }

    // Default to GitHub for GitHub Actions runners
    core.warning('Could not detect platform from repository URL, defaulting to GitHub');
    return { platform: 'github' };
  }

  /**
   * Detect platform with explicit platform type
   */
  private static detectWithPlatform(
    platform: Platform,
    repositoryUrl?: string
  ): PlatformInfo {
    if (platform === 'gitea') {
      // If repository URL is explicitly provided, use it (takes priority over environment variable)
      if (repositoryUrl) {
        return this.parseGiteaUrl(repositoryUrl);
      }

      // Otherwise, use GITHUB_SERVER_URL from environment if available
      const baseUrl = process.env.GITHUB_SERVER_URL;
      if (baseUrl) {
        return {
          platform: 'gitea',
          baseUrl: baseUrl,
          owner: process.env.GITHUB_REPOSITORY?.split('/')[0],
          repo: process.env.GITHUB_REPOSITORY?.split('/')[1],
        };
      }

      throw new Error('Gitea URL could not be detected. Ensure GITHUB_SERVER_URL environment variable is set or provide a repository URL.');
    }

    return { platform: 'github' };
  }

  /**
   * Detect platform from repository URL
   */
  private static detectFromUrl(repoUrl: string): PlatformInfo {
    try {
      const url = new URL(repoUrl);

      // Check if it's GitHub (github.com or GitHub Enterprise)
      if (url.hostname === 'github.com' || url.hostname.endsWith('.github.com') || url.hostname.includes('github')) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          return {
            platform: 'github',
            owner: parts[0],
            repo: parts[1],
          };
        }
        return { platform: 'github' };
      }

      // Check if it's Gitea (gitea.io or custom domain)
      // For Gitea, extract base URL from the repository URL
      if (url.hostname.endsWith('.gitea.io') || url.hostname.includes('gitea')) {
        return this.parseGiteaUrl(repoUrl);
      }

      // Try using GITHUB_SERVER_URL if it's set (could be a custom Gitea instance)
      const serverUrl = process.env.GITHUB_SERVER_URL;
      if (serverUrl && url.hostname === new URL(serverUrl).hostname) {
        return this.parseGiteaUrl(repoUrl);
      }

      // Default to GitHub
      core.warning(`Could not detect platform from URL: ${repoUrl}, defaulting to GitHub`);
      return { platform: 'github' };
    } catch (error) {
      core.warning(`Failed to parse repository URL: ${repoUrl}, defaulting to GitHub`);
      return { platform: 'github' };
    }
  }

  /**
   * Parse Gitea URL (supports base URL or repository URL)
   */
  private static parseGiteaUrl(url: string): PlatformInfo {
    try {
      const parsedUrl = new URL(url);

      // Extract owner and repo from path if it's a repository URL
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);

      if (pathParts.length >= 2) {
        // Repository URL: https://gitea.example.com/owner/repo
        return {
          platform: 'gitea',
          baseUrl: `${parsedUrl.protocol}//${parsedUrl.host}`,
          owner: pathParts[0],
          repo: pathParts[1],
        };
      }

      // Base URL: https://gitea.example.com
      // Try to extract owner/repo from environment if available
      const owner = process.env.GITHUB_REPOSITORY_OWNER || process.env.GITEA_REPOSITORY_OWNER;
      const repo = process.env.GITHUB_REPOSITORY
        ? process.env.GITHUB_REPOSITORY.split('/')[1]
        : process.env.GITEA_REPOSITORY?.split('/')[1];

      return {
        platform: 'gitea',
        baseUrl: `${parsedUrl.protocol}//${parsedUrl.host}`,
        owner: owner,
        repo: repo,
      };
    } catch (error) {
      throw new Error(`Invalid Gitea URL format: ${url}. Expected base URL (https://gitea.example.com) or repository URL (https://gitea.example.com/owner/repo)`);
    }
  }
}
