import { BaseProvider } from './provider';
import { ReleaseConfig, ReleaseResult, AssetConfig } from '../types';
import { Logger } from '../logger';
/**
 * Gitea provider implementation
 */
export declare class GiteaProvider extends BaseProvider {
    private readonly apiBaseUrl;
    protected owner: string;
    protected repo: string;
    constructor(config: {
        token: string;
        baseUrl?: string;
        owner?: string;
        repo?: string;
        skipCertificateCheck?: boolean;
        logger: Logger;
    });
    private extractRepoFromEnv;
    /**
     * Get the default branch HEAD SHA
     */
    /**
     * The commit SHA from the runner environment, but ONLY when the workflow is running
     * on the same forge host this provider targets.
     *
     * GITHUB_SHA is the *running workflow's* commit. It is the right tag target when the
     * release is for the repository the workflow lives in, and it is cheaper than an API
     * call. It is meaningless when the target is a different repository, and Gitea then
     * rejects the tag with:
     *
     *   404 target not found: object does not exist [id: <sha>, rel_path: ]
     *
     * The check compares HOSTS, not owner/repo. `this.owner` and `this.repo` fall back to
     * GITHUB_REPOSITORY_OWNER / GITHUB_REPOSITORY in the constructor, so comparing them
     * against those same variables self-matches whenever they were env-derived. Host
     * comparison also catches the mirror case, where the same owner/repo name exists on
     * both GitHub and a Gitea instance.
     *
     * When the forge cannot be proven the SHA is not trusted: falling back to the target's
     * default-branch HEAD may tag a different commit than intended, but it always names a
     * commit that exists in the target repository.
     */
    private trustedEnvCommitSha;
    private getDefaultBranchSha;
    /**
     * Check if a tag exists in the repository
     */
    private tagExists;
    /**
     * Create a new release
     */
    createRelease(config: ReleaseConfig): Promise<ReleaseResult>;
    private findReleaseByTagWithRetries;
    private readEnvNumber;
    private findReleaseInList;
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
     * Generate release notes (Gitea doesn't have built-in release notes generation)
     * Return empty string as placeholder
     */
    generateReleaseNotes(_tag: string, _previousTag?: string): Promise<string>;
    /**
     * Override request method to use Gitea-specific headers
     */
    protected request<T>(url: string, options?: RequestInit): Promise<{
        data: T;
        status: number;
    }>;
}
//# sourceMappingURL=gitea.d.ts.map