import { BaseProvider } from './provider';
import { ReleaseConfig, ReleaseResult, AssetConfig } from '../types';
import { Logger } from '../logger';
/**
 * GitHub provider implementation
 */
export declare class GitHubProvider extends BaseProvider {
    private readonly apiBaseUrl;
    protected owner: string;
    protected repo: string;
    constructor(config: {
        token: string;
        owner?: string;
        repo?: string;
        logger: Logger;
    });
    private extractRepoFromEnv;
    /**
     * Create a new release
     */
    createRelease(config: ReleaseConfig): Promise<ReleaseResult>;
    /**
     * Update an existing release
     */
    updateRelease(releaseId: string, config: Partial<ReleaseConfig>): Promise<ReleaseResult>;
    /**
     * Get a release by tag
     */
    getReleaseByTag(tag: string): Promise<ReleaseResult | null>;
    /**
     * Upload an asset to a release
     */
    uploadAsset(releaseId: string, uploadUrl: string, asset: AssetConfig): Promise<string>;
    /**
     * Delete an asset from a release
     */
    deleteAsset(assetId: string): Promise<void>;
    /**
     * List assets for a release
     */
    listAssets(releaseId: string): Promise<Array<{
        id: string;
        name: string;
        url: string;
    }>>;
    /**
     * Create a tag if it doesn't exist
     */
    createTag(tag: string, commit: string, message?: string): Promise<void>;
    /**
     * Generate release notes
     */
    generateReleaseNotes(tag: string, previousTag?: string): Promise<string>;
    /**
     * Override request method to use GitHub-specific Accept header
     */
    protected request<T>(url: string, options?: RequestInit): Promise<{
        data: T;
        status: number;
    }>;
}
//# sourceMappingURL=github.d.ts.map