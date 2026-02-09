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
exports.ReleaseManager = void 0;
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
/**
 * Release manager coordinates release operations via provider interface
 */
class ReleaseManager {
    provider;
    config;
    logger;
    constructor(provider, config, logger) {
        this.provider = provider;
        this.config = config;
        this.logger = logger;
    }
    /**
     * Execute the release workflow
     */
    async execute() {
        // Determine tag
        const tag = this.getTag();
        this.logger.info(`Processing release for tag: ${tag}`);
        // Check if release exists
        const existingRelease = await this.provider.getReleaseByTag(tag);
        if (existingRelease && this.config.skipIfReleaseExists && !existingRelease.draft) {
            this.logger.info(`Release for tag ${tag} already exists and skipIfReleaseExists is enabled. Skipping.`);
            return existingRelease;
        }
        // Validate update conditions
        if (existingRelease && this.config.updateOnlyUnreleased) {
            // Note: We can't determine if release is draft/prerelease from ReleaseResult
            // This check should be done at the provider level if needed
            // For now, we'll allow the update and let the provider handle validation
            this.logger.debug('updateOnlyUnreleased is enabled - provider will validate release state');
        }
        // Create tag if needed
        if (this.config.commit && !existingRelease) {
            await this.provider.createTag(tag, this.config.commit, `Release ${tag}`);
        }
        // Prepare release config
        let releaseConfig = this.prepareReleaseConfig(tag, existingRelease);
        // Generate release notes if requested and not updating
        if (this.config.generateReleaseNotes && !existingRelease && !releaseConfig.body) {
            this.logger.debug('Generating release notes');
            try {
                const releaseNotes = await this.provider.generateReleaseNotes(tag, this.config.generateReleaseNotesPreviousTag);
                if (releaseNotes) {
                    releaseConfig.body = releaseNotes;
                }
            }
            catch (error) {
                this.logger.warning(`Failed to generate release notes: ${error.message}`);
                // Continue without release notes
            }
        }
        // Create or update release
        let release;
        if (existingRelease && this.config.allowUpdates) {
            this.logger.info(`Updating existing release: ${existingRelease.id}`);
            release = await this.provider.updateRelease(existingRelease.id, releaseConfig);
        }
        else {
            this.logger.info('Creating new release');
            release = await this.provider.createRelease(releaseConfig);
        }
        // Handle assets
        if (this.config.artifacts) {
            await this.handleAssets(release);
        }
        // Set outputs
        this.setOutputs(release);
        return release;
    }
    /**
     * Get tag from config or environment
     */
    getTag() {
        if (this.config.tag) {
            return this.config.tag;
        }
        // Try to get tag from git ref (if it's a tag)
        const ref = process.env.GITHUB_REF || process.env.GITEA_REF || '';
        if (ref.startsWith('refs/tags/')) {
            return ref.replace('refs/tags/', '');
        }
        throw new Error('Tag is required. Provide tag input or push a tag to trigger the workflow.');
    }
    /**
     * Prepare release configuration
     */
    prepareReleaseConfig(tag, existingRelease) {
        const config = {
            tag,
        };
        // Name
        if (!this.config.omitName) {
            if (existingRelease && this.config.allowUpdates && this.config.omitNameDuringUpdate) {
                // Skip name during update
            }
            else if (this.config.name) {
                config.name = this.config.name;
            }
        }
        // Body
        if (!this.config.omitBody) {
            if (existingRelease && this.config.allowUpdates && this.config.omitBodyDuringUpdate) {
                // Skip body during update
            }
            else {
                config.body = this.getReleaseBody();
            }
        }
        // Draft
        if (existingRelease && this.config.allowUpdates && this.config.omitDraftDuringUpdate) {
            // Skip draft flag during update
        }
        else {
            config.draft = this.config.draft;
        }
        // Prerelease
        if (existingRelease && this.config.allowUpdates && this.config.omitPrereleaseDuringUpdate) {
            // Skip prerelease flag during update
        }
        else {
            config.prerelease = this.config.prerelease;
        }
        // Release notes generation is handled separately in execute() method
        // Owner and repo
        if (this.config.owner) {
            config.owner = this.config.owner;
        }
        if (this.config.repo) {
            config.repo = this.config.repo;
        }
        return config;
    }
    /**
     * Get release body from file or input
     */
    getReleaseBody() {
        if (this.config.bodyFile) {
            if (!fs.existsSync(this.config.bodyFile)) {
                throw new Error(`Body file not found: ${this.config.bodyFile}`);
            }
            return fs.readFileSync(this.config.bodyFile, 'utf-8').trim();
        }
        if (this.config.body) {
            return this.config.body.trim();
        }
        return '';
    }
    /**
     * Handle asset uploads
     */
    async handleAssets(release) {
        if (!this.config.artifacts) {
            return;
        }
        // Parse artifact paths (comma-separated)
        const artifactPaths = this.config.artifacts.split(',').map((p) => p.trim());
        // Expand glob patterns
        const expandedPaths = [];
        for (const pattern of artifactPaths) {
            try {
                const matches = await (0, glob_1.glob)(pattern);
                expandedPaths.push(...matches);
            }
            catch (error) {
                this.logger.warning(`Failed to expand glob pattern ${pattern}: ${error.message}`);
                // Try as literal path
                if (fs.existsSync(pattern)) {
                    expandedPaths.push(pattern);
                }
            }
        }
        // Remove duplicates
        const uniquePaths = [...new Set(expandedPaths)];
        if (uniquePaths.length === 0) {
            this.logger.warning('No artifacts found to upload');
            return;
        }
        // Remove existing assets if requested
        if (this.config.removeArtifacts) {
            const assets = await this.provider.listAssets(release.id);
            for (const asset of assets) {
                try {
                    await this.provider.deleteAsset(asset.id);
                    this.logger.info(`Removed existing asset: ${asset.name}`);
                }
                catch (error) {
                    if (this.config.artifactErrorsFailBuild) {
                        throw error;
                    }
                    this.logger.warning(`Failed to remove asset ${asset.name}: ${error.message}`);
                }
            }
        }
        else if (this.config.replacesArtifacts) {
            // Remove assets with same name before uploading
            const assets = await this.provider.listAssets(release.id);
            const assetNames = new Set(uniquePaths.map((p) => path.basename(p)));
            for (const asset of assets) {
                if (assetNames.has(asset.name)) {
                    try {
                        await this.provider.deleteAsset(asset.id);
                        this.logger.info(`Removed existing asset: ${asset.name}`);
                    }
                    catch (error) {
                        if (this.config.artifactErrorsFailBuild) {
                            throw error;
                        }
                        this.logger.warning(`Failed to remove asset ${asset.name}: ${error.message}`);
                    }
                }
            }
        }
        // Upload assets
        const uploadedAssets = {};
        for (const assetPath of uniquePaths) {
            try {
                if (!fs.existsSync(assetPath)) {
                    const error = new Error(`Asset file not found: ${assetPath}`);
                    if (this.config.artifactErrorsFailBuild) {
                        throw error;
                    }
                    this.logger.warning(error.message);
                    continue;
                }
                const stats = fs.statSync(assetPath);
                if (!stats.isFile()) {
                    const error = new Error(`Asset path is not a file: ${assetPath}`);
                    if (this.config.artifactErrorsFailBuild) {
                        throw error;
                    }
                    this.logger.warning(error.message);
                    continue;
                }
                const assetConfig = {
                    path: assetPath,
                    contentType: this.config.artifactContentType,
                    name: path.basename(assetPath),
                };
                const downloadUrl = await this.provider.uploadAsset(release.id, release.upload_url, assetConfig);
                if (assetConfig.name) {
                    uploadedAssets[assetConfig.name] = downloadUrl;
                }
                this.logger.info(`Uploaded asset: ${assetConfig.name || assetPath}`);
            }
            catch (error) {
                if (this.config.artifactErrorsFailBuild) {
                    throw error;
                }
                this.logger.warning(`Failed to upload asset ${assetPath}: ${error.message}`);
            }
        }
        // Update release with assets if needed
        release.assets = { ...(release.assets || {}), ...uploadedAssets };
    }
    /**
     * Set action outputs
     */
    setOutputs(release) {
        core.setOutput('id', release.id);
        core.setOutput('html-url', release.html_url);
        core.setOutput('upload-url', release.upload_url);
        if (release.tarball_url) {
            core.setOutput('tarball-url', release.tarball_url);
        }
        if (release.zipball_url) {
            core.setOutput('zipball-url', release.zipball_url);
        }
        if (Object.keys(release.assets).length > 0) {
            core.setOutput('assets', JSON.stringify(release.assets));
        }
    }
}
exports.ReleaseManager = ReleaseManager;
//# sourceMappingURL=release.js.map