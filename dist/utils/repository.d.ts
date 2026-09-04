export declare function parseRepository(repository: string): {
    owner: string;
    repo: string;
};
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
export declare function safeSegment(value: string, label: string): string;
//# sourceMappingURL=repository.d.ts.map