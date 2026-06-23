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
  items:  ActionItem[];
  label?: string;
}

export function ActionDropdown({ items, label }: ActionDropdownProps) {
  const [open, setOpen]       = useState(false);
  const [flipUp, setFlipUp]   = useState(false);
  const btnRef                = useRef<HTMLButtonElement>(null);
  const menuRef               = useRef<HTMLDivElement>(null);
  const containerRef          = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Detect if menu would overflow viewport bottom — if so, open upward
  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect        = btnRef.current.getBoundingClientRect();
      const spaceBelow  = window.innerHeight - rect.bottom;
      const menuHeight  = items.length * 38 + 16; // approx
      setFlipUp(spaceBelow < menuHeight);
    }
    setOpen((v) => !v);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium",
          "border border-border hover:bg-muted transition-colors",
          "text-muted-foreground hover:text-foreground"
        )}
      >
        {label ?? <MoreHorizontal className="w-4 h-4" />}
      </button>

      {open && (
        // Render in a portal-like fixed position to escape table overflow:hidden
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top:  flipUp ? undefined : (btnRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
            bottom: flipUp ? (window.innerHeight - (btnRef.current?.getBoundingClientRect().top ?? 0) + 4) : undefined,
            right: Math.max(8, window.innerWidth - (btnRef.current?.getBoundingClientRect().right ?? 0)),
            zIndex: 9999,
          }}
          className={cn(
            "w-52 bg-popover border border-border rounded-xl shadow-xl py-1",
            "animate-scale-in"
          )}
        >
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
