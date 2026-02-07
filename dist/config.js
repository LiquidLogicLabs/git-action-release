"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInputs = getInputs;
const core = __importStar(require("@actions/core"));
function getInputs() {
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
//# sourceMappingURL=config.js.map