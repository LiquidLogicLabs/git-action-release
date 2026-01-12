export function parseRepository(repository: string): { owner: string; repo: string } {
  const parts = repository.split('/').filter(Boolean);
  if (parts.length !== 2) {
    throw new Error(`Invalid repository format: ${repository}. Expected format: owner/repo`);
  }
  return { owner: parts[0], repo: parts[1] };
}
