import { Agent } from 'undici';
import { IProvider, ReleaseConfig, ReleaseResult, AssetConfig } from '../types';

/**
 * Abstract base class for platform providers
 * All platform implementations should extend this class
 */
export abstract class BaseProvider implements IProvider {
  protected token: string;
  protected baseUrl?: string;
  protected owner?: string;
  protected repo?: string;
  protected logger: import('../logger').Logger;
  protected dispatcher?: Agent;

  constructor(config: {
    token: string;
    baseUrl?: string;
    owner?: string;
    repo?: string;
    skipCertificateCheck?: boolean;
    logger: import('../logger').Logger;
  }) {
    this.token = config.token;
    this.baseUrl = config.baseUrl;
    this.owner = config.owner;
    this.repo = config.repo;
    this.logger = config.logger;
    if (config.skipCertificateCheck) {
      this.dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
    }
  }

  protected buildFetchOptions(options: RequestInit): RequestInit {
    const requestOptions: RequestInit = { ...options };
    if (this.dispatcher) {
      (requestOptions as { dispatcher?: Agent }).dispatcher = this.dispatcher;
    }
    return requestOptions;
  }

  abstract createRelease(config: ReleaseConfig): Promise<ReleaseResult>;
  abstract updateRelease(releaseId: string, config: Partial<ReleaseConfig>): Promise<ReleaseResult>;
  abstract getReleaseByTag(tag: string): Promise<ReleaseResult | null>;
  abstract uploadAsset(releaseId: string, uploadUrl: string, asset: AssetConfig): Promise<string>;
  abstract deleteAsset(assetId: string): Promise<void>;
  abstract listAssets(releaseId: string): Promise<Array<{ id: string; name: string; url: string }>>;
  abstract createTag(tag: string, commit: string, message?: string): Promise<void>;
  abstract generateReleaseNotes(tag: string, previousTag?: string): Promise<string>;

  /**
   * Make an authenticated HTTP request
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

    const response = await fetch(url, this.buildFetchOptions({
      ...options,
      headers,
    }));

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(
        `HTTP ${response.status} ${response.statusText}: ${errorText}`
      );
    }

    const data = response.status === 204 ? ({} as T) : await response.json();

    return { data: data as T, status: response.status };
  }
}
