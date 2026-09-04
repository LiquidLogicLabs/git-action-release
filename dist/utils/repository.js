"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRepository = parseRepository;
exports.safeSegment = safeSegment;
function parseRepository(repository) {
    const parts = repository.split('/').filter(Boolean);
    if (parts.length !== 2) {
        throw new Error(`Invalid repository format: ${repository}. Expected format: owner/repo`);
    }
    return { owner: parts[0], repo: parts[1] };
}
/**
 * Encode a value for use as a single path segment in an API URL.
 *
 * Interpolating a value straight into a path lets it redirect the request. Verified against
 * WHATWG URL resolution, which is what fetch applies:
 *
 *   `/repos/o/r/git/refs/tags/${'../../../user'}`  =>  /repos/o/user
 *   `/repos/o/r/git/refs/tags/${'..'}`             =>  /repos/o/r/git/refs/
 *
 * This action issues DELETE and PATCH against these paths, so a redirected request acts on
 * the collection rather than on one item.
 *
 * encodeURIComponent is necessary but not sufficient: it does not encode dots, so a bare
 * "." or ".." survives it unchanged and is then removed by dot-segment normalisation. Those
 * two are refused outright rather than encoded, because no legitimate tag, owner, repo or
 * id is named "." or "..".
 */
function safeSegment(value, label) {
    if (value === '.' || value === '..') {
        throw new Error(`Refusing to use ${JSON.stringify(value)} as a ${label}: it would redirect the request to a different endpoint.`);
    }
    return encodeURIComponent(value);
}
//# sourceMappingURL=repository.js.map