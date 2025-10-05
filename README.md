# Next.js 15 Application with Full Testing & CI/CD

A production-ready Next.js 15 application with TypeScript, Tailwind CSS 4, shadcn/ui components, comprehensive testing (100% coverage), and automated CI/CD pipeline.

[![CI/CD Pipeline](https://github.com/zerdos/spike-land-nextjs/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/zerdos/spike-land-nextjs/actions/workflows/ci-cd.yml)

## ✨ Features

- ⚡ **Next.js 15** - App Router with React Server Components
- 🔷 **TypeScript** - Strict mode enabled
- 🎨 **Tailwind CSS 4** - Modern styling with CSS variables
- 🧩 **shadcn/ui** - Beautiful, accessible UI components
- ✅ **100% Test Coverage** - Vitest + React Testing Library
- 🎭 **E2E Testing** - Playwright + Cucumber (BDD)
- 🚀 **Automated CI/CD** - GitHub Actions + Vercel
- 🔒 **Branch Protection** - Enforced code quality standards
- 📊 **Code Coverage** - Codecov integration

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/zerdos/spike-land-nextjs.git
cd spike-land-nextjs

# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install chromium

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📋 Available Scripts

### Development

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

### Testing

```bash
# Unit Tests (Vitest + React Testing Library)
npm test             # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:ui      # Run tests with UI
npm run test:coverage # Run with coverage (100% required)

# E2E Tests (Playwright + Cucumber)
npm run test:e2e:local # Run E2E against localhost (dev server must be running)
npm run test:e2e       # Run E2E against any URL (set BASE_URL env var)
npm run test:e2e:ci    # Run E2E in CI (uses deployed URL)
```

## 🏗️ Project Structure

```
spike-land-nextjs/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── layout.test.tsx     # Layout tests
│   │   ├── page.tsx            # Home page
│   │   ├── page.test.tsx       # Page tests
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   └── ui/                 # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── button.test.tsx
│   │       ├── card.tsx
│   │       └── card.test.tsx
│   └── lib/
│       ├── utils.ts            # Utility functions
│       └── utils.test.ts       # Utils tests
├── e2e/
│   ├── features/               # Cucumber feature files (BDD)
│   ├── step-definitions/       # Playwright step implementations
│   ├── support/                # Test helpers
│   └── reports/                # Generated reports
├── .github/
│   └── workflows/
│       └── ci-cd.yml          # CI/CD pipeline
├── vitest.config.ts           # Vitest configuration
├── cucumber.js                # Cucumber configuration
└── tsconfig.json              # TypeScript config
```

## 🧪 Testing

### Unit Testing

- **Framework**: Vitest + React Testing Library
- **Coverage**: 100% required (statements, branches, functions, lines)
- **Location**: `.test.ts` and `.test.tsx` files alongside source files

Example:
```bash
npm run test:coverage
```

Coverage report is available at `coverage/index.html`

### E2E Testing

- **Framework**: Playwright + Cucumber (BDD)
- **Approach**: Behavior-Driven Development with Gherkin syntax
- **Features**: See `e2e/features/*.feature`

Example feature:
```gherkin
Feature: Home Page
  Scenario: View home page
    Given I am on the home page
    Then I should see the page title "Welcome to Your App"
```

Run locally:
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run E2E tests
npm run test:e2e:local
```

## 🔄 CI/CD Pipeline

The project uses GitHub Actions for automated testing and deployment:

### Pipeline Stages

1. **Test** → 2. **Build** → 3. **Deploy Preview** → 4. **E2E**

#### 1. Test Job (Runs on all PRs and pushes)
- ✅ Linting
- ✅ Unit tests with 100% coverage
- ✅ Upload coverage to Codecov

#### 2. Build Job (Only if tests pass)
- ✅ Next.js build
- ✅ Upload build artifacts

#### 3. Deploy Job (Runs on all branches after build)
- ✅ Deploy to Vercel Preview
- ✅ Output preview deployment URL

#### 4. E2E Job (Runs on all branches after deployment)
- ✅ Run Playwright/Cucumber tests against preview deployment
- ✅ Upload test reports and screenshots

**Note:** Production deployments are done manually from the `main` branch when needed.

### Required Secrets

Configure these in GitHub Settings → Secrets and variables → Actions:

- `VERCEL_TOKEN` - **Required** - Get from https://vercel.com/account/tokens
- `CODECOV_TOKEN` - **Optional** - Get from https://codecov.io

See `.github/workflows/README.md` for detailed setup instructions.

## 🔒 Branch Protection Rules

### ⚠️ IMPORTANT: Configure Branch Protection

To enforce code quality, you **must** set up branch protection for `main`:

1. Go to: [Repository Settings → Branches](https://github.com/zerdos/spike-land-nextjs/settings/branches)
2. Click **Add branch protection rule**
3. Configure:
   - Branch name pattern: `main`
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
     - Required checks: `Run Tests`, `Build Application`, `E2E Tests`
   - ✅ Do not allow bypassing the above settings

**📖 See `.github/BRANCH_PROTECTION_SETUP.md` for detailed instructions.**

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and write tests (100% coverage required)
# ... edit files ...

# 3. Run tests locally
npm run test:coverage  # Must pass with 100% coverage
npm run build          # Must build successfully

# 4. Commit and push
git add .
git commit -m "Add new feature"
git push origin feature/my-feature

# 5. Create Pull Request on GitHub
# - Tests run automatically
# - Preview deployment created
# - E2E tests run against preview
# - Must pass before merge is allowed

# 6. Merge when all checks pass ✅
# - Deploy to production manually when ready
```

### Rules

- ❌ **No direct commits to main** - All changes via Pull Requests
- ✅ **All tests must pass** - 100% coverage required
- ✅ **Build must succeed** - No broken builds
- ✅ **Preview deployment required** - Every PR gets tested preview
- ✅ **E2E tests required** - Must pass against preview before merge
- ✅ **CI checks required** - Cannot merge with failing tests

## 🛠️ Tech Stack

### Core
- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/) (strict mode)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (New York variant)
- **Fonts**: [Geist](https://vercel.com/font) Sans & Mono

### Testing
- **Unit**: [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/react)
- **E2E**: [Playwright](https://playwright.dev/) + [Cucumber](https://cucumber.io/)
- **Coverage**: [Codecov](https://codecov.io/)

### DevOps
- **CI/CD**: [GitHub Actions](https://github.com/features/actions)
- **Deployment**: [Vercel](https://vercel.com/)
- **Quality**: ESLint, TypeScript strict mode

## 📚 Documentation

- **`.github/BRANCH_PROTECTION_SETUP.md`** - Branch protection setup guide
- **`.github/workflows/README.md`** - CI/CD workflow documentation
- **`e2e/README.md`** - E2E testing guide
- **`CLAUDE.md`** - Development guidelines for Claude Code

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write code and tests (100% coverage required)
4. Ensure all tests pass (`npm run test:coverage`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request
8. Wait for CI checks to pass ✅
9. Merge after review

## 📝 License

This project is bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🔗 Links

- **Repository**: https://github.com/zerdos/spike-land-nextjs
- **Actions**: https://github.com/zerdos/spike-land-nextjs/actions
- **Issues**: https://github.com/zerdos/spike-land-nextjs/issues

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - Styling guide
- [shadcn/ui Documentation](https://ui.shadcn.com/) - Component library
- [Vitest Documentation](https://vitest.dev/) - Unit testing
- [Playwright Documentation](https://playwright.dev/) - E2E testing
- [Cucumber Documentation](https://cucumber.io/docs/cucumber/) - BDD framework

---

**Built with ❤️ using Next.js 15, TypeScript, and modern web technologies.**
