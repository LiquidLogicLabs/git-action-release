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
exports.GitHubProvider = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const provider_1 = require("./provider");
/**
 * GitHub provider implementation
 */
class GitHubProvider extends provider_1.BaseProvider {
    apiBaseUrl = 'https://api.github.com';
    owner;
    repo;
    constructor(config) {
        super(config);
        this.owner = config.owner || process.env.GITHUB_REPOSITORY_OWNER || '';
        this.repo = config.repo || this.extractRepoFromEnv() || '';
        if (!this.owner || !this.repo) {
            throw new Error('GitHub owner and repo must be provided or available from environment');
        }
    }
    extractRepoFromEnv() {
        const repo = process.env.GITHUB_REPOSITORY;
        return repo ? repo.split('/')[1] : '';
    }
    /**
     * Create a new release
     */
    async createRelease(config) {
        this.logger.debug(`Creating GitHub release for tag: ${config.tag}`);
        const releaseData = {
            tag_name: config.tag,
            name: config.name || config.tag,
            body: config.body || '',
            draft: config.draft || false,
            prerelease: config.prerelease || false,
            generate_release_notes: false, // We handle this separately
        };
        // Remove undefined fields
        Object.keys(releaseData).forEach((key) => {
            if (releaseData[key] === undefined) {
                delete releaseData[key];
            }
        });
        const url = `${this.apiBaseUrl}/repos/${this.owner}/${config.repo || this.repo}/releases`;
        const { data } = await this.request(url, {
            method: 'POST',
            body: JSON.stringify(releaseData),
        });
        this.logger.info(`Created GitHub release: ${data.html_url}`);
        return {
            id: data.id.toString(),
            html_url: data.html_url,
            upload_url: data.upload_url.replace('{?name,label}', ''),
            tarball_url: data.tarball_url,
            zipball_url: data.zipball_url,
            assets: {},
            draft: data.draft,
            prerelease: data.prerelease,
        };
    }
    /**
     * Update an existing release
     */
    async updateRelease(releaseId, config) {
        this.logger.debug(`Updating GitHub release: ${releaseId}`);
        const releaseData = {};
        if (config.name !== undefined) {
            releaseData.name = config.name;
        }
        if (config.body !== undefined) {
            releaseData.body = config.body;
        }
        if (config.draft !== undefined) {
            releaseData.draft = config.draft;
        }
        if (config.prerelease !== undefined) {
            releaseData.prerelease = config.prerelease;
        }
        const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/releases/${releaseId}`;
        const { data } = await this.request(url, {
            method: 'PATCH',
            body: JSON.stringify(releaseData),
        });
        this.logger.info(`Updated GitHub release: ${data.html_url}`);
        return {
            id: data.id.toString(),
            html_url: data.html_url,
            upload_url: data.upload_url.replace('{?name,label}', ''),
            tarball_url: data.tarball_url,
            zipball_url: data.zipball_url,
            assets: {},
            draft: data.draft,
            prerelease: data.prerelease,
        };
    }
    /**
     * Get a release by tag
     * Note: GitHub API has issues with draft releases via /releases/tags/{tag}
     * So we try the tag endpoint first, then fall back to listing releases if it's a draft
     */
    async getReleaseByTag(tag) {
        this.logger.debug(`Getting GitHub release by tag: ${tag}`);
        try {
            // Try the direct tag endpoint first (works for published releases)
            const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/releases/tags/${tag}`;
            const { data } = await this.request(url, {
                method: 'GET',
            });
            const assets = {};
            data.assets.forEach((asset) => {
                assets[asset.name] = asset.browser_download_url;
            });
            return {
                id: data.id.toString(),
                html_url: data.html_url,
                upload_url: data.upload_url.replace('{?name,label}', ''),
                tarball_url: data.tarball_url,
                zipball_url: data.zipball_url,
                assets,
                draft: data.draft,
                prerelease: data.prerelease,
            };
        }
        catch (error) {
            // If 404, might be a draft release - try listing all releases
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('404')) {
                this.logger.debug(`Release not found via tag endpoint, checking drafts for tag: ${tag}`);
                try {
                    // List releases and find by tag_name (this works for drafts too)
                    // Retry logic: GitHub might need a moment to index draft releases
                    let release = null;
                    let lastReleasesList = [];
                    const maxRetries = 3;
                    const retryDelay = 1000; // 1 second
                    for (let attempt = 0; attempt < maxRetries; attempt++) {
                        if (attempt > 0) {
                            this.logger.debug(`Retry ${attempt}/${maxRetries - 1} to find draft release by tag: ${tag}`);
                            await new Promise((resolve) => setTimeout(resolve, retryDelay));
                        }
                        const listUrl = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/releases?per_page=100`;
                        const { data: releases } = await this.request(listUrl, {
                            method: 'GET',
                        });
                        lastReleasesList = releases;
                        this.logger.debug(`Found ${releases.length} releases in list (attempt ${attempt + 1}), looking for tag: ${tag}`);
                        const foundRelease = releases.find((r) => r.tag_name === tag);
                        if (foundRelease) {
                            release = foundRelease;
                            this.logger.debug(`Found draft release in list: ${release.id}, draft: ${release.draft}`);
                            break;
                        }
                    }
                    if (release) {
                        const assets = {};
                        release.assets.forEach((asset) => {
                            assets[asset.name] = asset.browser_download_url;
                        });
                        return {
                            id: release.id.toString(),
                            html_url: release.html_url,
                            upload_url: release.upload_url.replace('{?name,label}', ''),
                            tarball_url: release.tarball_url,
                            zipball_url: release.zipball_url,
                            assets,
                            draft: release.draft,
                            prerelease: release.prerelease,
                        };
                    }
                    else {
                        const availableTags = lastReleasesList.length > 0
                            ? lastReleasesList.slice(0, 5).map((r) => r.tag_name).join(', ')
                            : 'none';
                        this.logger.debug(`Draft release not found in list after ${maxRetries} attempts. Available tags: ${availableTags}`);
                    }
                }
                catch (listError) {
                    // If listing also fails, return null
                    const errorMessage = listError instanceof Error ? listError.message : String(listError);
                    this.logger.debug(`Failed to list releases: ${errorMessage}`);
                }
                return null;
            }
            throw error;
        }
    }
    /**
     * Upload an asset to a release
     */
    async uploadAsset(releaseId, uploadUrl, asset) {
        this.logger.debug(`Uploading asset to GitHub release: ${asset.path}`);
        if (!fs.existsSync(asset.path)) {
            throw new Error(`Asset file not found: ${asset.path}`);
        }
        const stats = fs.statSync(asset.path);
        if (!stats.isFile()) {
            throw new Error(`Asset path is not a file: ${asset.path}`);
        }
        const fileName = asset.name || path.basename(asset.path);
        const fileContent = fs.readFileSync(asset.path);
        const contentType = asset.contentType || 'application/octet-stream';
        // GitHub requires upload_url with name and label query params
        const url = `${uploadUrl}?name=${encodeURIComponent(fileName)}`;
        const headers = {
            'Authorization': `token ${this.token}`,
            'Content-Type': contentType,
            'Content-Length': stats.size.toString(),
        };
        const response = await fetch(url, this.buildFetchOptions({
            method: 'POST',
            headers,
            body: fileContent,
        }));
        if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            throw new Error(`Failed to upload asset: HTTP ${response.status} ${response.statusText}: ${errorText}`);
        }
        const data = (await response.json());
        this.logger.info(`Uploaded asset: ${fileName}`);
        return data.browser_download_url;
    }
    /**
     * Delete an asset from a release
     */
    async deleteAsset(assetId) {
        this.logger.debug(`Deleting GitHub asset: ${assetId}`);
        const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/releases/assets/${assetId}`;
        await this.request(url, {
            method: 'DELETE',
        });
        this.logger.info(`Deleted asset: ${assetId}`);
    }
    /**
     * List assets for a release
     */
    async listAssets(releaseId) {
        this.logger.debug(`Listing assets for GitHub release: ${releaseId}`);
        const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/releases/${releaseId}/assets`;
        const { data } = await this.request(url, {
            method: 'GET',
        });
        return data.map((asset) => ({
            id: asset.id.toString(),
            name: asset.name,
            url: asset.browser_download_url,
        }));
    }
    /**
     * Create a tag if it doesn't exist
     */
    async createTag(tag, commit, message) {
        this.logger.debug(`Creating GitHub tag: ${tag} at commit: ${commit}`);
        // First create a git tag ref
        const refUrl = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/git/refs`;
        await this.request(refUrl, {
            method: 'POST',
            body: JSON.stringify({
                ref: `refs/tags/${tag}`,
                sha: commit,
            }),
        });
        // If message is provided, create an annotated tag
        if (message) {
            const tagUrl = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/git/tags`;
            const { data: tagData } = await this.request(tagUrl, {
                method: 'POST',
                body: JSON.stringify({
                    tag,
                    message,
                    object: commit,
                    type: 'commit',
                }),
            });
            // Update the ref to point to the annotated tag
            const updateRefUrl = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/git/refs/tags/${tag}`;
            await this.request(updateRefUrl, {
                method: 'PATCH',
                body: JSON.stringify({
                    sha: tagData.sha,
                }),
            });
        }
        this.logger.info(`Created tag: ${tag}`);
    }
    /**
     * Generate release notes
     */
    async generateReleaseNotes(tag, previousTag) {
        this.logger.debug(`Generating GitHub release notes for tag: ${tag}`);
        const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/releases/generate-notes`;
        const body = {
            tag_name: tag,
        };
        if (previousTag) {
            body.previous_tag_name = previousTag;
        }
        const { data } = await this.request(url, {
            method: 'POST',
            body: JSON.stringify(body),
        });
        return data.body;
    }
    /**
     * Override request method to use GitHub-specific Accept header
     */
    async request(url, options = {}) {
        const headers = {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            ...options.headers,
        };
        const response = await fetch(url, this.buildFetchOptions({
            ...options,
            headers,
        }));
        if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorText}`);
        }
        const data = response.status === 204 ? {} : (await response.json());
        return { data: data, status: response.status };
    }
}
exports.GitHubProvider = GitHubProvider;
//# sourceMappingURL=github.js.map