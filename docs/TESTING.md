# Testing Guide

This document describes how to run tests for the multi-platform release action.

## Test Types

The project includes three types of tests:

1. **Unit Tests** - Test individual components in isolation
2. **Integration Tests (Mocked)** - Test components with mocked HTTP responses
3. **E2E Tests** - Full end-to-end tests with real API calls

## Running Tests

### Unit Tests

Run unit tests only:

```bash
npm run test:unit
```

Unit tests cover:
- Logger functionality
- Platform detection logic
- Test utilities

### Integration Tests (Mocked)

Run integration tests with mocked HTTP:

```bash
npm run test:integration
```

Integration tests cover:
- Provider implementations (GitHub, Gitea) with mocked HTTP responses
- Action execution with mocked `@actions/core` and HTTP
- Platform detection scenarios

### E2E Tests

Run end-to-end tests with real API calls:

```bash
npm run test:e2e
```

**Important: Safe to Run Multiple Times**

E2E tests are designed to be run multiple times safely:

- **Unique Tags**: Each test generates a unique tag using timestamp + random string (e.g., `test-e2e-1767902557807-dimvltv`)
- **Automatic Cleanup**: Each test automatically cleans up releases it creates in `afterEach` hooks
- **No Conflicts**: Unique tags prevent conflicts between test runs
- **Idempotent**: Can run multiple times without accumulating releases (cleanup happens after each test)

**Requirements:**

- GitHub E2E tests require `GITHUB_TOKEN` environment variable (set from `TEST_GITHUB_TOKEN` secret in TEST environment)
- Gitea E2E tests require `GITEA_TOKEN` environment variable (set from `TEST_GITEA_TOKEN` secret in TEST environment)

**Optional environment variables:**

- `TEST_GITHUB_REPO` - GitHub test repository (default: `LiquidLogicLabs/git-action-release-tests`)
- `TEST_GITEA_REPO` - Gitea test repository (default: `l3io/git-action-release-tests`)
- `TEST_GITEA_URL` - Gitea base URL (default: `https://git.ravenwolf.org`)
- `VERBOSE` - Enable verbose logging (set to `true`)

**Example:**

```bash
# Using standard token names (recommended)
export GITHUB_TOKEN="your-github-token"  # Or use TEST_GITHUB_TOKEN in TEST environment
export GITEA_TOKEN="your-gitea-token"
export TEST_GITHUB_REPO="your-org/your-test-repo"  # Optional
export TEST_GITEA_REPO="your-org/your-test-repo"   # Optional
export TEST_GITEA_URL="https://your-gitea-instance.com"  # Optional

npm run test:e2e

# Note: In TEST environment, TEST_GITHUB_TOKEN is mapped to GITHUB_TOKEN
export GITEA_TOKEN="test-repo-token"
npm run test:e2e
```

### All Tests

Run all tests (unit + integration):

```bash
npm run test:all
```

Note: E2E tests are excluded from `test:all` as they require tokens. Run them separately.

## Test Structure

```
src/__tests__/
├── integration/
│   ├── mocks/
│   │   ├── fetch.ts              # Global fetch mock helper
│   │   ├── github-responses.ts   # GitHub API response fixtures
│   │   └── gitea-responses.ts    # Gitea API response fixtures
│   ├── providers/
│   │   ├── github-provider.test.ts
│   │   └── gitea-provider.test.ts
│   ├── action-execution.test.ts  # Full action execution with mocks
│   └── helpers/
│       ├── test-utils.ts         # Test utilities
│       └── mock-core.ts          # Mock @actions/core helper
├── e2e/
│   ├── github-e2e.test.ts        # GitHub E2E tests
│   ├── gitea-e2e.test.ts         # Gitea E2E tests
│   ├── cleanup.ts                # Platform-agnostic cleanup (delegates to platform-specific)
│   ├── cleanup-github.ts         # GitHub-specific cleanup implementation
│   └── cleanup-gitea.ts          # Gitea-specific cleanup implementation
├── logger.test.ts                # Logger unit tests
├── platform/
│   └── detector.test.ts          # Platform detection unit tests
└── setup.ts                      # Jest setup file
```

## Continuous Integration

### CI Workflow

The CI workflow (`.github/workflows/ci.yml`) runs:

1. **Lint** - Code linting and type checking
2. **Build** - TypeScript compilation
3. **Unit Tests** - Via reusable `test.yml` workflow
4. **Integration Tests** - Mocked integration tests
5. **E2E Tests** - Full E2E tests (requires tokens, continues on error if missing)

### E2E Test Workflow

The E2E test workflow (`.github/workflows/e2e-tests.yml`) can be:

- **Manually triggered** via `workflow_dispatch`
- **Scheduled** to run weekly

This workflow runs full E2E tests against the test repositories.

## Test Coverage Goals

- **Unit Tests**: 80%+ coverage (Logger, PlatformDetector, utilities)
- **Integration Tests (Mocked)**: 90%+ coverage of provider methods
- **E2E Tests**: Critical path coverage (create, update, upload, error handling)

## Writing Tests

### Integration Tests (Mocked)

Use the `fetchMock` helper to mock HTTP responses:

```typescript
import { fetchMock } from '../mocks/fetch';
import { githubResponses } from '../mocks/github-responses';

beforeEach(() => {
  fetchMock.setup();
});

afterEach(() => {
  fetchMock.reset();
});

it('should create a release', async () => {
  fetchMock.mockResponse(
    `https://api.github.com/repos/owner/repo/releases`,
    {
      status: 201,
      data: githubResponses.createRelease,
    }
  );

  // Test your code here
});
```

### E2E Tests

E2E tests make real API calls and automatically clean up after themselves:

```typescript
import { generateTestTag, cleanupRelease } from './cleanup';

beforeEach(() => {
  // Generate a unique tag for each test (timestamp + random)
  testTag = generateTestTag('test-e2e-');
});

afterEach(async () => {
  // Automatically cleanup releases created during the test
  // cleanupRelease() will actually delete the release via API call
  if (testTag) {
    await cleanupRelease(provider, testTag);
  }
});
```

**Cleanup Implementation:**

The cleanup system is split by platform for better maintainability:

- **Platform-Agnostic Interface** (`cleanup.ts`): Provides `cleanupRelease()` and `cleanupAllTestReleases()` that work with `IProvider`
- **GitHub Implementation** (`cleanup-github.ts`): Handles GitHub-specific cleanup logic
  - Deletes releases via GitHub API
  - Explicitly deletes tag refs (GitHub requires this)
- **Gitea Implementation** (`cleanup-gitea.ts`): Handles Gitea-specific cleanup logic
  - Deletes releases via Gitea API
  - Tags are automatically deleted when releases are deleted (Gitea behavior)

**Benefits of Platform-Specific Cleanup:**

- Each platform can implement cleanup independently
- Easy to add new platforms (just add a new cleanup-{platform}.ts file)
- Platform-specific differences are isolated (e.g., GitHub requires explicit tag deletion)
- Better type safety (functions receive specific provider types)

**Running Multiple Times:**

E2E tests are **safe to run multiple times**:
- Each test run uses unique tags (timestamp + random) - no conflicts
- Cleanup happens automatically after each test in `afterEach` hooks
- Releases are actually deleted, preventing accumulation
- Use `cleanupAllTestReleases(provider, 'test-e2e-')` if you need to clean up old test releases manually

## Troubleshooting

### Tests failing due to missing mocks

Ensure `@actions/core` and `fs` are mocked before importing code that uses them.

### E2E tests failing

- Verify tokens are set correctly: `echo $GITHUB_TOKEN` or `echo $GITEA_TOKEN`
- `GITHUB_TOKEN` is set from `TEST_GITHUB_TOKEN` secret in TEST environment
- `GITEA_TOKEN` is set from `TEST_GITEA_TOKEN` secret in TEST environment
- Check test repository permissions (token needs `contents: write` permission)
- Ensure test repository exists and is accessible
- Check network connectivity to Gitea instance (for Gitea tests)
- Verify cleanup is working - check test repository for accumulated releases

### Cleanup Issues

If releases are accumulating in the test repository:

- Check cleanup logs for errors during `afterEach`
- Verify token has permissions to delete releases
- Manually clean up old test releases if needed using the repository UI
- Use `cleanupAllTestReleases()` in a separate script if needed

### Integration tests timing out

Integration tests should run quickly as they're mocked. If they timeout:
- Check for infinite loops in code
- Verify mocks are set up correctly
- Check for async operations that aren't being awaited

## Act-Based Testing

For local workflow testing with `act`, use the npm scripts:

```bash
npm run test:act        # Test reusable test workflow
npm run test:act:ci     # Test CI workflow
npm run test:act:release # Test release workflow
```

See `.github/workflows/.act/` for event files used by `act`.
