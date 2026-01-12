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
     * Create a new release
     */
    async createRelease(config) {
        this.logger.debug(`Creating Gitea release for tag: ${config.tag}`);
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
        this.logger.info(`Created Gitea release: ${data.html_url}`);
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
        const data = response.status === 204 ? {} : (await response.json());
        return { data: data, status: response.status };
    }
}
exports.GiteaProvider = GiteaProvider;
//# sourceMappingURL=gitea.js.map