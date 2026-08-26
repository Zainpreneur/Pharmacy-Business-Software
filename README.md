# PharmaCare — Pharmacy Business Software

A full-stack pharmacy management system: inventory & batch/expiry tracking,
point-of-sale billing, purchasing, suppliers, customers, staff accounts with
roles, and business reports — built as a REST API backend plus a React
frontend.

## Tech Stack

- **Backend:** Node.js, Express, TypeScript, Prisma ORM, SQLite (swappable to
  PostgreSQL/MySQL for production), JWT auth, bcrypt, Zod validation.
- **Frontend:** React 18, TypeScript, Vite, React Router, Tailwind CSS,
  Recharts, Axios.

## Features

- **Auth & roles** — JWT login; `ADMIN`, `PHARMACIST`, `CASHIER` roles with
  route-level permission checks on both API and UI.
- **Medicine catalog** — name, generic name, category, manufacturer, unit,
  strength, reorder level, default prices, prescription-required flag.
- **Batch & expiry tracking** — stock is tracked per batch (batch number,
  quantity, purchase/selling price, expiry date), not just a single quantity
  field.
- **Point of Sale (POS)** — searchable cart-based billing screen. Stock is
  deducted using **FEFO (First-Expiry-First-Out)**: the soonest-to-expire
  batch is sold first, automatically split across batches if needed.
  Generates a printable receipt.
- **Purchases** — record stock-in from a supplier; each line item creates a
  new batch with its own expiry date and pricing.
- **Suppliers & Customers** — directories with contact info and history.
- **Dashboard** — today's/month's revenue, low-stock alerts, items expiring
  within 30 days, recent sales.
- **Reports** — revenue by day (chart), top-selling medicines, inventory
  valuation (cost vs. retail), expiry report.
- **User management** (Admin only) — create staff accounts, change roles,
  enable/disable accounts.

## Project Structure

```
backend/     Express + Prisma REST API (port 4000)
frontend/    React + Vite SPA (port 5173, proxies /api to the backend)
```

## Getting Started

### 1. Backend

```bash
cd backend
cp .env.example .env      # adjust JWT_SECRET etc. for production
npm install
npm run prisma:migrate    # creates SQLite dev.db and applies the schema
npm run seed               # optional: demo users, categories, medicines, stock
npm run dev                 # starts the API on http://localhost:4000
```

Demo accounts created by the seed script (password shown, change in
production):

| Role       | Email                    | Password    |
|------------|--------------------------|-------------|
| Admin      | admin@pharmacy.com       | Admin@123   |
| Pharmacist | pharmacist@pharmacy.com  | Pharma@123  |
| Cashier    | cashier@pharmacy.com     | Cashier@123 |

### 2. Frontend

```bash
cd frontend
npm install
npm run dev   # starts the SPA on http://localhost:5173
```

Open http://localhost:5173 and log in with one of the demo accounts above.
The Vite dev server proxies `/api/*` requests to the backend, so no CORS
configuration is needed in development.

### 3. Production build

```bash
# Backend
cd backend && npm run build && npm start

# Frontend
cd frontend && npm run build   # outputs static assets to frontend/dist
```

Serve `frontend/dist` from any static host (Nginx, Vercel, Netlify, etc.) and
point it at the deployed backend URL. Set `CORS_ORIGIN` on the backend to the
frontend's origin, and set a strong, unique `JWT_SECRET`.

## Switching to PostgreSQL/MySQL

The schema in `backend/prisma/schema.prisma` uses SQLite for zero-config
local development (enums are modeled as `String` for SQLite compatibility).
To use PostgreSQL in production:

1. Change the `datasource` provider to `"postgresql"`.
2. Set `DATABASE_URL` to your Postgres connection string.
3. Run `npx prisma migrate deploy`.

## Data Model Overview

- `User` — staff accounts with a role.
- `Category` — medicine categories.
- `Supplier` / `Customer` — directories.
- `Medicine` — catalog entry; stock is derived from its `Batch` records.
- `Batch` — a specific stock lot with its own quantity, price, and expiry
  date. Sales deduct from batches oldest-expiry-first.
- `Purchase` / `PurchaseItem` — stock-in transactions from suppliers.
- `Sale` / `SaleItem` — POS transactions; each line item references the exact
  batch it was fulfilled from for full traceability.

## License

Provided as-is for internal/business use.
