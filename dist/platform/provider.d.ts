import { IProvider, ReleaseConfig, ReleaseResult, AssetConfig } from '../types';
/**
 * Abstract base class for platform providers
 * All platform implementations should extend this class
 */
export declare abstract class BaseProvider implements IProvider {
    protected token: string;
    protected baseUrl?: string;
    protected owner?: string;
    protected repo?: string;
    protected logger: import('../logger').Logger;
    constructor(config: {
        token: string;
        baseUrl?: string;
        owner?: string;
        repo?: string;
        logger: import('../logger').Logger;
    });
    abstract createRelease(config: ReleaseConfig): Promise<ReleaseResult>;
    abstract updateRelease(releaseId: string, config: Partial<ReleaseConfig>): Promise<ReleaseResult>;
    abstract getReleaseByTag(tag: string): Promise<ReleaseResult | null>;
    abstract uploadAsset(releaseId: string, uploadUrl: string, asset: AssetConfig): Promise<string>;
    abstract deleteAsset(assetId: string): Promise<void>;
    abstract listAssets(releaseId: string): Promise<Array<{
        id: string;
        name: string;
        url: string;
    }>>;
    abstract createTag(tag: string, commit: string, message?: string): Promise<void>;
    abstract generateReleaseNotes(tag: string, previousTag?: string): Promise<string>;
    /**
     * Make an authenticated HTTP request
     */
    protected request<T>(url: string, options?: RequestInit): Promise<{
        data: T;
        status: number;
    }>;
}
//# sourceMappingURL=provider.d.ts.map