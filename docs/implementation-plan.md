# Zipline Maldives Implementation Plan

## Database Schema

The Prisma schema models the requested production surface:

- `User`, `Customer`, `Agent`, `Affiliate`, and role enums for super admin, admin, booking staff, agent, affiliate, and customer access.
- `Booking`, `BookingRider`, `BookingAddon`, `Payment`, and status enums for booking, payment, and commission lifecycle tracking.
- `AgentRate`, `AffiliateCode`, and `Commission` for partner pricing, links, referrals, payable amounts, and manual approval.
- `TimeSlot` and `PricingRule` for capacity control, seasonal pricing, offers, group rates, and agent rates.
- `MediaFile`, `WebsiteContent`, `Setting`, and `AuditLog` for homepage media, editable content, configurable rules, and sensitive-change history.

## User Flow

1. Visitor lands on the booking-focused homepage, reviews highlights, gallery media, testimonials, FAQ, and WhatsApp contact.
2. Visitor opens `/book`, enters customer details, chooses tourist/local pricing, date, time slot, riders, add-ons, payment method, and optional affiliate/coupon code.
3. The booking flow calculates the total, validates safety terms, prevents slot overbooking, stores the booking, creates riders/add-ons/payment records, and returns a reference number with WhatsApp confirmation.
4. Admin users manage bookings, pricing, media, commissions, theme settings, and reports from `/admin`.
5. Agents register or log in, create bookings for customers, view rate cards, and track commission.
6. Affiliates register or log in, share referral codes/links, view conversion statistics, and track commission eligibility.

## Page Structure

- Public: `/`, `/book`, `/tour`, `/gallery`, `/faq`, `/contact`
- Auth: `/login`
- Agents: `/agents`, `/agents/register`, `/agents/dashboard`
- Affiliates: `/affiliates`, `/affiliates/register`, `/affiliates/dashboard`
- Admin: `/admin`, `/admin/bookings`, `/admin/pricing`, `/admin/media`, `/admin/commissions`, `/admin/reports`, `/admin/theme`

## Build Steps

1. Keep the mobile-first landing page and public content complete and conversion-focused.
2. Persist customer bookings through a validated server action backed by Prisma.
3. Replace remaining admin mock tables with database-backed views and mutations.
4. Add authenticated media upload routes backed by Supabase Storage or equivalent object storage.
5. Wire pricing, commission, and time-slot admin forms to server actions with audit log entries.
6. Add email and WhatsApp provider integrations for confirmation and status updates.
7. Add CSV/Excel exports for booking, revenue, add-on, nationality, agent, affiliate, commission, and payment reports.
8. Add end-to-end tests for booking, admin status changes, agent booking creation, affiliate attribution, and media publishing.
