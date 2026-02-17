# Telewa Frontend

Dashboard web berbasis Next.js + Tailwind + shadcn/ui. Dirancang sebagai frontend terpisah dari backend Telegram agar mudah berkembang ke mobile app.

## Menjalankan

1. Copy `.env.example` ke `.env.local` dan isi env:
   - `NEXT_PUBLIC_API_BASE_URL` untuk koneksi ke backend
   - `AUTH_BACKEND_ORIGIN` untuk upstream auth backend (dipakai rewrite `/api/auth`)
2. Google OAuth redirect URL (di Google Console):
   - `http://localhost:3000/api/auth/callback/google`

## Connect Telegram

Di dashboard, klik "Generate Link" lalu buka bot dari link yang diberikan.

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Mobile (Capacitor)

Frontend ini sudah disiapkan untuk dibungkus sebagai mobile app via Capacitor (wrapper ke URL web app).

1. Install package Capacitor:
   - `npm i -D @capacitor/cli`
   - `npm i @capacitor/core @capacitor/android @capacitor/ios`
2. Pastikan URL pada `capacitor.config.json` cocok:
   - Android emulator lokal: `http://10.0.2.2:3000`
   - Device fisik: ganti ke IP lokal laptop kamu
   - Produksi: ganti ke domain HTTPS frontend kamu
3. Jalankan:
   - `npm run mobile:sync`
   - `npm run mobile:android` atau `npm run mobile:ios`
