# Amorino Cafe & Restaurant — Luxury Digital Ordering Platform (Kenya)

A luxury QR-based table ordering, staff floor console, kitchen display system (KDS), and executive admin CMS built for **Amorino Cafe & Restaurant, Kenya**.

## Key Routes

- **`/order?table=T12` (or `/`)** — Customer QR Ordering Experience (5s Cinematic Intro, Trilingual English/Somali/Swahili Catalogue, Dish Customizations, Multi-Order Table Session Tracking).
- **`/staff`** — Staff Floor Console (Realtime Incoming Order Acceptance/Rejection & Table Service Progression).
- **`/kitchen`** — Kitchen Display System (High-Contrast Tablet/TV Production Board with Live Preparation Timers).
- **`/admin`** — Executive Admin Suite (Overview KPIs, Full Menu & Translation CMS, Printable Table QR Cards, Analytics, Closed Mode & RBAC Staff Accounts).

## Tech Stack

- **Framework**: Next.js 14.2.35 (App Router) + TypeScript
- **Styling**: Tailwind CSS (Bespoke Obsidian, Espresso & Burnished Gold Palette derived from the official Amorino Logo)
- **Database**: SQLite (`better-sqlite3`) with automatic Vercel serverless `/tmp` storage compatibility and initial seeding
- **Realtime**: Server-Sent Events (`/api/events`) with automatic fallback polling

## Development & Deployment

```bash
npm install
npm run dev
```

For **Vercel Deployment**, import `dyvx/amorino-cafe-restaurant` directly into Vercel — zero additional configuration required.
