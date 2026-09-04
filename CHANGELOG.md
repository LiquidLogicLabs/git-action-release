## [2.0.7](https://github.com/LiquidLogicLabs/git-action-release/compare/v2.0.6...v2.0.7) (2026-09-04)


### Bug Fixes

* **ci:** restore secrets: inherit on the e2e-tests call ([ec73768](https://github.com/LiquidLogicLabs/git-action-release/commit/ec737688eabb06334e41fff72e4440b6ed779f08))



## [2.0.6](https://github.com/LiquidLogicLabs/git-action-release/compare/v2.0.5...v2.0.6) (2026-09-04)


### Bug Fixes

* **ci:** drop e2e-tests.yml to a contents: read permission ([73bb2a9](https://github.com/LiquidLogicLabs/git-action-release/commit/73bb2a98f496f34de4086ebdadbd7b9ec8a0dfec))



## [2.0.5](https://github.com/LiquidLogicLabs/git-action-release/compare/v2.0.4...v2.0.5) (2026-09-04)



## [2.0.4](https://github.com/LiquidLogicLabs/git-action-release/compare/v2.0.3...v2.0.4) (2026-09-04)


### Bug Fixes

* **ci:** pin actionlint, anchor gitleaks allowlist, clarify baseline header ([7d3444a](https://github.com/LiquidLogicLabs/git-action-release/commit/7d3444a71090908172e109594e26d645031dcafb))
* encode every value interpolated into an API URL path ([d5aded7](https://github.com/LiquidLogicLabs/git-action-release/commit/d5aded79c2691c97000bb47a7585d0c51c0229a1))
* **lint:** quote eslint glob so all of src/ is linted ([eb34ed5](https://github.com/LiquidLogicLabs/git-action-release/commit/eb34ed54db85cca214e487aee98230a12db5377d))
* **lint:** quote lint:fix glob too ([0041b75](https://github.com/LiquidLogicLabs/git-action-release/commit/0041b758e714814aa9d563d843ab2db4a5edc0af))



## [2.0.3](https://github.com/LiquidLogicLabs/git-action-release/compare/v2.0.2...v2.0.3) (2026-07-05)



## [2.0.2](https://github.com/LiquidLogicLabs/git-action-release/compare/v2.0.1...v2.0.2) (2026-04-21)


### Bug Fixes

* correct action runtime to node24 ([fafd31f](https://github.com/LiquidLogicLabs/git-action-release/commit/fafd31f6f7dd69af60443d4018263895edf94aef))
* **e2e:** avoid matrix in job-level if so called workflow parses ([dade384](https://github.com/LiquidLogicLabs/git-action-release/commit/dade384df908f95e23c248a9bf0454b2183e5d16))
* **e2e:** combine duplicate if on Install GitHub CLI step ([1ddf1a0](https://github.com/LiquidLogicLabs/git-action-release/commit/1ddf1a0451fffe3dfb7218fd669c8a2976f3b5a8))
* **release:** continue on floating-tags step failure so release is still created ([cd01ccd](https://github.com/LiquidLogicLabs/git-action-release/commit/cd01ccde3e3309d151fccc7d6a885c6fd8e2a43b))
* **release:** run release job when CI passes even if e2e-tests fails ([bcf28b9](https://github.com/LiquidLogicLabs/git-action-release/commit/bcf28b93882efe9bfabc646cf355fda351535185))
* **release:** skip Gitea e2e when repo is placeholder; allow release when e2e continues-on-error ([3c15817](https://github.com/LiquidLogicLabs/git-action-release/commit/3c158174f2d915edf92dba56138d0abb63b31521))



# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.2] - 2025-01-25

### Changed
- Updated dependencies to latest versions
- Migrated to ESLint 9.x with flat config

## [1.0.0] - 2024-01-01

### Added
- Initial release
- Multi-platform release support (GitHub, Gitea, self-hosted)
