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
exports.GiteaProvider = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const provider_1 = require("./provider");
/**
 * Gitea provider implementation
 */
class GiteaProvider extends provider_1.BaseProvider {
    apiBaseUrl;
    owner;
    repo;
    constructor(config) {
        super(config);
        if (!config.baseUrl) {
            throw new Error('Gitea baseUrl is required');
        }
        // Ensure baseUrl doesn't end with /api/v1
        this.apiBaseUrl = config.baseUrl.replace(/\/api\/v1\/?$/, '') + '/api/v1';
        this.owner = config.owner || process.env.GITHUB_REPOSITORY_OWNER || '';
        this.repo = config.repo || this.extractRepoFromEnv() || '';
        config.logger.debug(`GiteaProvider initialized - baseUrl: ${config.baseUrl}, apiBaseUrl: ${this.apiBaseUrl}, owner: ${this.owner}, repo: ${this.repo}`);
        if (!this.owner || !this.repo) {
            throw new Error('Gitea owner and repo must be provided or available from environment');
        }
    }
    extractRepoFromEnv() {
        const repo = process.env.GITHUB_REPOSITORY || process.env.GITEA_REPOSITORY;
        return repo ? repo.split('/')[1] : '';
    }
    /**
     * Get the default branch HEAD SHA
     */
    async getDefaultBranchSha() {
        this.logger.debug('Getting default branch HEAD SHA from Gitea');
        const repoUrl = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}`;
        const { data: repoData } = await this.request(repoUrl, {
            method: 'GET',
        });
        if (!repoData?.default_branch) {
            throw new Error('Could not determine default branch from repository');
        }
        const branchUrl = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/git/refs/heads/${repoData.default_branch}`;
        const { data: branchData } = await this.request(branchUrl, {
            method: 'GET',
        });
        if (!branchData?.object?.sha) {
            throw new Error(`Could not get HEAD SHA for branch ${repoData.default_branch}`);
        }
        this.logger.debug(`Default branch ${repoData.default_branch} HEAD SHA: ${branchData.object.sha}`);
        return branchData.object.sha;
    }
    /**
     * Check if a tag exists in the repository
     */
    async tagExists(tag) {
        try {
            const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/git/refs/tags/${tag}`;
            await this.request(url, {
                method: 'GET',
            });
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('404')) {
                return false;
            }
            // Re-throw other errors
            throw error;
        }
    }
    /**
     * Create a new release
     */
    async createRelease(config) {
        this.logger.debug(`Creating Gitea release for tag: ${config.tag}`);
        // Gitea requires the tag to exist before creating a release
        // Check if tag exists, and create it if it doesn't
        const tagExists = await this.tagExists(config.tag);
        if (!tagExists) {
            this.logger.debug(`Tag ${config.tag} does not exist, creating it first`);
            // Get commit SHA: use provided commit, or try GITHUB_SHA/GITEA_SHA, or get default branch HEAD
            let commitSha = config.commit;
            if (!commitSha) {
                // Try environment variables first (faster, no API call needed)
                commitSha = process.env.GITHUB_SHA || process.env.GITEA_SHA;
                if (!commitSha) {
                    // Fall back to getting default branch HEAD SHA
                    commitSha = await this.getDefaultBranchSha();
                }
                else {
                    this.logger.debug(`Using commit SHA from environment: ${commitSha.substring(0, 7)}...`);
                }
            }
            await this.createTag(config.tag, commitSha, `Release ${config.tag}`);
            this.logger.info(`Created tag ${config.tag} at ${commitSha}`);
        }
        const releaseData = {
            tag_name: config.tag,
            name: config.name || config.tag,
            body: config.body || '',
            draft: config.draft || false,
            prerelease: config.prerelease || false,
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
        let resolved = data;
        if (!resolved.id) {
            this.logger.warning('Gitea createRelease returned empty body, fetching release by tag with retries.');
            const fetched = await this.findReleaseByTagWithRetries(config.tag);
            if (!fetched) {
                throw new Error('Gitea createRelease returned no body and release could not be fetched by tag after retries.');
            }
            return fetched;
        }
        this.logger.info(`Created Gitea release: ${resolved.html_url}`);
        return {
            id: resolved.id.toString(),
            html_url: resolved.html_url,
            upload_url: resolved.upload_url,
            tarball_url: resolved.tarball_url,
            zipball_url: resolved.zipball_url,
            assets: {},
            draft: resolved.draft,
            prerelease: resolved.prerelease,
        };
    }
    async findReleaseByTagWithRetries(tag) {
        const maxRetries = 10;
        const baseDelayMs = 500;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const delayMs = Math.min(baseDelayMs * Math.pow(2, attempt - 1), 8000);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            const byTag = await this.getReleaseByTag(tag);
            if (byTag) {
                this.logger.debug(`Fetched release by tag after ${attempt} attempt(s)`);
                return byTag;
            }
            const byList = await this.findReleaseInList(tag);
            if (byList) {
                this.logger.debug(`Fetched release from list after ${attempt} attempt(s)`);
                return byList;
            }
            this.logger.debug(`Attempt ${attempt}/${maxRetries}: Release not yet available, retrying...`);
        }
        return null;
    }
    async findReleaseInList(tag) {
        try {
            const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/releases`;
            const { data } = await this.request(url, { method: 'GET' });
            const found = data.find((release) => release.tag_name === tag);
            if (!found) {
                return null;
            }
            const assets = {};
            (found.assets || []).forEach((asset) => {
                assets[asset.name] = asset.browser_download_url;
            });
            return {
                id: found.id.toString(),
                html_url: found.html_url,
                upload_url: found.upload_url,
                tarball_url: found.tarball_url,
                zipball_url: found.zipball_url,
                assets,
                draft: found.draft,
                prerelease: found.prerelease,
            };
        }
        catch (error) {
            this.logger.debug(`Failed to list releases during retry: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
    /**
     * Update an existing release
     */
    async updateRelease(releaseId, config) {
        this.logger.debug(`Updating Gitea release: ${releaseId}`);
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
        if (!data.id) {
            this.logger.warning('Gitea updateRelease returned empty body, using releaseId fallback.');
            return {
                id: releaseId,
                html_url: data.html_url || '',
                upload_url: data.upload_url || '',
                tarball_url: data.tarball_url || '',
                zipball_url: data.zipball_url || '',
                assets: {},
                draft: data.draft,
                prerelease: data.prerelease
            };
        }
        this.logger.info(`Updated Gitea release: ${data.html_url}`);
        return {
            id: data.id.toString(),
            html_url: data.html_url,
            upload_url: data.upload_url,
            tarball_url: data.tarball_url,
            zipball_url: data.zipball_url,
            assets: {},
            draft: data.draft,
            prerelease: data.prerelease,
        };
    }
    /**
     * Get a release by tag
     */
    async getReleaseByTag(tag) {
        this.logger.debug(`Getting Gitea release by tag: ${tag}`);
        this.logger.debug(`getReleaseByTag - apiBaseUrl: ${this.apiBaseUrl}, owner: ${this.owner}, repo: ${this.repo}, tag: ${tag}`);
        try {
            // Gitea API uses tag name in the path
            const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/releases/tags/${tag}`;
            this.logger.debug(`Gitea API URL: ${url}`);
            this.logger.debug(`getReleaseByTag - Full URL components: apiBaseUrl=${this.apiBaseUrl}, owner=${this.owner}, repo=${this.repo}, tag=${tag}`);
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
                upload_url: data.upload_url,
                tarball_url: data.tarball_url,
                zipball_url: data.zipball_url,
                assets,
                draft: data.draft,
                prerelease: data.prerelease,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('404')) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Upload an asset to a release
     */
    async uploadAsset(releaseId, uploadUrl, asset) {
        this.logger.debug(`Uploading asset to Gitea release: ${asset.path}`);
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
        // Gitea uses multipart form data for file uploads
        // Node.js 20 has global FormData support
        // Gitea expects multipart/form-data with the file as 'attachment'
        const formData = new FormData();
        // Create a Blob with the file content
        const blob = new Blob([fileContent], { type: contentType });
        formData.append('attachment', blob, fileName);
        const headers = {
            'Authorization': `token ${this.token}`,
            // Don't set Content-Type - FormData will set it with boundary automatically
        };
        // Use the upload_url provided by Gitea (it already includes the release ID)
        const url = uploadUrl || `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/releases/${releaseId}/assets`;
        // Note: When using FormData, don't set Content-Type - fetch will set it with boundary automatically
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: formData,
        });
        if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            throw new Error(`Failed to upload asset: HTTP ${response.status} ${response.statusText}: ${errorText}`);
        }
        const data = (await response.json());
        this.logger.info(`Uploaded asset: ${fileName}`);
        return data.browser_download_url || data.url || '';
    }
    /**
     * Delete an asset from a release
     */
    async deleteAsset(assetId) {
        this.logger.debug(`Deleting Gitea asset: ${assetId}`);
        const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/releases/attachments/${assetId}`;
        await this.request(url, {
            method: 'DELETE',
        });
        this.logger.info(`Deleted asset: ${assetId}`);
    }
    /**
     * List assets for a release
     */
    async listAssets(releaseId) {
        this.logger.debug(`Listing assets for Gitea release: ${releaseId}`);
        const release = await this.getReleaseByTag(releaseId);
        if (!release) {
            // Try getting by ID
            const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/releases/${releaseId}`;
            const { data } = await this.request(url, {
                method: 'GET',
            });
            return data.assets.map((asset) => ({
                id: asset.id.toString(),
                name: asset.name,
                url: asset.browser_download_url,
            }));
        }
        return Object.entries(release.assets).map(([name, url]) => ({
            id: '', // Gitea doesn't return asset IDs in the release endpoint
            name,
            url,
        }));
    }
    /**
     * Create a tag if it doesn't exist
     */
    async createTag(tag, commit, message) {
        this.logger.debug(`Creating Gitea tag: ${tag} at commit: ${commit}`);
        const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/tags`;
        await this.request(url, {
            method: 'POST',
            body: JSON.stringify({
                tag_name: tag,
                target: commit,
                message: message || `Release ${tag}`,
            }),
        });
        this.logger.info(`Created tag: ${tag}`);
    }
    /**
     * Generate release notes (Gitea doesn't have built-in release notes generation)
     * Return empty string as placeholder
     */
    async generateReleaseNotes(_tag, _previousTag) {
        this.logger.debug(`Gitea does not support automatic release notes generation`);
        this.logger.warning('Gitea does not support automatic release notes generation. Consider using a changelog generator action.');
        return '';
    }
    /**
     * Override request method to use Gitea-specific headers
     */
    async request(url, options = {}) {
        const headers = {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...options.headers,
        };
        // Remove Content-Type if body is FormData (let fetch set boundary)
        if (options.body instanceof FormData) {
            delete headers['Content-Type'];
        }
        this.logger.debug(`Gitea request URL: ${url}`);
        this.logger.debug(`Gitea request method: ${options.method || 'GET'}`);
        this.logger.debug(`Gitea request headers: ${JSON.stringify(Object.keys(headers).map(k => `${k}: ${k === 'Authorization' ? 'token ***' : headers[k]}`))}`);
        const response = await fetch(url, {
            ...options,
            headers,
        });
        this.logger.debug(`Gitea response status: ${response.status} ${response.statusText}`);
        this.logger.debug(`Gitea response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
        if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            this.logger.debug(`Gitea error response: ${errorText.substring(0, 500)}`);
            throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorText}`);
        }
        const text = response.status === 204 ? '' : await response.text();
        if (!text) {
            return { data: {}, status: response.status };
        }
        try {
            const data = JSON.parse(text);
            return { data, status: response.status };
        }
        catch (error) {
            throw new Error(`Failed to parse Gitea JSON response: ${String(error)}`);
        }
    }
}
exports.GiteaProvider = GiteaProvider;
//# sourceMappingURL=gitea.js.map