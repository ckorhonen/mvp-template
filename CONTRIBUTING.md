# Contributing to MVP Template

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How Can I Contribute?

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/ckorhonen/mvp-template/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (OS, Node version, etc.)

### Suggesting Enhancements

1. Check if the enhancement has been suggested
2. Create an issue describing:
   - The problem you're trying to solve
   - Your proposed solution
   - Any alternatives you've considered
   - Potential drawbacks or challenges

### Pull Requests

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Write or update tests
5. Ensure all tests pass: `npm test`
6. Run linting: `npm run lint:fix`
7. Run type checking: `npm run type-check`
8. Commit with a descriptive message following [Conventional Commits](https://www.conventionalcommits.org/)
9. Push to your fork
10. Open a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/mvp-template.git
cd mvp-template

# Install dependencies
npm install

# Set up git hooks
npm run prepare

# Start development server
npm run dev
```

## Coding Standards

### TypeScript
- Use TypeScript strict mode
- Avoid `any` types when possible
- Provide type definitions for all functions
- Use interfaces for object shapes

### React
- Use functional components with hooks
- Extract reusable logic into custom hooks
- Keep components small and focused
- Use meaningful component and variable names

### Testing
- Write tests for new features
- Maintain or improve code coverage
- Use descriptive test names
- Follow the Arrange-Act-Assert pattern

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only changes
- `style:` - Code style changes (formatting, missing semi-colons, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks
- `ci:` - CI/CD changes

Examples:
```
feat: add user authentication
fix: resolve memory leak in worker
docs: update deployment instructions
```

## Project Structure

```
mvp-template/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── worker/         # Cloudflare Worker code
│   ├── App.tsx         # Main App component
│   │   ├── App.test.tsx    # App tests
│   └── main.tsx        # Entry point
├── .github/
│   └── workflows/      # GitHub Actions
├── public/             # Static assets
└── dist/               # Build output
```

## Questions?

Feel free to:
- Open an issue for questions
- Start a discussion in [GitHub Discussions](https://github.com/ckorhonen/mvp-template/discussions)

Thank you for contributing! 🚀
