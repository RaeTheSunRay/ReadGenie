# ReadGenie

A fantasy/Victorian-themed web app for students (ages 11–15) to quiz themselves on books and compete on a leaderboard.

## Features

- Homepage with random reading quotes, book dropdown, and orange Login/Sign-Up buttons
- Email-based sign-up and login with forgot-password help page
- Add book titles (logged-in users)
- 10-question multiple-choice quizzes about characters, plot, events, and timeline
- Results summary showing right and wrong answers
- Leaderboard with per-book filtering

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Neon Postgres database (Vercel-friendly)

1. Sign up at [https://neon.tech](https://neon.tech) (free)
2. Create a project and copy the connection string
3. Copy env example and fill in values:

```bash
cp .env.example .env.local
```

Set:

```bash
SESSION_SECRET=any-long-random-string
DATABASE_URL=postgresql://...your-neon-url...
```

### 3. Create tables

```bash
npm run db:push
```

Starter books are seeded automatically on first use.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Import the GitHub repo in Vercel
2. Add environment variables:
   - `DATABASE_URL` (Neon connection string)
   - `SESSION_SECRET` (long random string)
3. Run `npm run db:push` once against that database (from your computer), or use Neon’s SQL editor with the schema from `lib/db/schema.ts`
4. Deploy

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |
| `npm run db:push` | Push Drizzle schema to Neon |
| `npm run db:studio` | Open Drizzle Studio |

## Tech Stack

- Next.js 15, TypeScript, Tailwind CSS
- Neon Postgres + Drizzle ORM
- bcrypt + JWT sessions
