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
exports.PlatformDetector = void 0;
const core = __importStar(require("@actions/core"));
const git_platform_detector_1 = require("git-platform-detector");
/**
 * Detects the platform from various sources
 */
class PlatformDetector {
    /**
     * Detect platform from explicit input or auto-detect
     */
    static async detect(explicitPlatform, repositoryUrl, token) {
        const result = await (0, git_platform_detector_1.detectPlatform)({
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
        const baseUrl = result.baseUrl ||
            (result.providerId === 'gitea'
                ? process.env.GITHUB_SERVER_URL || process.env.GITEA_SERVER_URL
                : undefined);
        return {
            platform: result.providerId,
            baseUrl,
            owner: result.owner || envOwner,
            repo: result.repo || envRepo
        };
    }
}
exports.PlatformDetector = PlatformDetector;
//# sourceMappingURL=detector.js.map