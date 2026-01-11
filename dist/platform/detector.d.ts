import { Platform } from '../types';
/**
 * Platform detection result
 */
export interface PlatformInfo {
    platform: Platform;
    baseUrl?: string;
    owner?: string;
    repo?: string;
}
/**
 * Detects the platform from various sources
 */
export declare class PlatformDetector {
    /**
     * Detect platform from explicit input or auto-detect
     */
    static detect(explicitPlatform?: string, repositoryUrl?: string): PlatformInfo;
    /**
     * Detect platform with explicit platform type
     */
    private static detectWithPlatform;
    /**
     * Detect platform from repository URL
     */
    private static detectFromUrl;
    /**
     * Parse Gitea URL (supports base URL or repository URL)
     */
    private static parseGiteaUrl;
}
//# sourceMappingURL=detector.d.ts.map