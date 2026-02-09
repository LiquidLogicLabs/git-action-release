import * as core from '@actions/core';
import { getInputs } from './config';
import { Logger } from './logger';
import { PlatformDetector } from './platform/detector';
import { GitHubProvider } from './platform/github';
import { GiteaProvider } from './platform/gitea';
import { ReleaseManager } from './release';
import { ActionInputs, IProvider } from './types';
import { parseRepository } from './utils/repository';

/**
 * Main entry point for the action
 */
async function run(): Promise<void> {
  try {
    const inputs = getInputs();
    if (inputs.token) {
      core.setSecret(inputs.token);
    }

    const logger = new Logger(inputs.verbose, inputs.debugMode);
    if (inputs.skipCertificateCheck) {
      logger.warning('TLS certificate verification is disabled. This is a security risk and should only be used with trusted endpoints.');
    }

    logger.debug('Starting multi-platform release action');

    logger.debug(`Platform: ${inputs.platform || 'auto-detect'}`);

    // Get repository URL from environment or repository input
    logger.debug(`GITHUB_SERVER_URL: ${process.env.GITHUB_SERVER_URL || 'not set'}`);
    logger.debug(`GITHUB_REPOSITORY: ${process.env.GITHUB_REPOSITORY || 'not set'}`);
    
    // If repository input is provided and it's a full URL (for Gitea), use it directly
    // Otherwise, construct repository URL from environment
    let repositoryUrl: string | undefined;
    if (inputs.repository && (inputs.repository.startsWith('http://') || inputs.repository.startsWith('https://'))) {
      // Repository input is a full URL - use it directly for PlatformDetector
      repositoryUrl = inputs.repository;
      logger.debug(`repositoryUrl (from repository input URL): ${repositoryUrl}`);
    } else if (process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY) {
      // Fall back to environment-based repository URL
      repositoryUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`;
      logger.debug(`repositoryUrl (from environment): ${repositoryUrl}`);
    }
    
    logger.debug(`repositoryUrl: ${repositoryUrl || 'not set'}`);

    // Detect platform
    const platformInfo = await PlatformDetector.detect(
      inputs.platform,
      repositoryUrl,
      inputs.token
    );

    logger.info(`Detected platform: ${platformInfo.platform}`);

    // Create provider based on platform
    const provider = createProvider(platformInfo, inputs.token, inputs, logger);

    // Create release manager
    const manager = new ReleaseManager(provider, inputs, logger);

    // Execute release workflow
    await manager.execute();

    logger.info('Release action completed successfully');
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('Unknown error occurred');
    }
    throw error;
  }
}

/**
/**
 * Create provider based on platform info
 */
function createProvider(
  platformInfo: { platform: 'github' | 'gitea'; baseUrl?: string; owner?: string; repo?: string },
  token: string,
  inputs: ActionInputs,
  logger: Logger
): IProvider {
  // Parse repository input if provided (takes precedence over owner/repo inputs)
  let owner = '';
  let repo = '';

  if (inputs.repository) {
    // If repository input is a full URL, owner/repo should already be in platformInfo from PlatformDetector
    // Otherwise, use parseRepository for owner/repo format
    if (inputs.repository.startsWith('http://') || inputs.repository.startsWith('https://')) {
      // Full URL - owner/repo should already be in platformInfo from PlatformDetector.parseGiteaUrl
      owner = platformInfo.owner || '';
      repo = platformInfo.repo || '';
    } else {
      // Owner/repo format - parse it directly
      const parsed = parseRepository(inputs.repository);
      owner = parsed.owner;
      repo = parsed.repo;
    }
  } else {
    // Fall back to owner/repo inputs or auto-detection
    owner = inputs.owner || platformInfo.owner || process.env.GITHUB_REPOSITORY_OWNER || '';
    repo = inputs.repo || platformInfo.repo || extractRepoFromEnv() || '';
  }

  if (platformInfo.platform === 'gitea') {
    if (!platformInfo.baseUrl) {
      throw new Error('Gitea baseUrl is required. Ensure GITHUB_SERVER_URL environment variable is set or repository URL is provided.');
    }

    return new GiteaProvider({
      token,
      baseUrl: platformInfo.baseUrl,
      owner,
      repo,
      skipCertificateCheck: inputs.skipCertificateCheck,
      logger,
    });
  }

  // Default to GitHub
  return new GitHubProvider({
    token,
    owner,
    repo,
    skipCertificateCheck: inputs.skipCertificateCheck,
    logger,
  });
}

/**
 * Extract repository name from environment
 */
function extractRepoFromEnv(): string {
  const repo = process.env.GITHUB_REPOSITORY;
  return repo ? repo.split('/')[1] : '';
}

// Run the action
run();
