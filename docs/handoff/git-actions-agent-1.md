# Handoff — git actions - agent 1

Canonical handoff for work spanning the **17-repo LiquidLogicLabs/actions set**. It lives here because
the monorepo root is **not a git repository**, so a root-level note is untracked and unshareable (see
"Structural blocker"). Pointer copies exist in the three repos that still hold live state.

Session window: 2026-09-21 → 2026-09-27. Durable findings are in the shared basic-memory KB under
`home-lab`; this note covers only what is **unresolved or in flight**. Do not re-derive the findings —
read the notes.

## Read first

- `CLAUDE.md` in each repo you touch. **`git-action-docker-metadata/CLAUDE.md` especially** — it has its
  own release process and it already documented rules I broke by not reading it.
- Root `CLAUDE.md` for cross-repo conventions, with the caveat that it is untracked (below).
- Shared KB notes, `home-lab` topic: *Gitea Server and API Behaviour*, *GitHub Actions Reserved Variables
  and Matrix Scope*, *Running act Locally and Verification Traps*, *Dependabot Does Not See Gitea-Hosted
  Repos*, *Org-Root Context Is Invisible to CI*.
- Project memory, `verify-the-measurement-not-just-the-result` — the failure mode that cost the most time
  here.

## In flight — needs a decision

- [todo] **`git-action-tag-info` has 42 uncommitted modified files on `main`**: a new
  `include-prereleases` input, +356/−32 across 13 files (11 src, 2 tests, `README.md`, `action.yml`) plus
  a matching `dist/` rebuild. **Not written by this agent** — found in the working tree, mtimes
  2026-09-26 01:28–01:37. Verified green: `tsc --noEmit` clean, lint clean, 157 tests pass, coverage
  34.73/29.37/39.73/34.42 against the ratchet's 32/26/37/32, and `dist/index.js` byte-matches a fresh
  `npm run package` (so it is **not** act `--bind` pollution).
  Pending decision: commit to `main` (house style is linear direct commits) or park on a branch. My
  recommendation was a branch — it is a new **public input** on a published action and authorship/
  completeness are unverified. **It exists only as uncommitted files on one disk; one stray
  `git checkout --` loses 356 lines.**
- [todo] If that work lands, **raise the coverage ratchet** in `git-action-tag-info/jest.config.js` —
  coverage rose above the recorded floor, so the improvement is not currently locked in.

## Blocked

- [blocked] **`npm-package-git-platform-detector`: 11 advisories (1 critical, 6 high, 3 moderate, 1
  low)**, still open as of 2026-09-27. Invisible to GitHub Dependabot because the package was Gitea-hosted
  when found; read the count from the `npm ci` step of its CI log or `npm audit` locally. `npm audit fix`
  cannot clear them — they need a major bump of a transitive parent (the conventional-changelog
  toolchain). Shawn has been told; whether he wants them actioned is his call.
  *Inference, not tested:* "nothing reaches consumers" rests on the published manifest declaring
  `"dependencies": {}`, i.e. all 11 are devDependency-scope. I did **not** inspect an installed
  consumer tree to confirm it.
- [blocked] **Root is not a git repository.** `CLAUDE.md`, `run-local-tests.sh` and `scripts/` at the
  monorepo root are untracked local files. Every correction made to them this session — the act
  limitations, the dist-assert narrowing, the docker-metadata pointer, the canonical-host change, the
  `clone-repos.sh` list move — exists **only on this machine**. A fresh clone or another machine sees the
  stale version of the file that calls itself the source of truth. Shawn deferred this deliberately
  ("will work on the root repo later"). Everything else below assumes it is still unfixed.
- [blocked] **`git-action-ca-certificate-import` and `git-action-install-gitea-tea` have no unit tests**
  (no `test` script), so the orchestrator's unit phase is a silent no-op for them. They now have real E2E
  (added this session) but no unit layer.

## Done — do not redo

- [done] BMAD **6.12.0** across 16 repos (docker-metadata excluded), `_bmad/` tracked, byte-identical
  745-file footprint. Residue from superseded layouts had to be removed by hand; the installer never
  deletes it.
- [done] gitleaks allowlist for BMAD's SHA-256 file manifest, all 16 repos, scope-tested.
- [done] act `--group-add $(stat -c %g /var/run/docker.sock)` added to 14 repos' `test:act:*` scripts, so
  the documented local command can actually pass.
- [done] Coverage ratchet in 13 repos, calibrated from **CI-observed** numbers with e2e excluded.
- [done] E2E added for both composite actions, gating their releases.
- [done] `git-action-release` **v2.0.11** — two Gitea defects: tagging at `GITHUB_SHA` (wrong repo), and
  misreading Gitea's array-shaped `git/refs` response. Gitea E2E is blocking again and passes.
- [done] `git-action-docker-metadata` **v6.2.1** — three critical advisories patched inside existing
  semver ranges; `release.yml` added and gated on the upstream mirror rule via
  `scripts/check-release-version.mjs`; `tag-release.yml` now moves `vX` **and** `vX.Y`; Dependabot
  cooldown added. Repo is at zero zizmor findings.
- [done] `npm-package-git-platform-detector` canonical on **GitHub**; Gitea copy is a verified read-only
  pull mirror; old typo'd repo archived as `zz-npm-package-git-platfom-detector`. 9 releases and 16 assets
  were copied across by hand first — a `git push` does not carry them.
- [done] **Playbook drift is fixed** — re-verified 2026-09-27: 0 of 18 copies carry the stale
  `git diff --exit-code` claim, 17 carry the correction, committed in all 17 repos. A peer note assumed
  this was still outstanding; it is not.

## Conclusions to distrust unless re-tested

Two confident assertions I made this session were checkable and **wrong**; both are recorded in the KB
with the measurement that overturned them. Treat anything below as unverified:

- [todo] I asserted `git.ravenwolf.org` blocks GitHub-runner egress. **False** — 200 from a runner. The
  410 came from github.com's edge.
- [todo] I reported 11 of 16 repos had misaligned floating tags. **False** — stale local refs;
  `git fetch --tags` does not force-update a diverged tag. All 16 were aligned against the remote.
- [todo] I stated docker-metadata's dist-parity check is gated off on this fork. My grep for the gating
  comment returned nothing, so **that specific claim is unverified**; I proved the bundle was current by
  rebuilding and comparing instead. Re-check before relying on it.
- [todo] The `git-action-tag-info` work being "another session's" is **inferred from file mtimes**, not
  confirmed with an author.
- [todo] "13/16 repos pass under act" is one measurement on one machine on one day, not an invariant.

## Relations

- relates_to [[Org-Root Context Is Invisible to CI]]
- relates_to [[Dependabot Does Not See Gitea-Hosted Repos]]
- relates_to [[Running act Locally and Verification Traps]]
