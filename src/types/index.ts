// ─── Re-export Prisma types ───────────────────────────────────────────────────
export type {
  User,
  Agent,
  Affiliate,
  Booking,
  Customer,
  Rider,
  Package,
  AddOn,
  TimeSlot,
  Payment,
  Waiver,
  AgentCommission,
  AffiliateCommission,
  WebsiteMedia,
  CustomerMediaDelivery,
  Faq,
  Policy,
  Setting,
  AuditLog,
} from "@prisma/client";

export {
  UserRole,
  UserStatus,
  BookingSource,
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
  WaiverStatus,
  MediaDeliveryStatus,
  ApplicationStatus,
  PolicyType,
  MediaType,
  SlotStatus,
  DiscountType,
  CommissionBasis,
  PayoutStatus,
} from "@prisma/client";

// ─── App-level types ──────────────────────────────────────────────────────────

export interface BookingWithRelations {
  id: string;
  reference: string;
  bookingDate: Date;
  numRiders: number;
  source: string;
  bookingStatus: string;
  paymentStatus: string;
  waiverStatus: string;
  mediaStatus: string;
  total: number;
  currency: string;
  notes: string | null;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    nationality: string | null;
    hotel: string | null;
  };
  package: {
    id: string;
    name: string;
    touristPrice: number;
  };
  slot: {
    id: string;
    startTime: string;
    endTime: string;
    date: Date;
  };
  agent: { id: string; businessName: string } | null;
  affiliate: { id: string; name: string } | null;
  riders: Array<{
    name: string;
    age: number | null;
    weight: number | null;
  }>;
  addOns: Array<{
    addOn: { name: string };
    quantity: number;
    total: number;
  }>;
}

export interface DashboardStats {
  todayBookings: number;
  upcomingBookings: number;
  totalRevenue: number;
  directRevenue: number;
  agentRevenue: number;
  affiliateRevenue: number;
  walkInRevenue: number;
  addOnRevenue: number;
  pendingMediaDelivery: number;
  slotUtilization: number;
}

export interface PriceCalculation {
  basePrice: number;
  packagePrice: number;
  addOnsTotal: number;
  discountAmount: number;
  subtotal: number;
  total: number;
  currency: string;
  breakdown: PriceLineItem[];
}

export interface PriceLineItem {
  label: string;
  amount: number;
  type: "base" | "addon" | "discount" | "promo";
}

export interface BookingFormData {
  // Step 1
  date: string;
  // Step 2
  slotId: string;
  // Step 3
  numRiders: number;
  // Step 4
  packageId: string;
  // Step 5
  addOnIds: string[];
  // Step 6 — customer
  customerName: string;
  customerPhone: string;
  customerPhoneCountry: string;
  customerEmail: string;
  customerNationality: string;
  customerHotel: string;
  // Step 7 — riders
  riders: Array<{ name: string; age: string; weight: string }>;
  // Step 8 — waiver
  waiverAccepted: boolean;
  termsAccepted: boolean;
  // Step 9 — payment
  paymentMethod: string;
  promoCode: string;
  // Meta
  affiliateCoupon?: string;
  affiliateLinkId?: string;
}

export interface AgentDashboardStats {
  totalBookings: number;
  todayBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  totalSales: number;
  commissionEarned: number;
  commissionPayable: number;
}

export interface AffiliateDashboardStats {
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  totalSales: number;
  commissionEarned: number;
  commissionPayable: number;
}

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: number;
  children?: NavItem[];
}

export type BookingStatusColor =
  | "green"
  | "blue"
  | "gray"
  | "red"
  | "yellow"
  | "purple";
