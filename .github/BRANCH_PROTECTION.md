# Branch Protection Rules Configuration

This document outlines the recommended branch protection rules for this repository to ensure code quality and prevent issues from being merged into the main branch.

## Recommended Settings for Main Branch

### General Settings

- **Restrict pushes that create files**: ✅ Enabled
- **Require status checks to pass before merging**: ✅ Enabled
  - **Require branches to be up to date before merging**: ✅ Enabled
  - **Status checks that are required**:
    - `Lint, Format & Test` (from CI workflow)

### Additional Recommended Settings

- **Require pull request reviews before merging**: ✅ Enabled
  - **Required number of reviewers**: `1`
  - **Dismiss stale reviews when new commits are pushed**: ✅ Enabled
- **Require conversation resolution before merging**: ✅ Enabled
- **Include administrators**: ✅ Enabled
- **Allow force pushes**: ❌ Disabled
- **Allow deletions**: ❌ Disabled

## How to Configure

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Click on **Branches** in the left sidebar
4. Click **Add rule** or edit existing rule for `main` branch
5. Configure the settings as described above

## Status Check: "Lint, Format & Test"

The CI workflow will run the following checks:

- ✅ **Linting**: Using oxlint to catch code quality issues
- ✅ **Formatting**: Using Prettier to ensure consistent code style
- ✅ **Testing**: Running all test suites with Bun
- ✅ **Build**: Ensuring the project builds successfully

All checks must pass before a PR can be merged.

## Development Commands

### Before committing:

```bash
bun run pre-commit  # Auto-fix linting and formatting issues
```

### Before creating a PR:

```bash
bun run ci          # Run full CI pipeline locally
```

### Individual commands:

```bash
bun run lint        # Check for linting issues
bun run lint:fix    # Auto-fix linting issues
bun run prettier:check  # Check code formatting
bun run prettier:fix    # Auto-fix formatting
bun run test        # Run tests
bun run build       # Build the project
```
