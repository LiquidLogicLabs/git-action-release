import { IProvider, ReleaseResult, ActionInputs } from './types';
import { Logger } from './logger';
/**
 * Release manager coordinates release operations via provider interface
 */
export declare class ReleaseManager {
    private provider;
    private config;
    private logger;
    constructor(provider: IProvider, config: ActionInputs, logger: Logger);
    /**
     * Execute the release workflow
     */
    execute(): Promise<ReleaseResult>;
    /**
     * Get tag from config or environment
     */
    private getTag;
    /**
     * Prepare release configuration
     */
    private prepareReleaseConfig;
    /**
     * Get release body from file or input
     */
    private getReleaseBody;
    /**
     * Handle asset uploads
     */
    private handleAssets;
    /**
     * Set action outputs
     */
    private setOutputs;
}
