# Contributing to E-JobFinder

Thank you for your interest in contributing to E-JobFinder! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Please be respectful and professional in all interactions. We aim to maintain a welcoming and inclusive community.

## How to Contribute

### Reporting Bugs

1. **Check existing issues** - Ensure the bug hasn't already been reported
2. **Create a detailed issue** including:
   - Clear, descriptive title
   - Step-by-step reproduction instructions
   - Expected vs. actual behavior
   - Screenshots/videos if applicable
   - Your environment (OS, Node version, etc.)

### Suggesting Features

1. **Discuss first** - Open an issue to discuss your idea
2. **Provide context** - Explain the use case and benefits
3. **Be specific** - Provide concrete examples

### Submitting Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/E-jobfinder.git
   cd E-jobfinder
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Install dependencies and make changes**
   ```bash
   npm install
   npm run dev
   ```

4. **Follow coding standards** (see below)

5. **Commit with clear messages**
   ```bash
   git commit -m "feat: add feature description"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request** with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots for UI changes
   - Testing instructions

## Coding Standards

### TypeScript
- Enable strict mode
- Use proper type annotations
- Avoid `any` types when possible
- Export types from appropriate modules

### React Components
- Use functional components with hooks
- Keep components focused and reusable
- Use Radix UI for accessible UI elements
- Add PropTypes or TypeScript interfaces

### Styling
- Use Tailwind CSS utilities
- Follow the project's color scheme
- Ensure responsive design (mobile-first)
- Test dark mode compatibility

### Forms
- Use React Hook Form
- Validate with Zod schemas
- Provide clear error messages
- Handle loading and success states

### File Organization
```
src/
├── components/          # Reusable components
│   ├── ui/             # Radix UI wrappers
│   └── features/       # Feature-specific components
├── lib/                # Utility functions
├── hooks/              # Custom React hooks
├── types/              # TypeScript types
└── app/                # Next.js app router
```

## Development Workflow

### Running Tests
```bash
npm run lint
```

### Building Locally
```bash
npm run build
```

### Checking Your Changes
1. Run the dev server: `npm run dev`
2. Test all affected features
3. Check responsive design
4. Verify dark mode (if applicable)
5. Run linting: `npm run lint`

## Commit Message Guidelines

Use conventional commits:

```
feat: add new feature
fix: fix bug
docs: update documentation
style: formatting changes
refactor: refactor code
perf: performance improvements
test: add tests
chore: maintenance tasks
```

Example:
```
feat: add job recommendation filtering

- Implement AI-based recommendation filtering
- Add UI controls for filter preferences
- Update database schema for filter preferences
- Fixes #123
```

## Pull Request Process

1. Ensure your branch is up to date with main
2. All tests pass and no linting errors
3. Update relevant documentation
4. Add/update tests for new features
5. Request review from maintainers
6. Address feedback promptly

## Setting Up Your Development Environment

### Requirements
- Node.js 18+
- npm or yarn
- Git
- Code editor (VS Code recommended)

### VS Code Extensions (Recommended)
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin

### Environment Setup
1. Copy `.env.example` to `.env.local`
2. Fill in required credentials
3. Run `npm install`
4. Run `npm run dev`

## Testing Guidelines

### Before Submitting
- Test your changes locally
- Verify no console errors/warnings
- Test on different screen sizes
- Test dark/light theme switching
- Check performance impact

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for functions
- Document complex logic
- Update API documentation if applicable
- Include before/after screenshots for UI changes

## Common Tasks

### Adding a New Component
1. Create file in `src/components/`
2. Use Radix UI for base components
3. Style with Tailwind CSS
4. Export from `src/components/index.ts`
5. Add TypeScript interfaces for props

### Adding a New Page
1. Create route in `src/app/[route]/page.tsx`
2. Add to navigation if applicable
3. Update metadata for SEO
4. Test routing and linking

### Updating Styles
- Modify `tailwind.config.ts` for global changes
- Use utility classes in components
- Keep component-specific styles in components
- Test across different themes

## Getting Help

- Check existing issues/discussions
- Review documentation
- Ask in Pull Request comments
- Open a discussion for design questions

## Recognition

Contributors are acknowledged in:
- Git commit history
- Project README
- Release notes

Thank you for contributing to E-JobFinder! 🎉
