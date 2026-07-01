import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/auth/permissions";
import { formatCurrency } from "@/lib/utils";
import { getDayEndReport } from "@/lib/reports/day-end";
import {
  approveDayEndClosing,
  createCounterFloat,
  reopenDayEndClosing,
  submitDayEndClosing,
} from "@/lib/admin/day-end-actions";

export const metadata: Metadata = { title: "Day-End Sales Report | Admin" };

type SearchParams = {
  date?: string;
  location?: string;
  paymentMethod?: string;
  currency?: string;
  source?: string;
};

function Stat({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "good" | "bad" }) {
  return (
    <div className="admin-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={tone === "good" ? "mt-2 text-2xl font-bold text-green-600" : tone === "bad" ? "mt-2 text-2xl font-bold text-red-600" : "mt-2 text-2xl font-bold"}>
        {value}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="admin-card space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, name, type = "number", defaultValue }: { label: string; name: string; type?: string; defaultValue?: string | number }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input name={name} type={type} step={type === "number" ? "0.01" : undefined} defaultValue={defaultValue} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
    </label>
  );
}

export default async function DayEndReportPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("reports", "view");
  const date = searchParams.date ?? format(new Date(), "yyyy-MM-dd");
  const location = searchParams.location ?? "Main Counter";
  const report = await getDayEndReport({ ...searchParams, date, location });
  const closing = report.closing;
  const canApprove = user.role === "SUPER_ADMIN" || user.role === "ADMIN" || user.role === "FINANCE" || user.role === "OPERATIONS_MANAGER";

  const exportHref = `/api/admin/reports/export?type=day-end&date=${encodeURIComponent(date)}&location=${encodeURIComponent(location)}`;

  return (
    <div>
      <PageHeader
        title="Day-End Sales Report"
        description="Cash drawer, card, bank transfer, complimentary, add-on, and agent commission reconciliation."
        actions={
          <Link href={exportHref} className="btn-secondary text-sm px-4 py-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Link>
        }
      />

      <div className="space-y-6 p-6">
        <form className="admin-card grid gap-3 md:grid-cols-6" action="/admin/reports/day-end">
          <Field label="Date" name="date" type="date" defaultValue={date} />
          <Field label="Location" name="location" type="text" defaultValue={location} />
          <label className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">Payment</span>
            <select name="paymentMethod" defaultValue={searchParams.paymentMethod ?? ""} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="">All</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="COMPLIMENTARY">Complimentary</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">Currency</span>
            <select name="currency" defaultValue={searchParams.currency ?? ""} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="">All</option>
              <option value="MVR">MVR</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">Source</span>
            <select name="source" defaultValue={searchParams.source ?? ""} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="">All</option>
              <option value="DIRECT">Direct</option>
              <option value="WALK_IN">Walk-in</option>
              <option value="AGENT">Agent</option>
              <option value="AFFILIATE">Affiliate</option>
            </select>
          </label>
          <button className="self-end h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Apply</button>
        </form>

        <div className="grid gap-4 md:grid-cols-5">
          <Stat label="Bookings" value={report.summary.bookings} />
          <Stat label="Riders" value={report.summary.riders} />
          <Stat label="Ticket sales" value={formatCurrency(report.summary.totalTicketSales)} />
          <Stat label="Add-ons" value={formatCurrency(report.summary.totalAddOnSales)} />
          <Stat label={report.summary.reconciled ? "Reconciled" : "Difference"} value={formatCurrency(report.summary.difference)} tone={report.summary.reconciled ? "good" : "bad"} />
        </div>

        <Section title="Opening Float">
          <div className="grid gap-4 md:grid-cols-3">
            <Stat label="MVR opening float" value={`MVR ${report.openingFloat.mvr.toFixed(2)}`} />
            <Stat label="USD opening float" value={`USD ${report.openingFloat.usd.toFixed(2)}`} />
            <Stat label="Effective date" value={report.openingFloat.effectiveDate ?? "Not configured"} />
          </div>
          {canApprove && (
            <form action={async (formData) => { "use server"; await createCounterFloat(formData); }} className="grid gap-3 border-t border-border pt-4 md:grid-cols-5">
              <input type="hidden" name="location" value={location} />
              <Field label="New effective date" name="effectiveDate" type="date" defaultValue={date} />
              <Field label="MVR float" name="mvrAmount" />
              <Field label="USD float" name="usdAmount" />
              <Field label="Notes" name="notes" type="text" />
              <button className="self-end h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted">Add future float</button>
            </form>
          )}
        </Section>

        <Section title="Payment Breakdown">
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Cash MVR / USD" value={`MVR ${report.paymentBreakdown.cash.MVR.toFixed(2)} / USD ${report.paymentBreakdown.cash.USD.toFixed(2)}`} />
            <Stat label="Card MVR / USD" value={`MVR ${report.paymentBreakdown.card.MVR.toFixed(2)} / USD ${report.paymentBreakdown.card.USD.toFixed(2)}`} />
            <Stat label="Bank MVR / USD" value={`MVR ${report.paymentBreakdown.bankTransfer.MVR.toFixed(2)} / USD ${report.paymentBreakdown.bankTransfer.USD.toFixed(2)}`} />
            <Stat label="Complimentary value" value={`MVR ${report.paymentBreakdown.complimentary.MVR.toFixed(2)} / USD ${report.paymentBreakdown.complimentary.USD.toFixed(2)}`} />
          </div>
        </Section>

        <Section title="Ticket Sales">
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Local tickets" value={`${report.ticketSales.localQty} riders`} />
            <Stat label="Tourist tickets" value={`${report.ticketSales.touristQty} riders`} />
            {Object.entries(report.ticketSales.bySource).map(([source, value]) => (
              <Stat key={source} label={`${source.toLowerCase()} sales`} value={formatCurrency(value.total)} />
            ))}
          </div>
        </Section>

        <Section title="Add-On Sales">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="py-2">Add-on</th><th>Qty</th><th>Total</th><th>Local</th><th>Tourist</th></tr></thead>
              <tbody className="divide-y divide-border">
                {report.addOnSales.map((item) => (
                  <tr key={item.name}><td className="py-2 font-medium">{item.name}</td><td>{item.quantity}</td><td>{formatCurrency(item.total)}</td><td>{formatCurrency(item.localTotal)}</td><td>{formatCurrency(item.touristTotal)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Reconciliation">
          <form action={async (formData) => { "use server"; await submitDayEndClosing(formData); }} className="space-y-4">
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="location" value={location} />
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Actual MVR cash counted" name="actualMvrCash" defaultValue={report.cashDrawer.actualMvrCash ?? report.cashDrawer.expectedMvrCash} />
              <Field label="Actual USD cash counted" name="actualUsdCash" defaultValue={report.cashDrawer.actualUsdCash ?? report.cashDrawer.expectedUsdCash} />
              <Field label="Actual MVR card settlement" name="actualMvrCard" defaultValue={report.cardReconciliation.actualMvr ?? report.cardReconciliation.expectedMvr} />
              <Field label="Actual USD card settlement" name="actualUsdCard" defaultValue={report.cardReconciliation.actualUsd ?? report.cardReconciliation.expectedUsd} />
              <Field label="Actual MVR bank verified" name="actualMvrBankTransfer" defaultValue={report.bankTransferReconciliation.actualMvr ?? report.bankTransferReconciliation.expectedMvr} />
              <Field label="Actual USD bank verified" name="actualUsdBankTransfer" defaultValue={report.bankTransferReconciliation.actualUsd ?? report.bankTransferReconciliation.expectedUsd} />
            </div>
            <textarea name="notes" defaultValue={closing?.notes ?? ""} placeholder="Variance notes" className="min-h-20 w-full rounded-lg border border-border bg-background p-3 text-sm" />
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Submit closing</button>
              {closing && <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">Status: {closing.status}</span>}
            </div>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            {closing && canApprove && closing.status !== "APPROVED" && (
              <form action={async () => { "use server"; await approveDayEndClosing(closing.id); }}>
                <button className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">Approve</button>
              </form>
            )}
            {closing && canApprove && closing.status === "APPROVED" && (
              <form action={async () => { "use server"; await reopenDayEndClosing(closing.id, "Reopened from day-end report."); }}>
                <button className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">Reopen</button>
              </form>
            )}
          </div>
        </Section>

        <Section title="Agent Commission">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="py-2">Agent</th><th>Bookings</th><th>Riders</th><th>Sales</th><th>Rate</th><th>Commission</th><th>Net</th></tr></thead>
              <tbody className="divide-y divide-border">
                {report.agentCommissions.map((item) => (
                  <tr key={`${item.agentName}-${item.currency}`}><td className="py-2 font-medium">{item.agentName}</td><td>{item.bookings}</td><td>{item.riders}</td><td>{formatCurrency(item.ticketSales + item.addOnSales, item.currency)}</td><td>{item.commissionRate}%</td><td>{formatCurrency(item.commissionAmount, item.currency)}</td><td>{formatCurrency(item.netAmount, item.currency)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Complimentary Summary">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="py-2">Reference</th><th>Customer</th><th>Riders</th><th>Ticket</th><th>Add-ons</th><th>Total value</th><th>Reason</th></tr></thead>
              <tbody className="divide-y divide-border">
                {report.complimentary.map((item) => (
                  <tr key={String(item.reference)}><td className="py-2 font-mono text-primary">{String(item.reference)}</td><td>{String(item.customer)}</td><td>{String(item.riders)}</td><td>{formatCurrency(Number(item.ticketValue), String(item.currency))}</td><td>{formatCurrency(Number(item.addOnValue), String(item.currency))}</td><td>{formatCurrency(Number(item.totalValue), String(item.currency))}</td><td>{String(item.reason ?? "")}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Transactions">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] text-sm">
              <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="py-2">Ref</th><th>Customer</th><th>Type</th><th>Source</th><th>Payment</th><th>Tickets</th><th>Add-ons</th><th>Total</th><th>Status</th><th>Agent</th></tr></thead>
              <tbody className="divide-y divide-border">
                {report.transactions.map((row) => (
                  <tr key={String(row.reference)}>
                    <td className="py-2 font-mono text-primary">{String(row.reference)}</td>
                    <td>{String(row.customer)}</td>
                    <td>{String(row.customerType)}</td>
                    <td>{String(row.source)}</td>
                    <td>{String(row.paymentMethod)}</td>
                    <td>{formatCurrency(Number(row.ticketAmount), String(row.currency))}</td>
                    <td>{String(row.addOns)} ({formatCurrency(Number(row.addOnAmount), String(row.currency))})</td>
                    <td className="font-semibold">{formatCurrency(Number(row.totalPayable), String(row.currency))}</td>
                    <td>{String(row.paymentStatus)}</td>
                    <td>{String(row.agent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}
