"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Save, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Faq } from "@prisma/client";

const inputCls = "w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground";

export function FaqManager({ faqs: initialFaqs }: { faqs: Faq[] }) {
  const [faqs, setFaqs]             = useState(initialFaqs);
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd]       = useState(false);
  const [newFaq, setNewFaq]         = useState({ category: "", question: "", answer: "", displayOrder: 0 });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = [...new Set(faqs.map((f) => f.category))];

  async function createFaq() {
    if (!newFaq.category || !newFaq.question || !newFaq.answer) {
      toast.error("Fill in all fields"); return;
    }
    startTransition(async () => {
      const res = await fetch("/api/admin/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFaq),
      });
      const data = await res.json();
      if (res.ok) {
        setFaqs((prev) => [...prev, data]);
        setNewFaq({ category: "", question: "", answer: "", displayOrder: 0 });
        setShowAdd(false);
        toast.success("FAQ added");
      } else toast.error(data.error ?? "Failed");
    });
  }

  async function toggleFaq(id: string, active: boolean) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/faqs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (res.ok) {
        setFaqs((prev) => prev.map((f) => f.id === id ? { ...f, active } : f));
        toast.success(active ? "FAQ shown" : "FAQ hidden");
      } else toast.error("Failed");
    });
  }

  async function deleteFaq(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/faqs/${id}`, { method: "DELETE" });
      if (res.ok) { setFaqs((prev) => prev.filter((f) => f.id !== id)); toast.success("FAQ deleted"); }
      else toast.error("Failed");
    });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Add new */}
      <div className="admin-card space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">FAQ questions</p>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add FAQ
          </button>
        </div>

        {showAdd && (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Category *</label>
                <input
                  value={newFaq.category}
                  onChange={(e) => setNewFaq((p) => ({ ...p, category: e.target.value }))}
                  list="faq-categories"
                  placeholder="e.g. Booking, Safety, Payment"
                  className={inputCls}
                />
                <datalist id="faq-categories">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Display order</label>
                <input type="number" value={newFaq.displayOrder}
                  onChange={(e) => setNewFaq((p) => ({ ...p, displayOrder: parseInt(e.target.value) || 0 }))}
                  className={inputCls} min={0} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Question *</label>
              <input value={newFaq.question} onChange={(e) => setNewFaq((p) => ({ ...p, question: e.target.value }))} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Answer *</label>
              <textarea rows={3} value={newFaq.answer} onChange={(e) => setNewFaq((p) => ({ ...p, answer: e.target.value }))} className={cn(inputCls, "resize-none")} />
            </div>
            <div className="flex gap-2">
              <button onClick={createFaq} disabled={isPending} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                <Save className="w-3.5 h-3.5" /> Save FAQ
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Grouped FAQ list */}
      {categories.map((cat) => (
        <div key={cat} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{cat}</p>
          <div className="admin-card p-0 overflow-hidden divide-y divide-border">
            {faqs.filter((f) => f.category === cat).map((faq) => (
              <div key={faq.id} className={cn("transition-colors", !faq.active && "opacity-50")}>
                <div className="flex items-start gap-3 px-4 py-3">
                  <button onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)} className="flex-1 text-left">
                    <p className="text-sm font-medium">{faq.question}</p>
                  </button>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground">
                      {expandedId === faq.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => toggleFaq(faq.id, !faq.active)} className="p-1.5 rounded hover:bg-muted text-muted-foreground">
                      {faq.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => deleteFaq(faq.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {expandedId === faq.id && (
                  <div className="px-4 pb-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {faqs.length === 0 && (
        <p className="text-center py-10 text-sm text-muted-foreground">No FAQs yet. Add one above.</p>
      )}
    </div>
  );
}
