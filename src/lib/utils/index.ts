import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

// ─── shadcn/ui cn helper ─────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Booking reference generator ─────────────────────────────────────────────
export function generateBookingRef(): string {
  const prefix = process.env.BOOKING_REF_PREFIX ?? "ZL";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ─── Currency formatter ───────────────────────────────────────────────────────
export function formatCurrency(
  amount: number | string,
  currency = "USD",
  locale = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

// ─── Date formatters ──────────────────────────────────────────────────────────
export function formatDate(date: Date | string, fmt = "dd MMM yyyy"): string {
  return format(new Date(date), fmt);
}

export function formatDateTime(
  date: Date | string,
  fmt = "dd MMM yyyy, HH:mm"
): string {
  return format(new Date(date), fmt);
}

export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

// ─── Booking status colors ────────────────────────────────────────────────────
export function bookingStatusColor(status: string): string {
  const map: Record<string, string> = {
    CONFIRMED:  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    CHECKED_IN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    COMPLETED:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    CANCELLED:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    NO_SHOW:    "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    REFUNDED:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
}

export function paymentStatusColor(status: string): string {
  const map: Record<string, string> = {
    PAID:            "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    UNPAID:          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    PARTIALLY_PAID:  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    REFUNDED:        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    FAILED:          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    COMPLIMENTARY:   "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
}

export function mediaStatusColor(status: string): string {
  const map: Record<string, string> = {
    NOT_APPLICABLE:   "bg-gray-100 text-gray-500",
    PENDING:          "bg-yellow-100 text-yellow-700",
    PROCESSING:       "bg-blue-100 text-blue-700",
    UPLOADED:         "bg-purple-100 text-purple-700",
    SENT_TO_CUSTOMER: "bg-green-100 text-green-700",
    ISSUE_REPORTED:   "bg-red-100 text-red-700",
    REFUNDED:         "bg-orange-100 text-orange-700",
    RESOLVED:         "bg-green-100 text-green-700",
    PENDING_UPLOAD:     "bg-yellow-100 text-yellow-700",
    PARTIALLY_UPLOADED: "bg-blue-100 text-blue-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
}

export function sourceColor(source: string): string {
  const map: Record<string, string> = {
    DIRECT:    "bg-brand-turquoise/10 text-brand-turquoise",
    WALK_IN:   "bg-brand-mango/10 text-brand-mango",
    AGENT:     "bg-brand-ocean/10 text-brand-ocean",
    AFFILIATE: "bg-brand-citrus/10 text-brand-citrus",
  };
  return map[source] ?? "bg-gray-100 text-gray-600";
}

// ─── Weight check (zipline safety) ───────────────────────────────────────────
export function isWeightEligible(weightKg: number): {
  eligible: boolean;
  reason?: string;
} {
  if (weightKg < 35) return { eligible: false, reason: "Minimum weight is 35 kg" };
  if (weightKg > 110) return { eligible: false, reason: "Maximum weight is 110 kg" };
  return { eligible: true };
}

export function isAgeEligible(age: number): {
  eligible: boolean;
  reason?: string;
} {
  if (age < 6) return { eligible: false, reason: "Minimum age is 6 years" };
  return { eligible: true };
}

// ─── Slot availability ────────────────────────────────────────────────────────
export function slotAvailableCount(
  capacity: number,
  bookedCount: number
): number {
  return Math.max(0, capacity - bookedCount);
}

export function isSlotAvailable(
  capacity: number,
  bookedCount: number,
  needed = 1
): boolean {
  return slotAvailableCount(capacity, bookedCount) >= needed;
}

// ─── String helpers ───────────────────────────────────────────────────────────
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(text: string, length = 60): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trimEnd() + "…";
}

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ─── Phone formatter ──────────────────────────────────────────────────────────
export function formatPhone(phone: string, country = "MV"): string {
  // Simple display format — extend with libphonenumber if needed
  if (phone.startsWith("+")) return phone;
  const codes: Record<string, string> = { MV: "+960", US: "+1", GB: "+44" };
  return `${codes[country] ?? ""}${phone}`;
}

// ─── Commission calculator ────────────────────────────────────────────────────
export function calculateCommission(
  eligibleAmount: number,
  rate: number,
  isPercentage = true
): number {
  if (isPercentage) return (eligibleAmount * rate) / 100;
  return rate; // fixed amount
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export function getPaginationMeta(
  total: number,
  page: number,
  perPage: number
) {
  return {
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
    hasNext: page * perPage < total,
    hasPrev: page > 1,
    from: (page - 1) * perPage + 1,
    to: Math.min(page * perPage, total),
  };
}
