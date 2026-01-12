import * as fs from 'fs';
import * as path from 'path';
import { BaseProvider } from './provider';
import { ReleaseConfig, ReleaseResult, AssetConfig } from '../types';
import { Logger } from '../logger';

/**
 * Gitea provider implementation
 */
export class GiteaProvider extends BaseProvider {
  private readonly apiBaseUrl: string;
  protected owner: string;
  protected repo: string;

  constructor(config: {
    token: string;
    baseUrl?: string;
    owner?: string;
    repo?: string;
    logger: Logger;
  }) {
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

  private extractRepoFromEnv(): string {
    const repo = process.env.GITHUB_REPOSITORY || process.env.GITEA_REPOSITORY;
    return repo ? repo.split('/')[1] : '';
  }

  /**
   * Create a new release
   */
  async createRelease(config: ReleaseConfig): Promise<ReleaseResult> {
    this.logger.debug(`Creating Gitea release for tag: ${config.tag}`);

    const releaseData: {
      tag_name: string;
      name: string;
      body: string;
      draft: boolean;
      prerelease: boolean;
      [key: string]: string | boolean | undefined;
    } = {
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
    const { data } = await this.request<{
      id: number;
      html_url: string;
      upload_url: string;
      tarball_url: string;
      zipball_url: string;
      tag_name: string;
      draft?: boolean;
      prerelease?: boolean;
    }>(url, {
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
  async updateRelease(releaseId: string, config: Partial<ReleaseConfig>): Promise<ReleaseResult> {
    this.logger.debug(`Updating Gitea release: ${releaseId}`);

    const releaseData: {
      name?: string;
      body?: string;
      draft?: boolean;
      prerelease?: boolean;
    } = {};

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
    const { data } = await this.request<{
      id: number;
      html_url: string;
      upload_url: string;
      tarball_url: string;
      zipball_url: string;
      draft?: boolean;
      prerelease?: boolean;
    }>(url, {
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
  async getReleaseByTag(tag: string): Promise<ReleaseResult | null> {
    this.logger.debug(`Getting Gitea release by tag: ${tag}`);
    this.logger.debug(`getReleaseByTag - apiBaseUrl: ${this.apiBaseUrl}, owner: ${this.owner}, repo: ${this.repo}, tag: ${tag}`);

    try {
      // Gitea API uses tag name in the path
      const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/releases/tags/${tag}`;
      this.logger.debug(`Gitea API URL: ${url}`);
      this.logger.debug(`getReleaseByTag - Full URL components: apiBaseUrl=${this.apiBaseUrl}, owner=${this.owner}, repo=${this.repo}, tag=${tag}`);
      const { data } = await this.request<{
        id: number;
        html_url: string;
        upload_url: string;
        tarball_url: string;
        zipball_url: string;
        draft?: boolean;
        prerelease?: boolean;
        assets: Array<{ id: number; name: string; browser_download_url: string }>;
      }>(url, {
        method: 'GET',
      });

      const assets: Record<string, string> = {};
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
    } catch (error: unknown) {
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
  async uploadAsset(
    releaseId: string,
    uploadUrl: string,
    asset: AssetConfig
  ): Promise<string> {
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

    const headers: Record<string, string> = {
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

        const data = (await response.json()) as { browser_download_url?: string; url?: string };
        this.logger.info(`Uploaded asset: ${fileName}`);
        return data.browser_download_url || data.url || '';
  }

  /**
   * Delete an asset from a release
   */
  async deleteAsset(assetId: string): Promise<void> {
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
  async listAssets(releaseId: string): Promise<Array<{ id: string; name: string; url: string }>> {
    this.logger.debug(`Listing assets for Gitea release: ${releaseId}`);

    const release = await this.getReleaseByTag(releaseId);
    if (!release) {
      // Try getting by ID
      const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/releases/${releaseId}`;
      const { data } = await this.request<{
        assets: Array<{ id: number; name: string; browser_download_url: string }>;
      }>(url, {
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
  async createTag(tag: string, commit: string, message?: string): Promise<void> {
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
  async generateReleaseNotes(_tag: string, _previousTag?: string): Promise<string> {
    this.logger.debug(`Gitea does not support automatic release notes generation`);
    this.logger.warning('Gitea does not support automatic release notes generation. Consider using a changelog generator action.');
    return '';
  }

  /**
   * Override request method to use Gitea-specific headers
   */
  protected async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<{ data: T; status: number }> {
    const headers: Record<string, string> = {
      'Authorization': `token ${this.token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
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
      throw new Error(
        `HTTP ${response.status} ${response.statusText}: ${errorText}`
      );
    }

    const data = response.status === 204 ? ({} as T) : ((await response.json()) as T);

    return { data: data as T, status: response.status };
  }
}
