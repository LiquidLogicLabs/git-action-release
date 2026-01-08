# Multi-Platform Release Action

[![CI](https://github.com/LiquidLogicLabs/git-release-action/actions/workflows/ci.yml/badge.svg)](https://github.com/LiquidLogicLabs/git-release-action/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

A GitHub/Gitea action for creating and managing releases across multiple platforms. This action is based on [ncipollo/release-action](https://github.com/ncipollo/release-action) but extends it to support GitHub, Gitea, and self-hosted Gitea instances.

## Features

- **Multi-Platform Support**: Works with GitHub, Gitea (including self-hosted instances)
- **Auto-Detection**: Automatically detects the platform from repository URL
- **Full Feature Parity**: Matches all features from ncipollo/release-action
  - Create and update releases
  - Upload artifacts with glob pattern support
  - Draft and prerelease support
  - Release body from file or input
  - Generate release notes (GitHub only)
  - Tag creation if missing
  - Artifact replacement/removal
- **Extensible Architecture**: Easy to add support for additional platforms (GitLab, Bitbucket, etc.)
- **Comprehensive Error Handling**: Clear error messages and proper validation

## Platform Detection

The action automatically detects the platform from the repository URL, but you can also explicitly specify it:

1. **Explicit Platform**: Set the `platform` input to `github` or `gitea`
2. **Auto-Detection**: If not specified, the action will:
   - Check if the repository URL contains `github.com` → GitHub
   - Check if the repository URL contains `gitea.io` or a custom domain → Gitea
   - Default to GitHub for GitHub Actions runners

## Usage

### Basic Usage (GitHub)

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: LiquidLogicLabs/git-release-action@v1
        with:
          tag: ${{ github.ref_name }}
          token: ${{ secrets.GITHUB_TOKEN }}
```

### Basic Usage (Gitea - Self-Hosted)

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: LiquidLogicLabs/git-release-action@v1
        with:
          platform: 'gitea'
          gitea_url: 'https://gitea.example.com'
          tag: ${{ github.ref_name }}
          token: ${{ secrets.GITEA_TOKEN }}
```

### With Artifacts

```yaml
- uses: LiquidLogicLabs/git-release-action@v1
  with:
    tag: 'v1.0.0'
    artifacts: 'dist/*.zip,binaries/**/*'
    replacesArtifacts: true
    token: ${{ secrets.GITHUB_TOKEN }}
```

### With Release Body File

```yaml
- uses: LiquidLogicLabs/git-release-action@v1
  with:
    tag: 'v1.0.0'
    bodyFile: 'CHANGELOG.md'
    token: ${{ secrets.GITHUB_TOKEN }}
```

### Explicit Platform Override

```yaml
- uses: LiquidLogicLabs/git-release-action@v1
  with:
    platform: 'github'  # or 'gitea'
    tag: 'v1.0.0'
    token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

### Platform Configuration

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `platform` | Platform type (`github` or `gitea`). If not provided, will auto-detect from repository URL | No | Auto-detect |
| `gitea_url` | Gitea base URL (e.g., `https://gitea.example.com`) or repository URL (e.g., `https://gitea.example.com/owner/repo`). Required for self-hosted Gitea | No | - |
| `token` | Platform token for authentication | No | `${{ github.token }}` |

### Release Configuration

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `tag` | Tag for the release. If omitted, the git ref will be used (if it is a tag) | No | - |
| `name` | Name for the release. If omitted, the tag will be used | No | - |
| `body` | Body for the release. Note: This input will have white space trimmed. Use `bodyFile` if you need a non-trivial markdown body | No | - |
| `bodyFile` | Body file for the release. This should be the path to the file | No | - |
| `draft` | Marks this release as a draft release | No | `false` |
| `prerelease` | Marks this release as prerelease | No | `false` |
| `commit` | Commit reference. This will be used to create the tag if it does not exist | No | - |

### Artifacts

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `artifacts` | Paths representing artifacts to upload. This may be a single path or a comma delimited list of paths (or globs) | No | - |
| `artifactContentType` | The content type of the artifact | No | `application/octet-stream` |
| `replacesArtifacts` | Indicates if existing release artifacts should be replaced | No | `true` |
| `removeArtifacts` | Indicates if existing release artifacts should be removed before uploading | No | `false` |
| `artifactErrorsFailBuild` | Indicates if artifact read or upload errors should fail the build | No | `false` |

### Release Management

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `allowUpdates` | Indicates if we should update a release if it already exists | No | `false` |
| `skipIfReleaseExists` | When enabled, the action will be skipped if a non-draft release already exists for the provided tag | No | `false` |
| `updateOnlyUnreleased` | When `allowUpdates` is enabled, this will fail the action if the release it is updating is not a draft or a prerelease | No | `false` |

### Release Notes

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `generateReleaseNotes` | Indicates if release notes should be automatically generated (GitHub only) | No | `false` |
| `generateReleaseNotesPreviousTag` | Previous tag to use when generating release notes. This will limit the release notes to changes between the two tags | No | - |

### Advanced Options

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `owner` | Optionally specify the owner of the repo where the release should be generated. Defaults to current repo owner | No | - |
| `repo` | Optionally specify the repo where the release should be generated. Defaults to current repo | No | - |
| `omitBody` | Indicates if the release body should be omitted | No | `false` |
| `omitBodyDuringUpdate` | Indicates if the release body should be omitted during updates | No | `false` |
| `omitDraftDuringUpdate` | Indicates if the draft flag should be omitted during updates | No | `false` |
| `omitName` | Indicates if the release name should be omitted | No | `false` |
| `omitNameDuringUpdate` | Indicates if the release name should be omitted during updates | No | `false` |
| `omitPrereleaseDuringUpdate` | Indicates if the prerelease flag should be omitted during updates | No | `false` |
| `verbose` | Enable verbose debug logging | No | `false` |

## Outputs

| Output | Description |
|--------|-------------|
| `id` | The identifier of the created release |
| `html_url` | The HTML URL of the release |
| `upload_url` | The URL for uploading assets to the release |
| `tarball_url` | The URL for downloading the release as a tarball (.tar.gz) |
| `zipball_url` | The URL for downloading the release as a zipball (.zip) |
| `assets` | JSON string containing a map of asset names to download URLs for uploaded assets |

## Examples

### Complete GitHub Release Workflow

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Build artifacts
        run: |
          npm run build
          npm run package

      - uses: LiquidLogicLabs/git-release-action@v1
        with:
          tag: ${{ github.ref_name }}
          name: Release ${{ github.ref_name }}
          bodyFile: CHANGELOG.md
          artifacts: 'dist/*.zip,dist/*.tar.gz'
          generateReleaseNotes: true
          token: ${{ secrets.GITHUB_TOKEN }}
```

### Complete Gitea Release Workflow (Self-Hosted)

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Build artifacts
        run: |
          npm run build
          npm run package

      - uses: LiquidLogicLabs/git-release-action@v1
        with:
          platform: 'gitea'
          gitea_url: 'https://gitea.example.com'
          tag: ${{ github.ref_name }}
          name: Release ${{ github.ref_name }}
          bodyFile: CHANGELOG.md
          artifacts: 'dist/*.zip,dist/*.tar.gz'
          token: ${{ secrets.GITEA_TOKEN }}
```

### Draft Release with Auto-Update

```yaml
- uses: LiquidLogicLabs/git-release-action@v1
  with:
    tag: 'v1.0.0'
    draft: true
    allowUpdates: true
    artifacts: 'build/*.zip'
    token: ${{ secrets.GITHUB_TOKEN }}
```

### Prerelease

```yaml
- uses: LiquidLogicLabs/git-release-action@v1
  with:
    tag: 'v1.0.0-beta.1'
    prerelease: true
    body: 'Beta release for testing'
    token: ${{ secrets.GITHUB_TOKEN }}
```

## Platform-Specific Notes

### GitHub

- Supports all features including automatic release notes generation
- Uses GitHub REST API v3
- Requires `contents: write` permission

### Gitea

- Supports most features except automatic release notes generation (Gitea API doesn't support this)
- Uses Gitea API v1
- For self-hosted instances, provide the base URL via `gitea_url` input
- Accepts either base URL (`https://gitea.example.com`) or repository URL (`https://gitea.example.com/owner/repo`)
- Requires repository access token with release permissions

## Migration from ncipollo/release-action

If you're migrating from `ncipollo/release-action`, the action is largely compatible. The main differences are:

1. **Platform Detection**: The action now auto-detects the platform, but you can override it
2. **Gitea Support**: Added support for Gitea and self-hosted Gitea instances
3. **Additional Input**: `platform` and `gitea_url` inputs for multi-platform support

To migrate:

1. Replace `ncipollo/release-action@v1` with `LiquidLogicLabs/git-release-action@v1`
2. If using Gitea, add `platform: 'gitea'` and `gitea_url` inputs
3. All other inputs remain the same

## Security

- The action automatically masks tokens in logs using `core.setSecret()`
- Tokens are never logged or exposed
- Use GitHub Secrets or Gitea Secrets for storing tokens
- Use the least privilege principle when creating tokens

## Troubleshooting

### Platform Not Detected

If platform detection fails, explicitly set the `platform` input:

```yaml
platform: 'github'  # or 'gitea'
```

### Gitea Connection Issues

For self-hosted Gitea instances:

1. Ensure `gitea_url` is correct (base URL or repository URL)
2. Verify the token has release permissions
3. Check network connectivity from the runner to your Gitea instance

### Artifact Upload Failures

- Ensure artifact paths are correct and files exist
- Check file permissions
- For large files, consider using a different upload mechanism
- Set `artifactErrorsFailBuild: true` to fail fast on errors

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Credits

This action is based on [ncipollo/release-action](https://github.com/ncipollo/release-action) and extends it with multi-platform support. Special thanks to the original authors and contributors.
