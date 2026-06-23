"use client";

import { useState, useTransition } from "react";
import { Save, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime, cn } from "@/lib/utils";
import type { Policy } from "@prisma/client";

const POLICY_META = {
  TERMS_AND_CONDITIONS:  { label: "Terms & Conditions",  href: "/terms",                  badge: "text-white/60" },
  REFUND_POLICY:         { label: "Refund Policy",        href: "/refund-policy",           badge: "text-brand-citrus" },
  IMPORTANT_INFORMATION: { label: "Important Information",href: "/important-information",   badge: "text-brand-coral" },
  PRIVACY_POLICY:        { label: "Privacy Policy",       href: "/privacy",                 badge: "text-brand-ocean" },
} as const;

export function PoliciesEditor({ policies: initialPolicies }: { policies: Policy[] }) {
  const [policies, setPolicies]     = useState(initialPolicies);
  const [activeType, setActiveType] = useState<string>(policies[0]?.type ?? "TERMS_AND_CONDITIONS");
  const [isPending, startTransition] = useTransition();

  const active = policies.find((p) => p.type === activeType);
  const [content, setContent] = useState(active?.content ?? "");

  function switchPolicy(type: string) {
    setActiveType(type);
    const p = policies.find((x) => x.type === type);
    setContent(p?.content ?? "");
  }

  async function save() {
    startTransition(async () => {
      const res = await fetch("/api/admin/policies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeType, content }),
      });
      const data = await res.json();
      if (res.ok) {
        setPolicies((prev) => prev.map((p) => p.type === activeType ? { ...p, content, updatedAt: new Date() } : p));
        toast.success("Policy saved");
      } else toast.error(data.error ?? "Failed");
    });
  }

  const meta = POLICY_META[activeType as keyof typeof POLICY_META];

  return (
    <div className="p-6 grid lg:grid-cols-[200px,1fr] gap-6">
      {/* Policy type selector */}
      <div className="space-y-1">
        {Object.entries(POLICY_META).map(([type, m]) => (
          <button
            key={type}
            onClick={() => switchPolicy(type)}
            className={cn(
              "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              activeType === type
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="admin-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">{meta?.label}</p>
            {active?.updatedAt && (
              <p className="text-xs text-muted-foreground mt-0.5">Last updated: {formatDateTime(active.updatedAt)}</p>
            )}
          </div>
          <a href={meta?.href} target="_blank" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
            Preview
          </a>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Use Markdown formatting: ## Heading, **bold**, - list item</p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={24}
            className="w-full rounded-xl px-4 py-3 text-sm font-mono bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
            placeholder="Write policy content here using Markdown formatting…"
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{content.length} characters</p>
          <button
            onClick={save}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {isPending ? "Saving…" : "Save policy"}
          </button>
        </div>
      </div>
    </div>
  );
}
