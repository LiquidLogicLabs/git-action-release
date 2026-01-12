import { parseRepository } from '../../utils/repository';

describe('parseRepository', () => {
  it('parses owner/repo format', () => {
    const result = parseRepository('owner/repo');
    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  it('trims leading/trailing slashes', () => {
    const result = parseRepository('/owner/repo/');
    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  it('throws on invalid format', () => {
    expect(() => parseRepository('invalid')).toThrow('Invalid repository format');
  });
});
