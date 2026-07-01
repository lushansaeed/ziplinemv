import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { PrintReportButton } from "@/components/admin/reports/print-report-button";
import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/auth/permissions";
import { formatCurrency } from "@/lib/utils";
import { getDayEndReport } from "@/lib/reports/day-end";
import {
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

type CurrencyPair = { MVR: number; USD: number };
type SourceSales = Record<string, { bookings: number; local: number; tourist: number; localRiders: number; touristRiders: number }>;
type PackageSales = Record<string, { bookings: number; riders: number; local: number; tourist: number }>;

function moneyPair(mvr = 0, usd = 0): CurrencyPair {
  return { MVR: mvr, USD: usd };
}

function formatSourceName(value: string) {
  return value.toLowerCase().replace(/_/g, " ");
}

function PaperSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="print-avoid-break border-t border-black/10 pt-5">
      <h2 className="mb-3 text-[13px] font-semibold text-zinc-900">{title}</h2>
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

function CurrencyRows({ mvr, usd, muted = false }: { mvr: number; usd: number; muted?: boolean }) {
  return (
    <div className={muted ? "space-y-0.5 text-zinc-500" : "space-y-0.5"}>
      <div>{formatCurrency(mvr, "MVR")}</div>
      <div>{formatCurrency(usd, "USD")}</div>
    </div>
  );
}

function SummaryCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-[#F7F5EF] p-3">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className="text-sm font-semibold text-zinc-900">{children}</div>
    </div>
  );
}

function MiniTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px] text-zinc-900">
        {children}
      </table>
    </div>
  );
}

function paymentPercent(amount: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.round((amount / total) * 100));
}

function PaymentBar({ label, cash, card, bank }: { label: string; cash: number; card: number; bank: number }) {
  const total = cash + card + bank;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-zinc-500">
        <span>{label}</span>
        <span>{total > 0 ? "Cash / Card / Bank" : "No collections"}</span>
      </div>
      <div
        className="grid h-2 overflow-hidden rounded-full bg-zinc-100"
        style={{
          gridTemplateColumns: total > 0
            ? `${paymentPercent(cash, total)}fr ${paymentPercent(card, total)}fr ${paymentPercent(bank, total)}fr`
            : "1fr",
        }}
      >
        {total > 0 ? (
          <>
            <div className="bg-zinc-400" />
            <div className="bg-[#185FA5]" />
            <div className="bg-[#5DCAA5]" />
          </>
        ) : (
          <div className="bg-zinc-100" />
        )}
      </div>
    </div>
  );
}

export default async function DayEndReportPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("reports", "view");
  const date = searchParams.date ?? format(new Date(), "yyyy-MM-dd");
  const location = searchParams.location ?? "Main Counter";
  const report = await getDayEndReport({ ...searchParams, date, location });
  const closing = report.closing;
  const canManageClosing = user.role === "SUPER_ADMIN" || user.role === "ADMIN" || user.role === "FINANCE";
  const isClosingLocked = closing?.status === "SUBMITTED" || closing?.status === "APPROVED";
  const generatedAt = new Date();
  const generatedTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Indian/Maldives",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(generatedAt);

  const paidCollections = moneyPair(
    (report.paymentBreakdown.cash.MVR ?? 0) + (report.paymentBreakdown.card.MVR ?? 0) + (report.paymentBreakdown.bankTransfer.MVR ?? 0),
    (report.paymentBreakdown.cash.USD ?? 0) + (report.paymentBreakdown.card.USD ?? 0) + (report.paymentBreakdown.bankTransfer.USD ?? 0),
  );
  const complimentary = moneyPair(report.paymentBreakdown.complimentary.MVR ?? 0, report.paymentBreakdown.complimentary.USD ?? 0);
  const localTicketSales = report.ticketSales.byCustomerType.LOCAL?.total ?? 0;
  const touristTicketSales = report.ticketSales.byCustomerType.TOURIST?.total ?? 0;
  const localAddOnSales = report.addOnSales.reduce((sum, item) => sum + item.localTotal, 0);
  const touristAddOnSales = report.addOnSales.reduce((sum, item) => sum + item.touristTotal, 0);
  const discounts = report.transactions.reduce<CurrencyPair>((acc, row) => {
    const currency = String(row.currency);
    if (currency === "MVR") acc.MVR += Number(row.discount);
    if (currency === "USD") acc.USD += Number(row.discount);
    return acc;
  }, moneyPair());
  const expectedCash = moneyPair(report.cashDrawer.expectedMvrCash, report.cashDrawer.expectedUsdCash);
  const cashSales = moneyPair(report.cashDrawer.mvrCashSales, report.cashDrawer.usdCashSales);
  const cardSales = moneyPair(report.cardReconciliation.expectedMvr, report.cardReconciliation.expectedUsd);
  const bankSales = moneyPair(report.bankTransferReconciliation.expectedMvr, report.bankTransferReconciliation.expectedUsd);
  const sourceSales: SourceSales = report.transactions.reduce<SourceSales>((acc, row) => {
    const source = String(row.source);
    const customerType = String(row.customerType);
    acc[source] ??= { bookings: 0, local: 0, tourist: 0, localRiders: 0, touristRiders: 0 };
    acc[source].bookings += 1;
    if (customerType === "LOCAL") {
      acc[source].local += Number(row.totalPayable);
      acc[source].localRiders += Number(row.riders);
    } else {
      acc[source].tourist += Number(row.totalPayable);
      acc[source].touristRiders += Number(row.riders);
    }
    return acc;
  }, {});
  const packageSales: PackageSales = report.transactions.reduce<PackageSales>((acc, row) => {
    const packageName = String(row.package || "Package");
    const customerType = String(row.customerType);
    acc[packageName] ??= { bookings: 0, riders: 0, local: 0, tourist: 0 };
    acc[packageName].bookings += 1;
    acc[packageName].riders += Number(row.riders);
    if (customerType === "LOCAL") acc[packageName].local += Number(row.totalPayable);
    else acc[packageName].tourist += Number(row.totalPayable);
    return acc;
  }, {});

  const exportHref = `/api/admin/reports/export?type=day-end&date=${encodeURIComponent(date)}&location=${encodeURIComponent(location)}`;

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title="Day-End Sales Report"
          description="A counter reconciliation sheet for matching cash drawer, card settlement, bank receipts, and complimentary value."
          actions={
            <div className="flex flex-wrap gap-2">
              <PrintReportButton />
              <Link href={exportHref} className="btn-secondary px-4 py-2 text-sm">
                <Download className="h-4 w-4" />
                Export CSV
              </Link>
            </div>
          }
        />
      </div>

      <div className="space-y-5 bg-[#F4F1EA] p-4 print:bg-white print:p-0 md:p-6">
        <form className="rounded-lg border border-black/10 bg-white p-4 shadow-sm print:hidden" action="/admin/reports/day-end">
          <div className="grid gap-3 md:grid-cols-6">
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
            <button className="self-end rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Apply</button>
          </div>
        </form>

        <div className="mx-auto max-w-[920px] rounded-lg border border-black/10 bg-white px-5 py-6 text-zinc-900 shadow-sm print:max-w-none print:border-0 print:p-8 print:shadow-none md:px-10 md:py-9">
          <header className="mb-6 flex flex-col gap-3 border-b-2 border-[#D85A30] pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Image src="/images/zipline-logo-black.png" alt="Zipline Maldives" width={116} height={58} className="h-auto w-28 object-contain" priority />
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Vahmaafushi · Zipline Maldives</div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">Daily sales report</h1>
              </div>
            </div>
            <div className="text-left text-xs leading-6 text-zinc-500 sm:text-right">
              <div className="text-sm font-semibold text-zinc-900">{format(new Date(date), "EEE, dd MMM yyyy")}</div>
              <div>Location: {location}</div>
              <div>Generated {generatedTime} MVT</div>
              {closing && <div className="font-semibold text-zinc-700">Closing: {closing.status}</div>}
            </div>
          </header>

          <section className="space-y-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Counter must match</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-3xl font-semibold tracking-tight text-zinc-900">{formatCurrency(paidCollections.MVR, "MVR")}</div>
                <div className="text-xs text-zinc-500">MVR collected by cash, card, and bank transfer</div>
              </div>
              <div>
                <div className="text-3xl font-semibold tracking-tight text-zinc-900">{formatCurrency(paidCollections.USD, "USD")}</div>
                <div className="text-xs text-zinc-500">USD collected by cash, card, and bank transfer</div>
              </div>
            </div>
          </section>

          <PaperSection title="Counter reconciliation">
            <div className="grid gap-3 md:grid-cols-2">
              <SummaryCard label="Cash drawer expected">
                <CurrencyRows mvr={expectedCash.MVR} usd={expectedCash.USD} />
                <p className="mt-1 text-[11px] font-normal text-zinc-500">Opening float + cash sales</p>
              </SummaryCard>
              <SummaryCard label="Opening float">
                <CurrencyRows mvr={report.openingFloat.mvr} usd={report.openingFloat.usd} muted />
              </SummaryCard>
              <SummaryCard label="Card settlement must match">
                <CurrencyRows mvr={cardSales.MVR} usd={cardSales.USD} />
              </SummaryCard>
              <SummaryCard label="Bank receipts must match">
                <CurrencyRows mvr={bankSales.MVR} usd={bankSales.USD} />
              </SummaryCard>
            </div>
          </PaperSection>

          <PaperSection title="Revenue breakdown">
            <MiniTable>
              <tbody>
                <tr className="border-b border-black/10"><td className="py-2 text-zinc-500">Package revenue</td><td className="py-2 text-right tabular-nums">{formatCurrency(localTicketSales, "MVR")}</td><td className="py-2 text-right tabular-nums">{formatCurrency(touristTicketSales, "USD")}</td></tr>
                <tr className="border-b border-black/10"><td className="py-2 text-zinc-500">Add-on revenue</td><td className="py-2 text-right tabular-nums">{formatCurrency(localAddOnSales, "MVR")}</td><td className="py-2 text-right tabular-nums">{formatCurrency(touristAddOnSales, "USD")}</td></tr>
                <tr className="border-b border-black/10"><td className="py-2 text-zinc-500">Discounts applied</td><td className="py-2 text-right tabular-nums text-zinc-500">-{formatCurrency(discounts.MVR, "MVR")}</td><td className="py-2 text-right tabular-nums text-zinc-500">-{formatCurrency(discounts.USD, "USD")}</td></tr>
                <tr><td className="py-3 font-semibold">Collected sales</td><td className="py-3 text-right font-semibold tabular-nums">{formatCurrency(paidCollections.MVR, "MVR")}</td><td className="py-3 text-right font-semibold tabular-nums">{formatCurrency(paidCollections.USD, "USD")}</td></tr>
                <tr><td className="pb-1 text-zinc-500">Complimentary value</td><td className="pb-1 text-right tabular-nums text-zinc-500">{formatCurrency(complimentary.MVR, "MVR")}</td><td className="pb-1 text-right tabular-nums text-zinc-500">{formatCurrency(complimentary.USD, "USD")}</td></tr>
              </tbody>
            </MiniTable>
          </PaperSection>

          <PaperSection title="Payment method">
            <div className="space-y-3">
              <PaymentBar label="MVR payment split" cash={cashSales.MVR} card={cardSales.MVR} bank={bankSales.MVR} />
              <PaymentBar label="USD payment split" cash={cashSales.USD} card={cardSales.USD} bank={bankSales.USD} />
              <MiniTable>
                <thead>
                  <tr className="border-b border-black/10 text-left text-[10px] uppercase tracking-[0.08em] text-zinc-500">
                    <th className="py-2 font-semibold">Method</th>
                    <th className="py-2 text-right font-semibold">MVR</th>
                    <th className="py-2 text-right font-semibold">USD</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-black/10"><td className="py-2">Cash</td><td className="py-2 text-right">{formatCurrency(cashSales.MVR, "MVR")}</td><td className="py-2 text-right">{formatCurrency(cashSales.USD, "USD")}</td></tr>
                  <tr className="border-b border-black/10"><td className="py-2">Card</td><td className="py-2 text-right">{formatCurrency(cardSales.MVR, "MVR")}</td><td className="py-2 text-right">{formatCurrency(cardSales.USD, "USD")}</td></tr>
                  <tr><td className="py-2">Bank transfer</td><td className="py-2 text-right">{formatCurrency(bankSales.MVR, "MVR")}</td><td className="py-2 text-right">{formatCurrency(bankSales.USD, "USD")}</td></tr>
                </tbody>
              </MiniTable>
              <p className="text-[11px] text-zinc-500">Use these figures to match the physical cash count, card terminal settlement, and bank receipt proof. Complimentary is tracked separately and should not be counted as cash collected.</p>
            </div>
          </PaperSection>

          <div className="mt-6 hidden items-center justify-between border-t border-black/10 pt-3 text-[10px] uppercase tracking-[0.08em] text-zinc-400 print:flex">
            <span>Confidential - internal use only</span>
            <span>Page 1 of 2</span>
          </div>

          <div className="hidden print-page-break-before print:block" />

          <PaperSection title="Bookings by package">
            <MiniTable>
              <thead>
                <tr className="border-b border-black/10 text-left text-[10px] uppercase tracking-[0.08em] text-zinc-500">
                  <th className="py-2 font-semibold">Package</th>
                  <th className="py-2 text-right font-semibold">Bookings</th>
                  <th className="py-2 text-right font-semibold">Riders</th>
                  <th className="py-2 text-right font-semibold">MVR</th>
                  <th className="py-2 text-right font-semibold">USD</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(packageSales).map(([name, item]) => (
                  <tr key={name} className="border-b border-black/10 last:border-0">
                    <td className="py-2">{name}</td>
                    <td className="py-2 text-right tabular-nums">{item.bookings}</td>
                    <td className="py-2 text-right tabular-nums">{item.riders}</td>
                    <td className="py-2 text-right tabular-nums">{formatCurrency(item.local, "MVR")}</td>
                    <td className="py-2 text-right tabular-nums">{formatCurrency(item.tourist, "USD")}</td>
                  </tr>
                ))}
              </tbody>
            </MiniTable>
          </PaperSection>

          <PaperSection title="Source attribution">
            <MiniTable>
              <tbody>
                {Object.entries(sourceSales).map(([source, item]) => (
                  <tr key={source} className="border-b border-black/10 last:border-0">
                    <td className="py-2 capitalize">{formatSourceName(source)}</td>
                    <td className="py-2 text-right text-zinc-500">{item.bookings} bookings</td>
                    <td className="py-2 text-right text-zinc-500">{item.localRiders} local riders</td>
                    <td className="py-2 text-right tabular-nums">{formatCurrency(item.local, "MVR")}</td>
                    <td className="py-2 text-right text-zinc-500">{item.touristRiders} tourist riders</td>
                    <td className="py-2 text-right tabular-nums">{formatCurrency(item.tourist, "USD")}</td>
                  </tr>
                ))}
              </tbody>
            </MiniTable>
          </PaperSection>

          <PaperSection title="Add-on sales">
            <MiniTable>
              <thead>
                <tr className="border-b border-black/10 text-left text-[10px] uppercase tracking-[0.08em] text-zinc-500">
                  <th className="py-2 font-semibold">Add-on</th>
                  <th className="py-2 text-right font-semibold">Qty</th>
                  <th className="py-2 text-right font-semibold">Local MVR</th>
                  <th className="py-2 text-right font-semibold">Tourist USD</th>
                </tr>
              </thead>
              <tbody>
                {report.addOnSales.map((item) => (
                  <tr key={item.name} className="border-b border-black/10 last:border-0">
                    <td className="py-2">{item.name}</td>
                    <td className="py-2 text-right tabular-nums">{item.quantity}</td>
                    <td className="py-2 text-right tabular-nums">{formatCurrency(item.localTotal, "MVR")}</td>
                    <td className="py-2 text-right tabular-nums">{formatCurrency(item.touristTotal, "USD")}</td>
                  </tr>
                ))}
              </tbody>
            </MiniTable>
          </PaperSection>

          {complimentary.MVR > 0 || complimentary.USD > 0 ? (
            <div className="mt-5 rounded-lg bg-[#FAEEDA] p-4 text-[#854F0B]">
              <div className="text-xs font-semibold">Needs review</div>
              <p className="mt-1 text-xs leading-5">Complimentary value recorded today: {formatCurrency(complimentary.MVR, "MVR")} and {formatCurrency(complimentary.USD, "USD")}. It is not cash collected, but should be explained.</p>
            </div>
          ) : null}

          <footer className="mt-7 flex flex-col justify-between gap-2 border-t border-black/10 pt-4 text-[10px] uppercase tracking-[0.08em] text-zinc-400 sm:flex-row">
            <span>Confidential - internal use only</span>
            <span className="print:hidden">Zipline Maldives</span>
            <span className="hidden print:inline">Page 2 of 2</span>
          </footer>
        </div>

        <section className="mx-auto max-w-[920px] rounded-lg border border-black/10 bg-white p-5 shadow-sm print:hidden">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Submit counter reconciliation</h2>
          {isClosingLocked ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">This reconciliation is locked.</p>
              <p className="mt-1">Status: {closing?.status}. Ask an admin or finance user to reopen it if anything needs to change.</p>
              <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
                <div>Actual MVR cash: <strong>{formatCurrency(Number(closing?.actualMvrCash ?? 0), "MVR")}</strong></div>
                <div>Actual USD cash: <strong>{formatCurrency(Number(closing?.actualUsdCash ?? 0), "USD")}</strong></div>
                <div>Notes: <strong>{closing?.notes || "No notes"}</strong></div>
              </div>
            </div>
          ) : (
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
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {closing && canManageClosing && isClosingLocked && (
              <form action={async () => { "use server"; await reopenDayEndClosing(closing.id, "Reopened from day-end report."); }}>
                <button className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">Reopen</button>
              </form>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-[920px] rounded-lg border border-black/10 bg-white p-5 shadow-sm print:hidden">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Transactions</h2>
          <div className="overflow-x-auto rounded-lg border border-black/10">
            <table className="min-w-[1180px] text-[11px] text-zinc-900">
              <thead className="bg-[#F7F5EF]">
                <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className="px-3 py-2">Ref</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Payment</th>
                  <th className="px-3 py-2 text-right">Tickets</th>
                  <th className="px-3 py-2">Add-ons</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {report.transactions.map((row) => (
                  <tr key={String(row.reference)} className="align-top">
                    <td className="px-3 py-2 font-mono text-primary">{String(row.reference)}</td>
                    <td className="px-3 py-2"><div className="max-w-[200px] whitespace-normal font-medium leading-snug">{String(row.customer)}</div></td>
                    <td className="px-3 py-2">{String(row.customerType)}</td>
                    <td className="px-3 py-2">{String(row.source).replace("_", " ")}</td>
                    <td className="px-3 py-2">{String(row.paymentMethod).replace("_", " ")}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(Number(row.ticketAmount), String(row.currency))}</td>
                    <td className="px-3 py-2"><div className="max-w-[260px] whitespace-normal leading-snug">{String(row.addOns || "-")}</div></td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatCurrency(Number(row.totalPayable), String(row.currency))}</td>
                    <td className="px-3 py-2">{String(row.paymentStatus).replace("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {canManageClosing && (
          <section className="mx-auto max-w-[920px] rounded-lg border border-black/10 bg-white p-5 shadow-sm print:hidden">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">Opening float setup</h2>
            <form action={async (formData) => { "use server"; await createCounterFloat(formData); }} className="grid gap-3 md:grid-cols-5">
              <input type="hidden" name="location" value={location} />
              <Field label="New effective date" name="effectiveDate" type="date" defaultValue={date} />
              <Field label="MVR float" name="mvrAmount" />
              <Field label="USD float" name="usdAmount" />
              <Field label="Notes" name="notes" type="text" />
              <button className="self-end rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted">Add future float</button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
