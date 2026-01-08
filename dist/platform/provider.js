"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseProvider = void 0;
/**
 * Abstract base class for platform providers
 * All platform implementations should extend this class
 */
class BaseProvider {
    token;
    baseUrl;
    owner;
    repo;
    logger;
    constructor(config) {
        this.token = config.token;
        this.baseUrl = config.baseUrl;
        this.owner = config.owner;
        this.repo = config.repo;
        this.logger = config.logger;
    }
    /**
     * Make an authenticated HTTP request
     */
    async request(url, options = {}) {
        const headers = {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            ...options.headers,
        };
        const response = await fetch(url, {
            ...options,
            headers,
        });
        if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorText}`);
        }
        const data = response.status === 204 ? {} : await response.json();
        return { data: data, status: response.status };
    }
}
exports.BaseProvider = BaseProvider;
//# sourceMappingURL=provider.js.map