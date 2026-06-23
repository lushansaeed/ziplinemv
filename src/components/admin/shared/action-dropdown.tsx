"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionItem {
  label:    string;
  icon?:    React.ElementType;
  onClick:  () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  divider?: boolean;
}

interface ActionDropdownProps {
  items:    ActionItem[];
  label?:   string;
}

export function ActionDropdown({ items, label }: ActionDropdownProps) {
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium",
          "border border-border hover:bg-muted transition-colors",
          "text-muted-foreground hover:text-foreground"
        )}
      >
        {label ?? <MoreHorizontal className="w-4 h-4" />}
      </button>

      {open && (
        <div className={cn(
          "absolute right-0 top-full mt-1 z-50 w-48",
          "bg-popover border border-border rounded-xl shadow-lg py-1",
          "animate-scale-in"
        )}>
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i}>
                {item.divider && <div className="border-t border-border my-1" />}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!item.disabled) { item.onClick(); setOpen(false); }
                  }}
                  disabled={item.disabled}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors",
                    item.variant === "danger"
                      ? "text-destructive hover:bg-destructive/10"
                      : "text-foreground hover:bg-muted",
                    item.disabled && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
                  {item.label}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
