# ReadGenie

A fantasy/Victorian-themed web app for students (ages 11–15) to quiz themselves on books and compete on a leaderboard.

## Features

- Homepage with random reading quotes, book dropdown, and orange Login/Sign-Up buttons
- Email-based sign-up and login with forgot-password help page
- Add book titles (logged-in users)
- 4-question multiple-choice quizzes sourced from Wikipedia (randomized each time)
- Results summary showing right and wrong answers
- Leaderboard with per-book filtering

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |

## Tech Stack

- Next.js 15, TypeScript, Tailwind CSS
- JSON file store (simple, no native dependencies)
- bcrypt + JWT sessions

## Environment

Copy `.env.example` to `.env.local` and set `SESSION_SECRET` for production.
