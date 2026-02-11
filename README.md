# Marketing Analytics SaaS

Multi-tenant marketing analytics platform for tracking ad performance across META, Google Ads, TikTok Ads, and Naver Ads.

## Features

- **Multi-Platform Integration**: Connect META, Google Ads, TikTok Ads, Naver Ads accounts
- **Real-time Dashboard**: KPI cards, trend charts, campaign performance tables
- **Multi-tenancy**: Organization-based access with role-based permissions (Owner/Admin/Member/Viewer)
- **Billing & Subscriptions**: Stripe-powered plans (Free/Starter/Pro/Enterprise) with feature gating
- **Auto-sync**: Automated campaign and insights synchronization via cron jobs

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5 (strict mode)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js v5 (JWT, Credentials + Google OAuth)
- **Payments**: Stripe (Checkout, Customer Portal, Webhooks)
- **Charts**: Recharts
- **Styling**: TailwindCSS + shadcn/ui
- **Testing**: Vitest (unit/integration, 1057+ tests), Playwright (E2E)
- **Monitoring**: Sentry, Pino (structured logging)
- **Deployment**: Vercel

## Architecture

Clean Architecture with 4 layers:
- **Domain**: Entities, repository interfaces, use cases (zero external dependencies)
- **Application**: Services, DTOs
- **Infrastructure**: Prisma repositories, platform API clients, encryption, caching
- **Presentation**: Next.js pages, React components, hooks

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+

### Installation
```bash
git clone <repository-url>
cd marketing-analytics
npm install
```

### Environment Variables
Copy `.env.example` to `.env` and fill in:
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
# Optional: Platform API keys, Stripe keys, Sentry DSN
```

### Database Setup
```bash
npx prisma generate
npx prisma db push
```

### Development
```bash
npm run dev
```

### Testing
```bash
npm run test:run          # Unit/integration tests (1057+)
npm run test:e2e          # E2E tests (Playwright)
npm run test:coverage     # Coverage report
```

### Build
```bash
npm run build
```

## Project Structure
```
src/
├── domain/           # Core business logic
│   ├── entities/     # Domain entities (9)
│   ├── errors/       # Domain error classes (7)
│   ├── repositories/ # Repository interfaces
│   ├── services/     # Domain service interfaces
│   └── usecases/     # Use cases (21)
├── infrastructure/   # External implementations
│   ├── database/     # Prisma client
│   ├── repositories/ # Prisma repository implementations
│   ├── external/     # Platform API clients (meta, google, tiktok, naver)
│   ├── auth/         # NextAuth, password hashing
│   ├── encryption/   # AES-256-GCM token encryption
│   ├── cache/        # In-memory cache service
│   └── logging/      # Pino logger
├── application/      # Application services (10)
├── lib/              # Utilities (auth, error handling, logging, env)
├── hooks/            # React hooks
├── components/       # React components
└── app/              # Next.js App Router (pages + API routes)
```

## API Documentation
See [docs/api.md](docs/api.md) for complete API reference.

## License
Private
