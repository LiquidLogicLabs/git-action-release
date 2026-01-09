# Act Test Event Files

This directory contains event payload files for testing workflows locally with `act`.

## Event Files

- `event-push-tag.json` - Simulates a tag push (triggers release workflow, should NOT trigger CI directly)
- `event-push-branch.json` - Simulates a branch push (should trigger CI workflow)
- `event-pull-request.json` - Simulates a pull request (should trigger CI workflow)
- `event-release.json` - Original tag push event for release workflow testing
- `event-workflow-call.json` - Simulates workflow_call event (for testing reusable workflows)
- `event-workflow-dispatch-release.json` - Manual trigger for release workflow with tag input
- `event-workflow-dispatch-ci.json` - Manual trigger for CI workflow

## Test Scenarios

### Test CI workflow with branch push (should run)
```bash
npm run test:act:ci-branch
```
Expected: CI workflow runs (lint and test jobs execute)

### Test CI workflow with tag push (should be skipped)
```bash
npm run test:act:ci-tag
```
Expected: CI workflow should NOT run (jobs should be skipped)

### Test CI workflow with pull request (should run)
```bash
npm run test:act:ci-pr
```
Expected: CI workflow runs (lint and test jobs execute)

### Test CI workflow with workflow_dispatch (should run)
```bash
npm run test:act:ci-dispatch
```
Expected: CI workflow runs (lint and test jobs execute)

### Test release workflow with tag push (should run all jobs)
```bash
npm run test:act:release-tag
```
Expected: Release workflow runs, calls CI via workflow_call, calls E2E via workflow_call, then releases

### Test release workflow with workflow_dispatch (should run all jobs)
```bash
npm run test:act:release-dispatch
```
Expected: Release workflow runs with manual tag input, all jobs execute

### Test reusable workflows via workflow_call

#### Test workflow
```bash
npm run test:act:test-call
```
Expected: Test workflow runs all tests

#### E2E Tests workflow
```bash
npm run test:act:e2e-call
```
Expected: E2E Tests workflow runs (may skip if no TEST environment configured)

## Important Notes

- **`act` limitations with reusable workflows**: `act` does not fully simulate the `workflow_call` event context. When testing workflows that call reusable workflows (like `release.yml` calling `ci.yml`), `act` may not correctly set `github.event_name` to `'workflow_call'` in the called workflow. This means:
  - Conditions that rely on `github.event_name == 'workflow_call'` may not work correctly in `act`
  - The `github.ref` context may not be properly inherited from the caller
  - **Always verify workflow conditions in real GitHub Actions** after local testing with `act`
  
- Act may not fully support all GitHub Actions features (e.g., reusable workflows, environments)
- Some steps may fail locally but work correctly in GitHub Actions
- Use verbose mode (`-v` flag) for more detailed output
- These tests verify workflow structure and conditions, not full E2E execution
- **For critical workflow logic**: Always test in GitHub Actions to verify real behavior

## Verifying Conditions

The key things to verify:

1. **CI workflow should NOT run on tag pushes** - Only release workflow should handle tags
2. **CI workflow should run on branch pushes** - Regular development workflow
3. **CI workflow should run on pull requests** - PR validation
4. **CI workflow should run when called via workflow_call** - From release workflow
5. **Reusable workflows should run when called via workflow_call** - From parent workflows
6. **Release workflow should call CI and E2E via workflow_call** - Orchestration works
