# Versioning & Dependency Management

## Overview

This project follows [Semantic Versioning (Semver)](https://semver.org/) for application releases and a structured policy for dependency updates.

---

## Application Versioning

Format: `MAJOR.MINOR.PATCH`

| Bump | When | Example |
|------|------|---------|
| **MAJOR** | Breaking API changes | `1.x.x` → `2.0.0` |
| **MINOR** | New backward-compatible features | `x.1.x` → `x.2.0` |
| **PATCH** | Bug fixes, security patches | `x.x.1` → `x.x.2` |

### Release Commands

```bash
# Bug fix release
npm run version:patch   # 1.0.0 → 1.0.1

# Feature release
npm run version:minor   # 1.0.0 → 1.1.0

# Breaking change release
npm run version:major   # 1.0.0 → 2.0.0
```

Each command automatically:
1. Runs the full CI pipeline (`preversion`)
2. Bumps `package.json` version
3. Creates a Git commit
4. Creates a Git tag (e.g., `v1.0.1`)
5. Pushes commit and tag to remote (`postversion`)

---

## Industry Semver Practices

### 1. Pre-release Versions

Use pre-release tags for non-production ready versions:

```
1.0.0-alpha.1    # Early testing
1.0.0-beta.2     # Feature-complete, testing phase
1.0.0-rc.1       # Release candidate
```

```bash
npm version prerelease --preid=alpha   # 1.0.0 → 1.0.1-alpha.0
npm version prerelease --preid=beta    # 1.0.1-alpha.0 → 1.0.1-beta.0
npm version prerelease --preid=rc      # 1.0.1-beta.0 → 1.0.1-rc.0
```

### 2. Initial Development (0.y.z)

Before `1.0.0`, the API is considered unstable:
- `0.1.0` → `0.2.0` may include breaking changes
- `1.0.0` signals API stability and production readiness

### 3. Git Tagging Convention

- Always prefix tags with `v`: `v1.0.0`, `v1.2.3`
- Never move tags once pushed
- Tags are immutable release markers

### 4. Changelog Maintenance

Maintain a `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/):

```markdown
## [1.1.0] - 2026-06-11
### Added
- New user authentication endpoint

### Fixed
- Redis connection timeout issue

## [1.0.0] - 2026-06-01
- Initial stable release
```

Update the changelog **before** running `npm version`.

### 5. Deprecation Policy

Before a MAJOR bump:
1. Mark old features as `@deprecated` in code
2. Maintain backward compatibility for at least one MINOR cycle
3. Document migration path in release notes
4. Only remove in next MAJOR version

### 6. Version Constraints (Dependencies)

| Symbol | Meaning | Use Case |
|--------|---------|----------|
| `1.2.3` | Exact version | Production apps (current approach) |
| `~1.2.3` | Patch updates only | `>=1.2.3, <1.3.0` |
| `^1.2.3` | Minor updates allowed | `>=1.2.3, <2.0.0` |
| `>=1.2.3` | Minimum version | Flexible dependencies |

This project uses **exact versions** for reproducible builds, with updates managed through scripts.

### 7. Hotfix Workflow

For urgent production fixes:

```bash
# 1. Create hotfix branch from latest tag
git checkout -b hotfix/v1.0.1 v1.0.0

# 2. Apply fix and commit

# 3. Version bump (runs CI automatically)
npm run version:patch

# 4. Merge back to main
git checkout main
git merge hotfix/v1.0.1
```

### 8. Release Checklist

Before every release:

- [ ] All tests passing
- [ ] Linting clean
- [ ] `CHANGELOG.md` updated
- [ ] Version bumped with `npm run version:*`
- [ ] Git tag created and pushed
- [ ] Deploy to staging first
- [ ] Verify in staging
- [ ] Deploy to production

---

## Dependency Update Policy

### Production Safety Rules

- **PATCH** → Auto-update (bug/security fixes only)
- **MINOR** → Review before applying (new features, check changelog)
- **MAJOR** → Test in a branch before applying (breaking changes possible)

### Available Commands

```bash
# Check all updates
npm run deps:check

# Auto-update patch versions
npm run deps:update:patch

# Review minor updates
npm run deps:check:minor
npm run deps:update:minor

# Review major updates (test before applying)
npm run deps:check:major
npm run deps:update:major

# Interactive selection
npm run deps:update:interactive
```

### Lock File

- `package-lock.json` is enforced via `.npmrc`
- Production deployments must use `npm ci` for reproducible installs
- Manual installs default to exact versions (`save-exact=true`)

---

## Current Version

**`1.0.0`**

---

## Quick Reference

```bash
# Daily workflow
npm run deps:update:patch      # Pull bug fixes
npm run version:patch          # Tag a patch release

# Planned feature
npm run deps:check:minor       # Review what's new
npm run deps:update:minor      # Apply after review
npm run version:minor          # Tag a minor release

# Major upgrade (rare)
npm run deps:check:major       # Identify breaking changes
# Create branch, test, then:
npm run deps:update:major
npm run version:major          # Tag a major release

# Pre-release
npm version prerelease --preid=beta
```
