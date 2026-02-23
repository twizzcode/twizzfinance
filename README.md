# Telewa Monorepo

Backend dan frontend dipisah untuk belajar sekaligus siap scale ke mobile app.

## Struktur

- `backend/` Telegram bot + AI parsing + Prisma
- `backend-go/` API backend versi Go (dashboard + link + auth proxy opsional)
- `frontend/` Next.js + Tailwind + shadcn/ui

## Backend

```bash
cd backend
npm install
npm run db:generate
npm run db:push
npm run dev
```

## Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Buka `http://localhost:3000`.

Login tersedia di `http://localhost:3000/login`, dashboard di `http://localhost:3000/dashboard`.

Auth endpoint berjalan di backend: `http://localhost:4000/api/auth`.
# twizzfinance
