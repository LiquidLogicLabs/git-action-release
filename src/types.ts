/**
 * Supported platform types
 */
export type Platform = 'github' | 'gitea';

/**
 * Release configuration options
 */
export interface ReleaseConfig {
  tag: string;
  name?: string;
  body?: string;
  draft?: boolean;
  prerelease?: boolean;
  commit?: string;
  owner?: string;
  repo?: string;
}

/**
 * Release creation result
 */
export interface ReleaseResult {
  id: string;
  html_url: string;
  upload_url: string;
  tarball_url?: string;
  zipball_url?: string;
  assets: Record<string, string>;
  draft?: boolean;
  prerelease?: boolean;
}

/**
 * Asset upload configuration
 */
export interface AssetConfig {
  path: string;
  contentType?: string;
  name?: string;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  platform: Platform;
  token: string;
  baseUrl?: string;
  owner?: string;
  repo?: string;
  skipCertificateCheck?: boolean;
  logger: import('./logger').Logger;
}

/**
 * Platform provider interface
 */
export interface IProvider {
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
  listAssets(releaseId: string): Promise<Array<{ id: string; name: string; url: string }>>;

  /**
   * Create a tag if it doesn't exist
   */
  createTag(tag: string, commit: string, message?: string): Promise<void>;

  /**
   * Generate release notes
   */
  generateReleaseNotes(tag: string, previousTag?: string): Promise<string>;
}

/**
 * Action inputs
 */
export interface ActionInputs {
  platform?: string;
  token: string;
  tag: string;
  name?: string;
  body?: string;
  bodyFile?: string;
  draft: boolean;
  prerelease: boolean;
  commit?: string;
  artifacts?: string;
  artifactContentType?: string;
  replacesArtifacts: boolean;
  removeArtifacts: boolean;
  artifactErrorsFailBuild: boolean;
  allowUpdates: boolean;
  skipIfReleaseExists: boolean;
  updateOnlyUnreleased: boolean;
  generateReleaseNotes: boolean;
  generateReleaseNotesPreviousTag?: string;
  repository?: string;
  owner?: string;
  repo?: string;
  omitBody: boolean;
  omitBodyDuringUpdate: boolean;
  omitDraftDuringUpdate: boolean;
  omitName: boolean;
  omitNameDuringUpdate: boolean;
  omitPrereleaseDuringUpdate: boolean;
  verbose: boolean;
  skipCertificateCheck: boolean;
}
