"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div
            key={item.id}
            className={cn(
              "rounded-xl border transition-all duration-200",
              isOpen
                ? "site-card-selected"
                : "site-card"
            )}
          >
            <button
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="w-full flex items-start gap-4 text-left px-5 py-4"
            >
              <span className="flex-1 font-medium site-heading text-sm leading-snug mt-0.5">
                {item.question}
              </span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 site-text-muted flex-shrink-0 mt-0.5 transition-transform duration-200",
                  isOpen && "rotate-180 text-brand-citrus"
                )}
              />
            </button>

            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                isOpen ? "max-h-96" : "max-h-0"
              )}
            >
              <div className="px-5 pb-5">
                <p className="site-text-muted text-sm leading-relaxed">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
