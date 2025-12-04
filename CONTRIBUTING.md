# Contributing to ilamy Calendar

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/ilamy-calendar.git
   cd ilamy-calendar
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Run development server**

   ```bash
   bun dev
   ```

4. **Run tests**
   ```bash
   bun test
   ```

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for all commits. This enables automated changelog generation and semantic versioning.

### Commit Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

- `feat:` - New features (triggers minor version bump)
- `fix:` - Bug fixes (triggers patch version bump)
- `perf:` - Performance improvements
- `refactor:` - Code refactoring without behavior change
- `docs:` - Documentation changes
- `test:` - Adding or updating tests
- `build:` - Build system or dependency changes
- `ci:` - CI/CD configuration changes
- `chore:` - Other changes that don't modify src or test files
- `style:` - Code style/formatting changes
- `revert:` - Reverting previous commits

### Examples

```bash
# Feature
git commit -m "feat: add timezone support for recurring events"

# Bug fix
git commit -m "fix: resolve day-before bug in western timezones"

# Breaking change
git commit -m "feat!: refactor event callback signatures

BREAKING CHANGE: onCellClick now receives CellClickInfo object instead of separate start/end parameters"
```

## Pull Request Process

1. **Create a feature branch**

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes**
   - Write tests for new functionality
   - Update documentation as needed
   - Follow existing code style
   - Run `bun run ci` to ensure all checks pass

3. **Commit your changes** using conventional commits

4. **Push to your fork**

   ```bash
   git push origin feat/your-feature-name
   ```

5. **Create a Pull Request**
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what changes were made and why
   - Include screenshots for UI changes

## Testing

All new features and bug fixes must include tests.

```bash
# Run all tests
bun test

# Run tests with coverage
bun run test:coverage

# Run tests in watch mode
bun test --watch
```

## Code Style

- We use Prettier for formatting - run `bun run prettier:fix`
- We use Oxlint for linting - run `bun run lint:fix`
- Follow TypeScript best practices
- Write readable, human-friendly code (see `.github/copilot-instructions.md`)

## Pre-commit Checks

The project uses Husky for pre-commit hooks. These automatically run:

- Linting
- Formatting
- Type checking

## Documentation

- Update README.md for user-facing changes
- Update inline code documentation for API changes
- Add examples in the `examples/` directory if applicable

## Questions?

Feel free to open an issue for:

- Questions about contributing
- Clarification on requirements
- Discussion of new features

Thank you for contributing! 🎉
