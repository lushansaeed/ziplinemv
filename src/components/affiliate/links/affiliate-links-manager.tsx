"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Plus, Trash2, Eye, EyeOff, ExternalLink, Link2, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LinkRow {
  id: string; slug: string; fullUrl: string; label: string | null;
  active: boolean; clickCount: number; createdAt: Date;
  _count: { clicks: number };
}

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://zipline.mv";

export function AffiliateLinksManager({ links: initialLinks, affiliateId }: { links: LinkRow[]; affiliateId: string }) {
  const [links, setLinks]             = useState(initialLinks);
  const [isPending, startTransition]  = useTransition();
  const [showCreate, setShowCreate]   = useState(false);
  const [newLabel, setNewLabel]       = useState("");
  const [copiedId, setCopiedId]       = useState<string | null>(null);

  function copyLink(id: string, url: string) {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function createLink() {
    startTransition(async () => {
      const res = await fetch("/api/affiliate/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setLinks((prev) => [{ ...data, _count: { clicks: 0 } }, ...prev]);
        setNewLabel(""); setShowCreate(false);
        toast.success("Link created");
      } else toast.error(data.error ?? "Failed");
    });
  }

  async function toggleLink(id: string, active: boolean) {
    startTransition(async () => {
      const res = await fetch(`/api/affiliate/links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (res.ok) {
        setLinks((prev) => prev.map((l) => l.id === id ? { ...l, active } : l));
        toast.success(active ? "Link activated" : "Link deactivated");
      }
    });
  }

  async function deleteLink(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/affiliate/links/${id}`, { method: "DELETE" });
      if (res.ok) {
        setLinks((prev) => prev.filter((l) => l.id !== id));
        toast.success("Link deleted");
      }
    });
  }

  const totalClicks = links.reduce((s, l) => s + l.clickCount, 0);

  return (
    <div className="p-6 space-y-6">
      {/* How it works */}
      <div className="admin-card bg-brand-citrus/5 border-brand-citrus/20 space-y-3">
        <p className="font-semibold text-sm text-brand-citrus">How referral links work</p>
        <div className="grid sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
          {[
            "Share your unique link with your audience — on social media, your website, or direct messages.",
            "When someone clicks and books within your cookie window, the booking is attributed to you.",
            "You earn commission on every confirmed, paid booking that comes through your link.",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-citrus/20 text-brand-citrus text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              <p>{t}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total links",  value: links.length },
          { label: "Active links", value: links.filter((l) => l.active).length },
          { label: "Total clicks", value: totalClicks },
        ].map((s) => (
          <div key={s.label} className="admin-card text-center py-4">
            <p className="font-display font-bold text-2xl text-brand-citrus">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create new link */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{links.length} link{links.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create link
        </button>
      </div>

      {showCreate && (
        <div className="admin-card flex items-center gap-3">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (optional) e.g. Instagram bio, Blog post"
            className="flex-1 rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => e.key === "Enter" && createLink()}
          />
          <button onClick={createLink} disabled={isPending}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
            Create
          </button>
          <button onClick={() => setShowCreate(false)} className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted">
            Cancel
          </button>
        </div>
      )}

      {/* Links list */}
      {links.length === 0 ? (
        <div className="admin-card text-center py-14 space-y-3">
          <Link2 className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="font-semibold">No links yet</p>
          <p className="text-sm text-muted-foreground">Create your first referral link to start sharing.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div
              key={link.id}
              className={cn(
                "admin-card space-y-3",
                !link.active && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1 flex-1 min-w-0">
                  {link.label && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{link.label}</p>}
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-brand-citrus flex-shrink-0" />
                    <p className="font-mono text-sm text-foreground truncate">{link.fullUrl}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BarChart2 className="w-3 h-3" />
                      {link.clickCount} click{link.clickCount !== 1 ? "s" : ""}
                    </span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full font-medium",
                      link.active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"
                    )}>
                      {link.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => copyLink(link.id, link.fullUrl)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    {copiedId === link.id ? (
                      <><Check className="w-3.5 h-3.5 text-green-500" /> Copied!</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> Copy</>
                    )}
                  </button>
                  <a
                    href={link.fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => toggleLink(link.id, !link.active)}
                    className="p-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
                    title={link.active ? "Deactivate" : "Activate"}
                  >
                    {link.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => deleteLink(link.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Share hints */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
                <span className="text-[10px] text-muted-foreground font-medium">Share to:</span>
                {["Instagram bio", "TikTok bio", "WhatsApp", "Email"].map((channel) => (
                  <button
                    key={channel}
                    onClick={() => copyLink(link.id, link.fullUrl)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  >
                    {channel}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
