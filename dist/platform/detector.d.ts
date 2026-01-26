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
    static detect(explicitPlatform?: string, repositoryUrl?: string, token?: string): Promise<PlatformInfo>;
}
//# sourceMappingURL=detector.d.ts.map