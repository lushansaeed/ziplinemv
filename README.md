# Zipline Maldives

Modern booking-focused website for Zipline Maldives, positioned around “The World’s Most Beautiful Zipline”.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma with PostgreSQL
- Role-ready architecture for admins, booking staff, agents, affiliates, and customers

## What is included

- Premium mobile-first landing page with hero, highlights, media gallery, testimonials, FAQ, contact, and WhatsApp CTA
- Interactive booking flow with rider mix, tourist/local pricing, add-ons, coupon discount, booking summary, and reference generation
- Agent portal pages for registration, login, dashboard, bookings, rates, and commissions
- Affiliate portal pages for registration, login, code sharing, conversion stats, and commission reporting
- Admin dashboard pages for bookings, pricing, media, commissions, and reports
- Admin theme settings with presets, custom color controls, live preview, and site-wide CSS variable tokens
- Prisma schema covering users, customers, bookings, riders, add-ons, agents, affiliates, commissions, payments, time slots, pricing rules, media, content, audit logs, and settings

## Local setup

```bash
pnpm install
cp .env.example .env
pnpm prisma:generate
pnpm dev
```

Open `http://localhost:3000`.

If pnpm asks to approve dependency build scripts, approve Prisma, Prisma engines, sharp, and unrs-resolver. In restricted automation environments, `pnpm install --ignore-scripts` is enough to build the current frontend, then run `pnpm prisma:generate` when database work begins.

## Environment

```bash
DATABASE_URL="postgresql://prisma.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://prisma.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-for-admin-approval-actions"
```

For Vercel, set `DATABASE_URL` to the Supabase Supavisor transaction pooler string for serverless runtime access. Set `DIRECT_URL` to the session pooler or direct connection string for Prisma migrations.
Set `SUPABASE_SERVICE_ROLE_KEY` only in server environments. It is required for admin approval actions that sync approved portal roles into Supabase Auth `app_metadata`.

## Production notes

- Connect `DATABASE_URL` to a managed PostgreSQL database before running migrations.
- Add authenticated server actions/API routes for bookings, media uploads, pricing updates, and commission changes.
- Store uploaded media in secure object storage and write rows to `MediaFile`.
- Add email and WhatsApp provider integration for confirmations.
- Protect portal routes with auth middleware and role-based access checks.
- Log commission edits, booking status changes, pricing changes, and media deletes to `AuditLog`.
