import * as core from '@actions/core';
import { ActionInputs } from './types';

export function getInputs(): ActionInputs {
  const token = core.getInput('token') || process.env.GITHUB_TOKEN || '';
  if (!token) {
    throw new Error('Token is required. Provide token input or ensure GITHUB_TOKEN is available.');
  }

  const verboseInput = core.getBooleanInput('verbose');
  const envStepDebug = (process.env.ACTIONS_STEP_DEBUG || '').toLowerCase();
  const stepDebugEnabled = core.isDebug() || envStepDebug === 'true' || envStepDebug === '1';
  const verbose = verboseInput || stepDebugEnabled;
  const skipCertificateCheck = core.getBooleanInput('skipCertificateCheck');

  return {
    platform: core.getInput('platform') || undefined,
    token,
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
    repository: core.getInput('repository') || undefined,
    owner: core.getInput('owner') || undefined,
    repo: core.getInput('repo') || undefined,
    omitBody: core.getBooleanInput('omitBody'),
    omitBodyDuringUpdate: core.getBooleanInput('omitBodyDuringUpdate'),
    omitDraftDuringUpdate: core.getBooleanInput('omitDraftDuringUpdate'),
    omitName: core.getBooleanInput('omitName'),
    omitNameDuringUpdate: core.getBooleanInput('omitNameDuringUpdate'),
    omitPrereleaseDuringUpdate: core.getBooleanInput('omitPrereleaseDuringUpdate'),
    verbose,
    skipCertificateCheck,
  };
}
