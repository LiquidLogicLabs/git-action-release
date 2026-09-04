import { safeSegment } from '../utils/repository';

/**
 * A value interpolated unencoded into an API path can redirect the request to a different
 * endpoint. Verified against WHATWG URL resolution, which is what fetch applies:
 *
 *   tag = "../../../user"  ->  /repos/o/r/git/refs/tags/../../../user  =>  /repos/o/user
 *   tag = ".."             ->  /repos/o/r/git/refs/tags/..             =>  /repos/o/r/git/refs/
 *
 * The second is the dangerous one here: this action issues DELETE and PATCH against these
 * paths, so a redirected request acts on the COLLECTION rather than one item.
 *
 * encodeURIComponent alone is NOT sufficient — it does not encode dots, so ".." survives it
 * unchanged. Tests assert the NORMALIZED pathname, because asserting the built string passes
 * while the sink stays open.
 */
const BASE = 'https://api.example.com';
const normalized = (path: string) => new URL(BASE + path).pathname;

describe('safeSegment', () => {
  it('encodes slashes so a segment cannot introduce new path levels', () => {
    const path = `/repos/o/r/git/refs/tags/${safeSegment('../../../user', 'tag')}`;
    expect(normalized(path)).toBe('/repos/o/r/git/refs/tags/..%2F..%2F..%2Fuser');
  });

  it.each(['..', '.'])('refuses a bare %s, which encoding alone would not stop', (dots) => {
    expect(() => safeSegment(dots, 'tag')).toThrow(/redirect/i);
  });

  it('encodes a query string so it cannot alter the request', () => {
    const path = `/repos/o/r/releases/tags/${safeSegment('v1?per_page=1', 'tag')}`;
    expect(normalized(path)).toBe('/repos/o/r/releases/tags/v1%3Fper_page%3D1');
    expect(new URL(BASE + path).search).toBe('');
  });

  it('encodes a fragment so the rest of the path is not discarded', () => {
    const path = `/repos/o/r/releases/tags/${safeSegment('v1#x', 'tag')}`;
    expect(normalized(path)).toBe('/repos/o/r/releases/tags/v1%23x');
  });

  it('leaves an ordinary tag readable', () => {
    expect(safeSegment('v1.2.3', 'tag')).toBe('v1.2.3');
    expect(normalized(`/repos/o/r/releases/tags/${safeSegment('v1.2.3', 'tag')}`))
      .toBe('/repos/o/r/releases/tags/v1.2.3');
  });

  it('names the label so an operator can tell which value was rejected', () => {
    expect(() => safeSegment('..', 'owner')).toThrow(/owner/);
  });
});
