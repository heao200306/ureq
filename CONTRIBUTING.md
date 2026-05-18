# Contributing to genericRequest

Thank you for your interest in contributing to genericRequest!

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/genericRequest.git
   cd genericRequest
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Create a new branch for your changes:
   ```bash
   git checkout -b feat/my-new-feature
   ```

## Development Workflow

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Available Scripts

| Command              | Description                  |
| -------------------- | ---------------------------- |
| `pnpm build`         | Build the project            |
| `pnpm dev`           | Run in development mode      |
| `pnpm test`          | Run unit tests               |
| `pnpm test:watch`    | Run tests in watch mode      |
| `pnpm test:coverage` | Run tests with coverage      |
| `pnpm lint`          | Run ESLint                   |
| `pnpm lint:fix`      | Auto-fix ESLint issues       |
| `pnpm typecheck`     | Run TypeScript type checking |

### Project Structure

```
src/
└── index.ts              # Main entry point
└── components/
    ├── core/           # Core types and utilities
    ├── xhr/            # XMLHttpRequest engine
    ├── fetch/          # Fetch API engine
    └── entry/          # Internal entry with interceptors
```

When contributing, you may need to modify one or more of these components.

## Making Changes

1. Write your code following the existing style
2. Add tests for new functionality
3. Ensure all tests pass: `pnpm test`
4. Run linting: `pnpm lint`
5. Run type checking: `pnpm typecheck`
6. Commit your changes using conventional commits:

   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve bug"
   git commit -m "docs: update documentation"
   git commit -m "refactor: restructure code"
   git commit -m "test: add tests"
   ```

   **Commit types:**
   - `feat` - New feature
   - `fix` - Bug fix
   - `docs` - Documentation changes
   - `style` - Code style changes (formatting, etc.)
   - `refactor` - Code refactoring
   - `test` - Adding or updating tests
   - `chore` - Build process or auxiliary tool changes

## Pull Request Process

1. Update documentation if needed
2. Add tests for any new functionality
3. Ensure CI passes
4. Update the CHANGELOG.md if applicable
5. Request a review from a maintainer

### PR Title Format

Use conventional commit format:

- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- etc.

## Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Run `pnpm lint:fix` before committing
- Write meaningful variable and function names

## Testing

- Write unit tests for all new functionality
- Ensure all existing tests pass
- Aim for adequate test coverage

## Documentation

- Update README.md if needed
- Add JSDoc comments for public APIs
- Include code examples for new features

## Reporting Issues

When reporting issues, please include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Node.js version and package version
- Any relevant error messages or logs

Use the [issue templates](./.github/ISSUE_TEMPLATE/) when creating issues.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
