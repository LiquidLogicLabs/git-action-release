import * as fs from 'fs';
import * as path from 'path';
import { BaseProvider } from './provider';
import { ReleaseConfig, ReleaseResult, AssetConfig } from '../types';
import { Logger } from '../logger';

/**
 * GitHub provider implementation
 */
export class GitHubProvider extends BaseProvider {
  private readonly apiBaseUrl = 'https://api.github.com';
  protected owner: string;
  protected repo: string;

  constructor(config: {
    token: string;
    owner?: string;
    repo?: string;
    logger: Logger;
  }) {
    super(config);
    this.owner = config.owner || process.env.GITHUB_REPOSITORY_OWNER || '';
    this.repo = config.repo || this.extractRepoFromEnv() || '';

    if (!this.owner || !this.repo) {
      throw new Error('GitHub owner and repo must be provided or available from environment');
    }
  }

  private extractRepoFromEnv(): string {
    const repo = process.env.GITHUB_REPOSITORY;
    return repo ? repo.split('/')[1] : '';
  }

  /**
   * Create a new release
   */
  async createRelease(config: ReleaseConfig): Promise<ReleaseResult> {
    this.logger.debug(`Creating GitHub release for tag: ${config.tag}`);

    const releaseData: any = {
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
    const { data } = await this.request<{
      id: number;
      html_url: string;
      upload_url: string;
      tarball_url: string;
      zipball_url: string;
      draft?: boolean;
      prerelease?: boolean;
    }>(url, {
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
  async updateRelease(releaseId: string, config: Partial<ReleaseConfig>): Promise<ReleaseResult> {
    this.logger.debug(`Updating GitHub release: ${releaseId}`);

    const releaseData: any = {};

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
   */
  async getReleaseByTag(tag: string): Promise<ReleaseResult | null> {
    this.logger.debug(`Getting GitHub release by tag: ${tag}`);

    try {
      const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/releases/tags/${tag}`;
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
        upload_url: data.upload_url.replace('{?name,label}', ''),
        tarball_url: data.tarball_url,
        zipball_url: data.zipball_url,
        assets,
        draft: data.draft,
        prerelease: data.prerelease,
      };
    } catch (error: any) {
      if (error.message && error.message.includes('404')) {
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

    const headers: Record<string, string> = {
      'Authorization': `token ${this.token}`,
      'Content-Type': contentType,
      'Content-Length': stats.size.toString(),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: fileContent,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to upload asset: HTTP ${response.status} ${response.statusText}: ${errorText}`);
    }

    const data = (await response.json()) as { browser_download_url: string };
    this.logger.info(`Uploaded asset: ${fileName}`);
    return data.browser_download_url;
  }

  /**
   * Delete an asset from a release
   */
  async deleteAsset(assetId: string): Promise<void> {
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
  async listAssets(releaseId: string): Promise<Array<{ id: string; name: string; url: string }>> {
    this.logger.debug(`Listing assets for GitHub release: ${releaseId}`);

    const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/releases/${releaseId}/assets`;
    const { data } = await this.request<Array<{
      id: number;
      name: string;
      browser_download_url: string;
    }>>(url, {
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
  async createTag(tag: string, commit: string, message?: string): Promise<void> {
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
      const { data: tagData } = await this.request<{ sha: string }>(tagUrl, {
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
  async generateReleaseNotes(tag: string, previousTag?: string): Promise<string> {
    this.logger.debug(`Generating GitHub release notes for tag: ${tag}`);

    const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/releases/generate-notes`;
    const body: any = {
      tag_name: tag,
    };

    if (previousTag) {
      body.previous_tag_name = previousTag;
    }

    const { data } = await this.request<{ body: string }>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return data.body;
  }

  /**
   * Override request method to use GitHub-specific Accept header
   */
  protected async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<{ data: T; status: number }> {
    const headers: Record<string, string> = {
      'Authorization': `token ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(
        `HTTP ${response.status} ${response.statusText}: ${errorText}`
      );
    }

    const data = response.status === 204 ? ({} as T) : ((await response.json()) as T);

    return { data: data as T, status: response.status };
  }
}
