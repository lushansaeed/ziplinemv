"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DataTable, type Column } from "@/components/admin/shared/data-table";
import { StatusBadge } from "@/components/admin/shared/status-badge";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

interface ConversionRow {
  id: string; reference: string; bookingDate: Date;
  bookingStatus: string; paymentStatus: string;
  total: number; currency: string;
  customer:           { name: string; nationality: string | null };
  package:            { name: string };
  affiliateCommission:{ amount: number; status: string } | null;
  affiliateCoupon:    { code: string } | null;
}

interface Props {
  bookings:     ConversionRow[];
  total:        number;
  page:         number;
  perPage:      number;
  clickTotal:   number;
  searchParams: Record<string, string | undefined>;
}

export function AffiliateConversionsTable({ bookings, total, page, perPage, clickTotal, searchParams }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();

  function onPage(p: number) {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  const convRate = clickTotal > 0 ? ((total / clickTotal) * 100).toFixed(1) : "0.0";

  const columns: Column<ConversionRow>[] = [
    {
      key: "reference", header: "Booking",
      cell: (r) => (
        <div>
          <p className="font-mono text-xs font-bold text-primary">{r.reference}</p>
          <p className="text-xs text-muted-foreground">{formatDate(r.bookingDate)}</p>
        </div>
      ),
    },
    {
      key: "customer", header: "Customer",
      cell: (r) => (
        <div>
          <p className="text-sm font-medium">{r.customer.name}</p>
          {r.customer.nationality && <p className="text-xs text-muted-foreground">{r.customer.nationality}</p>}
        </div>
      ),
    },
    {
      key: "package", header: "Package",
      cell: (r) => <span className="text-sm">{r.package.name}</span>,
    },
    {
      key: "source", header: "Via", hide: "md",
      cell: (r) => r.affiliateCoupon
        ? <code className="text-xs font-mono text-brand-citrus">{r.affiliateCoupon.code}</code>
        : <span className="text-xs text-muted-foreground">Link</span>,
    },
    {
      key: "status", header: "Status",
      cell: (r) => <StatusBadge value={r.bookingStatus} type="booking" />,
    },
    {
      key: "payment", header: "Payment", hide: "sm",
      cell: (r) => <StatusBadge value={r.paymentStatus} type="payment" />,
    },
    {
      key: "total", header: "Booking total",
      cell: (r) => <span className="text-sm font-medium">{formatCurrency(Number(r.total), r.currency)}</span>,
    },
    {
      key: "commission", header: "Your commission",
      cell: (r) => r.affiliateCommission ? (
        <div>
          <p className="text-sm font-bold text-primary">{formatCurrency(Number(r.affiliateCommission.amount))}</p>
          <p className={cn("text-[10px]",
            r.affiliateCommission.status === "PAID"    ? "text-green-600" :
            r.affiliateCommission.status === "PENDING" ? "text-yellow-600" : "text-muted-foreground"
          )}>
            {r.affiliateCommission.status.toLowerCase()}
          </p>
        </div>
      ) : <span className="text-muted-foreground text-sm">—</span>,
    },
  ];

  return (
    <div className="p-6 space-y-4">
      {/* Conversion rate banner */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total clicks",       value: clickTotal,          color: "text-muted-foreground" },
          { label: "Total conversions",  value: total,               color: "text-brand-citrus" },
          { label: "Conversion rate",    value: `${convRate}%`,      color: "text-brand-lime" },
        ].map((s) => (
          <div key={s.label} className="admin-card text-center py-4">
            <p className={`font-display font-bold text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="admin-card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={bookings}
          keyField="id"
          total={total}
          page={page}
          perPage={perPage}
          onPage={onPage}
          emptyText="No conversions yet. Share your link or coupon to start tracking bookings."
        />
      </div>
    </div>
  );
}
