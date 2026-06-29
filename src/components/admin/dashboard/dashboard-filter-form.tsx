"use client";

import { useRef } from "react";
import { Filter } from "lucide-react";

interface Props {
  range: string;
  customFrom: string;
  customTo: string;
  source: string;
  currency: string;
  paymentStatus: string;
}

export function DashboardFilterForm({ range, customFrom, customTo, source, currency, paymentStatus }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  function submit() {
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      className="admin-card flex flex-wrap items-end gap-2.5 p-4"
      action="/admin/dashboard"
      method="get"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground mr-1 pb-1">
        <Filter className="w-3.5 h-3.5 text-primary" />
        Dashboard filters
      </div>

      <label className="space-y-0.5">
        <span className="block text-xs text-muted-foreground">Date range</span>
        <select name="range" defaultValue={range} onChange={submit}
          className="h-8 rounded-md border border-border bg-background px-2.5 text-sm">
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="custom">Custom</option>
        </select>
      </label>

      <label className="space-y-0.5">
        <span className="block text-xs text-muted-foreground">From</span>
        <input name="from" type="date" defaultValue={customFrom} onBlur={submit}
          className="h-8 rounded-md border border-border bg-background px-2.5 text-sm" />
      </label>

      <label className="space-y-0.5">
        <span className="block text-xs text-muted-foreground">To</span>
        <input name="to" type="date" defaultValue={customTo} onBlur={submit}
          className="h-8 rounded-md border border-border bg-background px-2.5 text-sm" />
      </label>

      <label className="space-y-0.5">
        <span className="block text-xs text-muted-foreground">Source</span>
        <select name="source" defaultValue={source} onChange={submit}
          className="h-8 rounded-md border border-border bg-background px-2.5 text-sm">
          <option value="">All sources</option>
          <option value="DIRECT">Public</option>
          <option value="AGENT">Agent</option>
          <option value="WALK_IN">Walk-in</option>
          <option value="AFFILIATE">Affiliate</option>
        </select>
      </label>

      <label className="space-y-0.5">
        <span className="block text-xs text-muted-foreground">Currency</span>
        <select name="currency" defaultValue={currency} onChange={submit}
          className="h-8 rounded-md border border-border bg-background px-2.5 text-sm">
          <option value="">All</option>
          <option value="MVR">MVR</option>
          <option value="USD">USD</option>
        </select>
      </label>

      <label className="space-y-0.5">
        <span className="block text-xs text-muted-foreground">Payment status</span>
        <select name="paymentStatus" defaultValue={paymentStatus} onChange={submit}
          className="h-8 rounded-md border border-border bg-background px-2.5 text-sm">
          <option value="">All</option>
          <option value="PAID">Paid</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIALLY_PAID">Partially paid</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </label>
    </form>
  );
}
