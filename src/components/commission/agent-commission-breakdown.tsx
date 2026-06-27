"use client";

import { DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type AddOnBreakdown = {
  id?: string;
  name?: string;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
  rule?: string;
  amount?: number;
};

type CommissionBreakdown = {
  currency?: string;
  total?: number;
  package?: {
    base?: number;
    rule?: string;
    amount?: number;
  };
  addOns?: AddOnBreakdown[];
  addOnTotal?: number;
};

type AgentCommissionLike = {
  amount: unknown;
  status?: string | null;
  breakdown?: unknown;
};

function asNumber(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getBreakdown(value: unknown): CommissionBreakdown | null {
  if (!value || typeof value !== "object") return null;
  return value as CommissionBreakdown;
}

export function AgentCommissionBreakdown({
  commission,
  currency,
  compact = false,
}: {
  commission: AgentCommissionLike;
  currency?: string;
  compact?: boolean;
}) {
  const breakdown = getBreakdown(commission.breakdown);
  const displayCurrency = breakdown?.currency ?? currency ?? "USD";
  const total = asNumber(breakdown?.total ?? commission.amount);
  const packageAmount = asNumber(breakdown?.package?.amount);
  const addOns = breakdown?.addOns ?? [];
  const hasBreakdown = !!breakdown;

  return (
    <div className={compact ? "space-y-2" : "rounded-xl border border-border/60 bg-background/70 p-3"}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <DollarSign className="h-3.5 w-3.5 text-primary" />
          Agent commission breakdown
        </span>
        <span className="text-sm font-bold text-primary">{formatCurrency(total, displayCurrency)}</span>
      </div>

      {hasBreakdown ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-border/50">
          <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-border/50 bg-muted/30 px-3 py-2 text-xs">
            <div>
              <p className="font-medium text-foreground">Package</p>
              <p className="text-muted-foreground">
                {formatCurrency(asNumber(breakdown.package?.base), displayCurrency)}
                {breakdown.package?.rule ? ` · ${breakdown.package.rule}` : ""}
              </p>
            </div>
            <p className="font-semibold text-foreground">{formatCurrency(packageAmount, displayCurrency)}</p>
          </div>

          {addOns.length > 0 ? (
            addOns.map((addOn, index) => (
              <div key={addOn.id ?? index} className="grid grid-cols-[1fr_auto] gap-3 border-b border-border/50 px-3 py-2 text-xs last:border-b-0">
                <div>
                  <p className="font-medium text-foreground">{addOn.name ?? "Add-on"}</p>
                  <p className="text-muted-foreground">
                    Qty {asNumber(addOn.quantity)}
                    {addOn.lineTotal != null ? ` · ${formatCurrency(asNumber(addOn.lineTotal), displayCurrency)}` : ""}
                    {addOn.rule ? ` · ${addOn.rule}` : ""}
                  </p>
                </div>
                <p className="font-semibold text-foreground">{formatCurrency(asNumber(addOn.amount), displayCurrency)}</p>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-muted-foreground">No add-on commission for this booking.</div>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          This older booking only stored the total commission. New bookings will show package and add-on lines.
        </p>
      )}
    </div>
  );
}
