/**
 * Gitea API response fixtures
 */

export const giteaResponses = {
  createRelease: {
    id: 123456,
    html_url: 'https://git.ravenwolf.org/l3io/git-release-action-tests/releases/tag/v1.0.0',
    upload_url: 'https://git.ravenwolf.org/api/v1/repos/l3io/git-release-action-tests/releases/123456/assets',
    tarball_url: 'https://git.ravenwolf.org/l3io/git-release-action-tests/archive/v1.0.0.tar.gz',
    zipball_url: 'https://git.ravenwolf.org/l3io/git-release-action-tests/archive/v1.0.0.zip',
    tag_name: 'v1.0.0',
    title: 'v1.0.0',
    note: 'Release body',
    draft: false,
    prerelease: false,
    created_at: '2024-01-01T00:00:00Z',
    published_at: '2024-01-01T00:00:00Z',
  },

  updateRelease: {
    id: 123456,
    html_url: 'https://git.ravenwolf.org/l3io/git-release-action-tests/releases/tag/v1.0.0',
    upload_url: 'https://git.ravenwolf.org/api/v1/repos/l3io/git-release-action-tests/releases/123456/assets',
    tarball_url: 'https://git.ravenwolf.org/l3io/git-release-action-tests/archive/v1.0.0.tar.gz',
    zipball_url: 'https://git.ravenwolf.org/l3io/git-release-action-tests/archive/v1.0.0.zip',
    tag_name: 'v1.0.0',
    title: 'Updated Release Name',
    note: 'Updated release body',
    draft: false,
    prerelease: false,
  },

  getReleaseByTag: {
    id: 123456,
    html_url: 'https://git.ravenwolf.org/l3io/git-release-action-tests/releases/tag/v1.0.0',
    upload_url: 'https://git.ravenwolf.org/api/v1/repos/l3io/git-release-action-tests/releases/123456/assets',
    tarball_url: 'https://git.ravenwolf.org/l3io/git-release-action-tests/archive/v1.0.0.tar.gz',
    zipball_url: 'https://git.ravenwolf.org/l3io/git-release-action-tests/archive/v1.0.0.zip',
    tag_name: 'v1.0.0',
    title: 'v1.0.0',
    note: 'Release body',
    draft: false,
    prerelease: false,
    assets: [
      {
        id: 789,
        name: 'artifact.zip',
        browser_download_url: 'https://git.ravenwolf.org/l3io/git-release-action-tests/releases/download/v1.0.0/artifact.zip',
      },
    ],
  },

  uploadAsset: {
    id: 789,
    name: 'artifact.zip',
    browser_download_url: 'https://git.ravenwolf.org/l3io/git-release-action-tests/releases/download/v1.0.0/artifact.zip',
    size: 1024,
    content_type: 'application/zip',
  },

  listAssets: [
    {
      id: 789,
      name: 'artifact.zip',
      browser_download_url: 'https://git.ravenwolf.org/l3io/git-release-action-tests/releases/download/v1.0.0/artifact.zip',
    },
    {
      id: 790,
      name: 'artifact.tar.gz',
      browser_download_url: 'https://git.ravenwolf.org/l3io/git-release-action-tests/releases/download/v1.0.0/artifact.tar.gz',
    },
  ],

  createTag: {
    name: 'v1.0.0',
    id: 'abc123',
    message: 'Release v1.0.0',
    tarball_url: 'https://git.ravenwolf.org/l3io/git-release-action-tests/archive/v1.0.0.tar.gz',
    zipball_url: 'https://git.ravenwolf.org/l3io/git-release-action-tests/archive/v1.0.0.zip',
    commit: {
      sha: 'abc123',
      url: 'https://git.ravenwolf.org/api/v1/repos/l3io/git-release-action-tests/commits/abc123',
    },
  },

  error404: {
    message: 'release tag does not exist',
  },

  error401: {
    message: 'user does not have permission to access this resource',
  },

  error403: {
    message: 'user does not have permission to access this resource',
  },
};
