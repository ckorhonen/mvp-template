# 🚀 MVP Template

> Rapid MVP Development Template with TypeScript, React, and Cloudflare Workers

A production-ready template for building Minimum Viable Products (MVPs) quickly with modern web technologies, comprehensive testing, and automated CI/CD pipelines.

## 📋 Project Description

This template provides a complete development environment for building full-stack web applications with:

- **Frontend**: React 18 with TypeScript, bundled with Vite for lightning-fast development
- **Backend**: Cloudflare Workers for serverless API endpoints with global edge deployment
- **Testing**: Jest and React Testing Library for comprehensive test coverage
- **CI/CD**: GitHub Actions workflows for automated testing and deployment
- **Code Quality**: ESLint, Prettier, and Husky pre-commit hooks ensure consistent code quality

## ✨ Features

- ✅ **TypeScript** - Full type safety with strict mode enabled
- ✅ **React 18** - Latest React features with Vite for instant HMR
- ✅ **Cloudflare Workers** - Serverless backend deployed to 300+ edge locations
- ✅ **ESLint + Prettier** - Automatic code formatting and linting
- ✅ **Jest Testing** - Unit and integration tests with coverage reporting
- ✅ **GitHub Actions** - Automated CI/CD pipeline for testing and deployment
- ✅ **Pre-commit Hooks** - Prevent bad commits with Husky and lint-staged
- ✅ **Path Aliases** - Clean imports with `@/` prefix
- ✅ **Security Scanning** - Automated dependency vulnerability checks

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript 5** - Type-safe JavaScript
- **Vite 5** - Fast build tool and dev server
- **CSS3** - Custom styling (easily swap with Tailwind/Styled Components)

### Backend
- **Cloudflare Workers** - Edge computing platform
- **Wrangler** - CLI for Cloudflare Workers development

### Testing
- **Jest** - Testing framework
- **React Testing Library** - React component testing
- **@testing-library/jest-dom** - Custom Jest matchers

### Code Quality
- **ESLint** - Linting for TypeScript and React
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **lint-staged** - Run linters on staged files

### CI/CD
- **GitHub Actions** - Automated workflows
- **Codecov** - Code coverage reporting
- **Snyk** - Security vulnerability scanning

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** 18.x or 20.x
- **npm** 9.x or higher
- **Git** 2.x or higher
- **Cloudflare Account** (free tier available)

### Installation

1. **Clone or use this template**
   ```bash
   git clone https://github.com/ckorhonen/mvp-template.git my-mvp
   cd my-mvp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Git hooks**
   ```bash
   npm run prepare
   ```

4. **Configure Cloudflare Workers** (optional)
   - Log in to Cloudflare: `npx wrangler login`
   - Update `wrangler.toml` with your account ID
   - Find your account ID in the Cloudflare dashboard

### Development

**Start the development server:**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

**Start the Cloudflare Worker locally:**
```bash
npm run worker:dev
```
Worker will be available at [http://localhost:8787](http://localhost:8787)

**Run tests:**
```bash
npm test                 # Run once
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage
```

**Linting and formatting:**
```bash
npm run lint            # Check for issues
npm run lint:fix        # Fix issues
npm run format          # Format code
npm run format:check    # Check formatting
```

**Type checking:**
```bash
npm run type-check
```

## 📦 Build

**Build for production:**
```bash
npm run build
```

Output will be in the `dist/` directory.

**Preview production build:**
```bash
npm run preview
```

## 🌍 Deployment

### Cloudflare Workers

#### One-time Setup

1. **Create a Cloudflare account** at [dash.cloudflare.com](https://dash.cloudflare.com)

2. **Get your Account ID**
   - Go to Workers & Pages
   - Copy your Account ID
   - Update `wrangler.toml`:
     ```toml
     account_id = "your-account-id-here"
     ```

3. **Get API Token**
   - Go to Profile → API Tokens
   - Create Token → Edit Cloudflare Workers
   - Copy the token

4. **Add secrets to GitHub**
   - Go to your repo → Settings → Secrets and variables → Actions
   - Add `CLOUDFLARE_API_TOKEN`
   - Add `CLOUDFLARE_ACCOUNT_ID`

#### Deploy

**Manual deployment:**
```bash
npm run worker:deploy
```

**Automatic deployment:**
Push to `main` branch - GitHub Actions will automatically deploy

### Other Platforms

#### Vercel
```bash
npm install -g vercel
vercel
```

#### Netlify
```bash
npm install -g netlify-cli
netlify deploy
```

#### GitHub Pages
Update `vite.config.ts` with your base path and run:
```bash
npm run build
```
Then deploy the `dist/` directory.

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Write tests for new features
   - Follow the existing code style
   - Update documentation as needed

4. **Run tests and checks**
   ```bash
   npm run type-check
   npm run lint
   npm run test
   ```

5. **Commit your changes**
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
   Follow [Conventional Commits](https://www.conventionalcommits.org/) format

6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

7. **Open a Pull Request**

### Commit Message Format

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## 📄 License

MIT License

Copyright (c) 2024 Chris Korhonen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 🙏 Acknowledgments

- React Team for the amazing library
- Cloudflare for Workers platform
- Vite for the blazing-fast build tool
- All open source contributors

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/ckorhonen/mvp-template/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ckorhonen/mvp-template/discussions)

---

**Built with ❤️ for rapid MVP development**

**Happy Building! 🚀**
