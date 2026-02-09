import * as core from '@actions/core';
import { ActionInputs } from './types';

function parseBoolean(val?: string): boolean {
  return val?.toLowerCase() === 'true' || val === '1';
}

export function getInputs(): ActionInputs {
  const token = core.getInput('token') || process.env.GITHUB_TOKEN || '';
  if (!token) {
    throw new Error('Token is required. Provide token input or ensure GITHUB_TOKEN is available.');
  }

  const verboseInput = core.getBooleanInput('verbose');
  const debugMode =
    (typeof core.isDebug === 'function' && core.isDebug()) ||
    parseBoolean(process.env.ACTIONS_STEP_DEBUG) ||
    parseBoolean(process.env.ACTIONS_RUNNER_DEBUG) ||
    parseBoolean(process.env.RUNNER_DEBUG);
  const verbose = verboseInput || debugMode;
  const skipCertificateCheck = core.getBooleanInput('skip-certificate-check');

  return {
    platform: core.getInput('platform') || undefined,
    token,
    tag: core.getInput('tag') || '',
    name: core.getInput('name') || undefined,
    body: core.getInput('body') || undefined,
    bodyFile: core.getInput('body-file') || undefined,
    draft: core.getBooleanInput('draft'),
    prerelease: core.getBooleanInput('prerelease'),
    commit: core.getInput('commit') || undefined,
    artifacts: core.getInput('artifacts') || undefined,
    artifactContentType: core.getInput('artifact-content-type') || undefined,
    replacesArtifacts: core.getBooleanInput('replaces-artifacts'),
    removeArtifacts: core.getBooleanInput('remove-artifacts'),
    artifactErrorsFailBuild: core.getBooleanInput('artifact-errors-fail-build'),
    allowUpdates: core.getBooleanInput('allow-updates'),
    skipIfReleaseExists: core.getBooleanInput('skip-if-release-exists'),
    updateOnlyUnreleased: core.getBooleanInput('update-only-unreleased'),
    generateReleaseNotes: core.getBooleanInput('generate-release-notes'),
    generateReleaseNotesPreviousTag: core.getInput('generate-release-notes-previous-tag') || undefined,
    repository: core.getInput('repository') || undefined,
    owner: core.getInput('owner') || undefined,
    repo: core.getInput('repo') || undefined,
    omitBody: core.getBooleanInput('omit-body'),
    omitBodyDuringUpdate: core.getBooleanInput('omit-body-during-update'),
    omitDraftDuringUpdate: core.getBooleanInput('omit-draft-during-update'),
    omitName: core.getBooleanInput('omit-name'),
    omitNameDuringUpdate: core.getBooleanInput('omit-name-during-update'),
    omitPrereleaseDuringUpdate: core.getBooleanInput('omit-prerelease-during-update'),
    verbose,
    debugMode,
    skipCertificateCheck,
  };
}
