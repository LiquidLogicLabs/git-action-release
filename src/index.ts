import * as core from '@actions/core';
import { Logger } from './logger';
import { PlatformDetector } from './platform/detector';
import { GitHubProvider } from './platform/github';
import { GiteaProvider } from './platform/gitea';
import { ReleaseManager } from './release';
import { ActionInputs, IProvider } from './types';

/**
 * Main entry point for the action
 */
async function run(): Promise<void> {
  try {
    // Get and mask token
    const token = core.getInput('token') || process.env.GITHUB_TOKEN || '';
    if (token) {
      core.setSecret(token);
    } else {
      throw new Error('Token is required. Provide token input or ensure GITHUB_TOKEN is available.');
    }

    // Get verbose flag
    const verbose = core.getBooleanInput('verbose');
    const logger = new Logger(verbose);

    logger.debug('Starting multi-platform release action');

    // Get inputs
    const inputs = getInputs();
    logger.debug(`Platform: ${inputs.platform || 'auto-detect'}`);

    // Get repository URL from environment
    const repositoryUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`
      : undefined;

    // Detect platform
    const platformInfo = PlatformDetector.detect(
      inputs.platform,
      repositoryUrl
    );

    logger.info(`Detected platform: ${platformInfo.platform}`);

    // Create provider based on platform
    const provider = createProvider(platformInfo, token, inputs, logger);

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
 * Get all action inputs
 */
function getInputs(): ActionInputs {
  return {
    platform: core.getInput('platform') || undefined,
    token: core.getInput('token') || process.env.GITHUB_TOKEN || '',
    tag: core.getInput('tag') || '',
    name: core.getInput('name') || undefined,
    body: core.getInput('body') || undefined,
    bodyFile: core.getInput('bodyFile') || undefined,
    draft: core.getBooleanInput('draft'),
    prerelease: core.getBooleanInput('prerelease'),
    commit: core.getInput('commit') || undefined,
    artifacts: core.getInput('artifacts') || undefined,
    artifactContentType: core.getInput('artifactContentType') || undefined,
    replacesArtifacts: core.getBooleanInput('replacesArtifacts'),
    removeArtifacts: core.getBooleanInput('removeArtifacts'),
    artifactErrorsFailBuild: core.getBooleanInput('artifactErrorsFailBuild'),
    allowUpdates: core.getBooleanInput('allowUpdates'),
    skipIfReleaseExists: core.getBooleanInput('skipIfReleaseExists'),
    updateOnlyUnreleased: core.getBooleanInput('updateOnlyUnreleased'),
    generateReleaseNotes: core.getBooleanInput('generateReleaseNotes'),
    generateReleaseNotesPreviousTag: core.getInput('generateReleaseNotesPreviousTag') || undefined,
    owner: core.getInput('owner') || undefined,
    repo: core.getInput('repo') || undefined,
    omitBody: core.getBooleanInput('omitBody'),
    omitBodyDuringUpdate: core.getBooleanInput('omitBodyDuringUpdate'),
    omitDraftDuringUpdate: core.getBooleanInput('omitDraftDuringUpdate'),
    omitName: core.getBooleanInput('omitName'),
    omitNameDuringUpdate: core.getBooleanInput('omitNameDuringUpdate'),
    omitPrereleaseDuringUpdate: core.getBooleanInput('omitPrereleaseDuringUpdate'),
    verbose: core.getBooleanInput('verbose'),
  };
}

/**
 * Create provider based on platform info
 */
function createProvider(
  platformInfo: { platform: 'github' | 'gitea'; baseUrl?: string; owner?: string; repo?: string },
  token: string,
  inputs: ActionInputs,
  logger: Logger
): IProvider {
  const owner = inputs.owner || platformInfo.owner || process.env.GITHUB_REPOSITORY_OWNER || '';
  const repo = inputs.repo || platformInfo.repo || extractRepoFromEnv() || '';

  if (platformInfo.platform === 'gitea') {
    if (!platformInfo.baseUrl) {
      throw new Error('Gitea baseUrl is required. Ensure GITHUB_SERVER_URL environment variable is set or repository URL is provided.');
    }

    return new GiteaProvider({
      token,
      baseUrl: platformInfo.baseUrl,
      owner,
      repo,
      logger,
    });
  }

  // Default to GitHub
  return new GitHubProvider({
    token,
    owner,
    repo,
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
