# Telewa Backend

Telegram-first money tracking bot with AI parsing. This folder contains the backend services (Telegram bot, AI parsing, Prisma).

## Setup

1. Copy `.env.example` to `.env` and fill in the values.
2. Install dependencies: `npm install`
3. Generate Prisma client: `npm run db:generate`
4. Push schema to database: `npm run db:push`
5. Run the bot: `npm run dev`

## Local API

Backend juga menjalankan API lokal untuk dashboard frontend:

- `GET /health`
- `GET /dashboard`
- `GET /dashboard?userId=...`

Atur port dengan `API_PORT` (default 4000).

## Auth (Better Auth)

Auth Google berjalan di backend:

- Base URL: `http://localhost:4000/api/auth`
- Redirect URL Google: `http://localhost:4000/api/auth/callback/google`

## Telegram Link Flow

Endpoint untuk membuat link Telegram:

- `POST /link/telegram` (butuh cookie auth)

User klik link di dashboard, lalu bot akan menerima `/start link_<token>`.
