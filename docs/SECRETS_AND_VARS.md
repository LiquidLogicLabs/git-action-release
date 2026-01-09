# Required Secrets and Variables for E2E Tests

This document lists the GitHub secrets and variables required for E2E tests to run in CI/CD workflows.

## Summary

E2E tests are now included in the `test.yml` reusable workflow, which is called by both:
- `ci.yml` (on branch pushes)
- `release.yml` (on tag pushes before release)

## Required Secrets

### 1. `TEST_GITHUB_TOKEN`
- **Type**: Secret
- **Description**: GitHub Personal Access Token with access to the test repository
- **Required Scopes**:
  - `repo` (all) - Full control of private repositories
  - For organization repositories: Token must have access to the organization
- **Usage**: Used to authenticate GitHub API calls for E2E tests
- **Note**: GitHub doesn't allow secrets starting with `GITHUB_` in environments, so we use `TEST_GITHUB_TOKEN` and map it to `GITHUB_TOKEN` in the workflow

### 2. `TEST_GITEA_TOKEN`
- **Type**: Secret
- **Description**: Gitea Personal Access Token with access to the test repository
- **Required Permissions**:
  - `write:repository` - Write access to repositories
  - Access to the test repository (`l3io/git-release-action-tests`)
- **Usage**: Used to authenticate Gitea API calls for E2E tests
- **Note**: Mapped to `GITEA_TOKEN` in workflow environment variables for consistency with `TEST_GITHUB_TOKEN` naming

## Optional Variables (with defaults)

These variables are **optional** and have sensible defaults. Only set them if you want to use different test repositories:

### 1. `TEST_GITHUB_REPO`
- **Type**: Variable
- **Description**: GitHub test repository in format `owner/repo`
- **Default**: `LiquidLogicLabs/git-release-action-tests`
- **Usage**: Specifies which GitHub repository to use for E2E tests
- **Example**: `LiquidLogicLabs/git-release-action-tests`

### 2. `TEST_GITEA_REPO`
- **Type**: Variable
- **Description**: Gitea test repository in format `owner/repo`
- **Default**: `l3io/git-release-action-tests`
- **Usage**: Specifies which Gitea repository to use for E2E tests
- **Example**: `l3io/git-release-action-tests`

### 3. `TEST_GITEA_URL`
- **Type**: Variable
- **Description**: Base URL for the Gitea instance (for self-hosted Gitea)
- **Default**: `https://git.ravenwolf.org`
- **Usage**: Specifies the Gitea instance URL for E2E tests
- **Example**: `https://git.ravenwolf.org` or `https://gitea.example.com`

## Setting Up Secrets and Variables

### Via GitHub Web UI

**For Repository-Level with TEST Environment (Current Setup)**:
1. Go to: `https://github.com/LiquidLogicLabs/git-release-action/settings/environments`
2. Click on the "TEST" environment
3. Add secrets:
   - `TEST_GITHUB_TOKEN` - GitHub token for test repository access (mapped to `GITHUB_TOKEN` in workflow)
   - `TEST_GITEA_TOKEN` - Gitea token for test repository access (mapped to `GITEA_TOKEN` in workflow)
4. Add variables (already set):
   - `TEST_GITHUB_REPO` - `LiquidLogicLabs/git-release-action-tests`
   - `TEST_GITEA_REPO` - `l3io/git-release-action-tests`
   - `TEST_GITEA_URL` - `https://git.ravenwolf.org`

**Note**: GitHub doesn't allow secrets starting with `GITHUB_` in environments, so we use `TEST_GITHUB_TOKEN` and map it to `GITHUB_TOKEN` in the workflow environment variables.

### Via GitHub CLI

```bash
# Set repository-level secrets in TEST environment
gh secret set TEST_GITHUB_TOKEN --repo LiquidLogicLabs/git-release-action --env TEST
gh secret set TEST_GITEA_TOKEN --repo LiquidLogicLabs/git-release-action --env TEST

# Set repository-level variables in TEST environment (already done)
gh variable set TEST_GITHUB_REPO --repo LiquidLogicLabs/git-release-action --env TEST --body "LiquidLogicLabs/git-release-action-tests"
gh variable set TEST_GITEA_REPO --repo LiquidLogicLabs/git-release-action --env TEST --body "l3io/git-release-action-tests"
gh variable set TEST_GITEA_URL --repo LiquidLogicLabs/git-release-action --env TEST --body "https://git.ravenwolf.org"
```

**Note**: When setting secrets via CLI, you'll be prompted to enter the secret value interactively, or you can pipe it:
```bash
echo "your-token-value" | gh secret set SECRET_NAME --repo LiquidLogicLabs/git-release-action --env TEST
```

## Minimum Required Setup

**Minimum required for E2E tests to run:**

1. **`TEST_GITHUB_TOKEN`** secret
   - Must have `repo` scope
   - Must have access to `LiquidLogicLabs/git-release-action-tests` repository
   - Mapped to `GITHUB_TOKEN` in workflow environment variables

2. **`TEST_GITEA_TOKEN`** secret
   - Must have `write:repository` permission
   - Must have access to `l3io/git-release-action-tests` repository on `https://git.ravenwolf.org`
   - Mapped to `GITEA_TOKEN` in workflow environment variables

**Variables are optional** - defaults will be used if not set.

## Token Requirements Details

### GitHub Token

- **Type**: Personal Access Token (Classic) or Fine-Grained Personal Access Token
- **Scopes**:
  - `repo` (all) - Required for creating releases in private repositories
  - For organization repositories: Token must be granted access to the organization
- **Access**: Must have write access to `LiquidLogicLabs/git-release-action-tests` repository
- **Note**: Fine-grained tokens need explicit organization access granted

### Gitea Token

- **Type**: Personal Access Token
- **Permissions**:
  - `write:repository` - Required for creating releases
- **Access**: Must have write access to `l3io/git-release-action-tests` repository on `https://git.ravenwolf.org`

## Test Repository Requirements

Both test repositories must:

1. **Exist** and be accessible with the provided tokens
2. **Have at least one commit** (releases require commits)
3. **Be accessible** by the tokens (private repos need token access)

## Workflow Behavior

- **E2E tests run in**:
  - `test.yml` reusable workflow (called by both CI and release workflows)
  - `ci.yml` integration-tests job (on branch pushes only)
  - `e2e-tests.yml` dedicated workflow (manual trigger or weekly schedule)

- **If tokens are missing**:
  - E2E tests will be skipped with `continue-on-error: true`
  - Workflow will continue but E2E tests won't run
  - This allows workflows to run even if tokens aren't configured

## Verification

To verify secrets/variables are set correctly:

1. Check workflow runs - E2E tests should execute if tokens are available
2. Check workflow logs - Look for "Run E2E tests" step
3. If tests are skipped, check for "continue-on-error" messages

## Security Notes

- **Never commit tokens** to the repository
- **Use organization-level secrets** when possible for easier management
- **Rotate tokens regularly** for security
- **Use fine-grained tokens** with minimal required permissions when possible
- **Test repositories should be private** to avoid exposing test data
