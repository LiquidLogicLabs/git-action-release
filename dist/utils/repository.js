"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRepository = parseRepository;
function parseRepository(repository) {
    const parts = repository.split('/').filter(Boolean);
    if (parts.length !== 2) {
        throw new Error(`Invalid repository format: ${repository}. Expected format: owner/repo`);
    }
    return { owner: parts[0], repo: parts[1] };
}
//# sourceMappingURL=repository.js.map