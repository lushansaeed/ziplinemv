import { DashboardShell } from "@/components/dashboard-shell";
import { AdminPricingEngineWorkspace } from "@/components/admin-pricing-engine-workspace";
import { getBookingTimeSlotSettings } from "@/lib/booking-time-slots";
import { getDb } from "@/lib/db";
import { getPricingEngineConfig } from "@/lib/pricing-engine";

export const dynamic = "force-dynamic";

export default async function PricingEnginePage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();
  const [pricingEngine, slotSettings, rules, agents] = await Promise.all([
    getPricingEngineConfig(),
    getBookingTimeSlotSettings(),
    db.pricingRule.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
    db.agent.findMany({ include: { user: true, rates: { orderBy: { name: "asc" } } }, orderBy: { agencyName: "asc" } })
  ]);

  return (
    <DashboardShell title="Pricing Engine" subtitle="Manage prices, offers, add-ons, exchange rate, and slot capacity." nav={["Pricing"]} showSignOut>
      <Messages message={params.message} error={params.error} />
      <AdminPricingEngineWorkspace
        pricing={pricingEngine.pricing}
        addOns={pricingEngine.addOns}
        slotSettings={slotSettings}
        rules={rules.map((rule) => ({
          id: rule.id,
          name: rule.name,
          audience: rule.audience,
          adultPrice: rule.adultPrice.toString(),
          childPrice: rule.childPrice.toString(),
          currency: rule.currency,
          validFrom: rule.validFrom?.toISOString().slice(0, 10) ?? "",
          validTo: rule.validTo?.toISOString().slice(0, 10) ?? "",
          minGroup: rule.minGroup ?? "",
          isActive: rule.isActive
        }))}
        agents={agents.map((agent) => ({
          id: agent.id,
          agencyName: agent.agencyName,
          email: agent.user.email,
          commissionPercent: agent.commissionPercent.toString(),
          rates: agent.rates.map((rate) => ({
            id: rate.id,
            name: rate.name,
            price: rate.price.toString(),
            currency: rate.currency,
            validFrom: rate.validFrom?.toISOString().slice(0, 10) ?? "",
            validTo: rate.validTo?.toISOString().slice(0, 10) ?? ""
          }))
        }))}
      />
    </DashboardShell>
  );
}

function Messages({ message, error }: { message?: string; error?: string }) {
  return (
    <div className="mb-4 grid gap-3">
      {message ? <p className="rounded-2xl bg-white p-4 text-sm font-bold text-ocean-700 shadow-sm">{message}</p> : null}
      {error ? <p className="rounded-2xl bg-white p-4 text-sm font-bold text-red-600 shadow-sm">{error}</p> : null}
    </div>
  );
}
