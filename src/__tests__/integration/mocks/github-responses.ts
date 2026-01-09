/**
 * GitHub API response fixtures
 */

export const githubResponses = {
  createRelease: {
    id: 123456,
    html_url: 'https://github.com/owner/repo/releases/tag/v1.0.0',
    upload_url: 'https://uploads.github.com/repos/owner/repo/releases/123456/assets{?name,label}',
    tarball_url: 'https://api.github.com/repos/owner/repo/tarball/v1.0.0',
    zipball_url: 'https://api.github.com/repos/owner/repo/zipball/v1.0.0',
    tag_name: 'v1.0.0',
    name: 'v1.0.0',
    body: 'Release body',
    draft: false,
    prerelease: false,
    created_at: '2024-01-01T00:00:00Z',
    published_at: '2024-01-01T00:00:00Z',
  },

  updateRelease: {
    id: 123456,
    html_url: 'https://github.com/owner/repo/releases/tag/v1.0.0',
    upload_url: 'https://uploads.github.com/repos/owner/repo/releases/123456/assets{?name,label}',
    tarball_url: 'https://api.github.com/repos/owner/repo/tarball/v1.0.0',
    zipball_url: 'https://api.github.com/repos/owner/repo/zipball/v1.0.0',
    tag_name: 'v1.0.0',
    name: 'Updated Release Name',
    body: 'Updated release body',
    draft: false,
    prerelease: false,
  },

  getReleaseByTag: {
    id: 123456,
    html_url: 'https://github.com/owner/repo/releases/tag/v1.0.0',
    upload_url: 'https://uploads.github.com/repos/owner/repo/releases/123456/assets{?name,label}',
    tarball_url: 'https://api.github.com/repos/owner/repo/tarball/v1.0.0',
    zipball_url: 'https://api.github.com/repos/owner/repo/zipball/v1.0.0',
    tag_name: 'v1.0.0',
    name: 'v1.0.0',
    body: 'Release body',
    draft: false,
    prerelease: false,
    assets: [
      {
        id: 789,
        name: 'artifact.zip',
        browser_download_url: 'https://github.com/owner/repo/releases/download/v1.0.0/artifact.zip',
      },
    ],
  },

  uploadAsset: {
    id: 789,
    name: 'artifact.zip',
    browser_download_url: 'https://github.com/owner/repo/releases/download/v1.0.0/artifact.zip',
    size: 1024,
    content_type: 'application/zip',
  },

  listAssets: [
    {
      id: 789,
      name: 'artifact.zip',
      browser_download_url: 'https://github.com/owner/repo/releases/download/v1.0.0/artifact.zip',
    },
    {
      id: 790,
      name: 'artifact.tar.gz',
      browser_download_url: 'https://github.com/owner/repo/releases/download/v1.0.0/artifact.tar.gz',
    },
  ],

  createTagRef: {
    ref: 'refs/tags/v1.0.0',
    url: 'https://api.github.com/repos/owner/repo/git/refs/tags/v1.0.0',
    object: {
      sha: 'abc123',
      type: 'commit',
      url: 'https://api.github.com/repos/owner/repo/git/commits/abc123',
    },
  },

  createTagObject: {
    sha: 'def456',
    url: 'https://api.github.com/repos/owner/repo/git/tags/def456',
    tag: 'v1.0.0',
    message: 'Release v1.0.0',
    object: {
      sha: 'abc123',
      type: 'commit',
      url: 'https://api.github.com/repos/owner/repo/git/commits/abc123',
    },
    tagger: {
      name: 'Test User',
      email: 'test@example.com',
      date: '2024-01-01T00:00:00Z',
    },
  },

  generateReleaseNotes: {
    name: 'v1.0.0',
    body: '## What\'s Changed\n\n* Feature 1\n* Feature 2\n\n**Full Changelog**: https://github.com/owner/repo/compare/v0.9.0...v1.0.0',
    tag_name: 'v1.0.0',
  },

  error404: {
    message: 'Not Found',
    documentation_url: 'https://docs.github.com/rest',
  },

  error401: {
    message: 'Bad credentials',
    documentation_url: 'https://docs.github.com/rest',
  },

  error403: {
    message: 'Resource not accessible by integration',
    documentation_url: 'https://docs.github.com/rest',
  },
};
