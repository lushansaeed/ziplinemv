"use client";

import { useState } from "react";
import { LogOut, Settings, User, ChevronDown } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { initials } from "@/lib/utils";
import type { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
  collapsed?: boolean;
}

export function UserMenu({ name, email, role, avatarUrl, collapsed }: UserMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-3 w-full rounded-xl p-2.5 transition-colors",
          "hover:bg-muted/60 text-left",
          open && "bg-muted/60"
        )}
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full rounded-lg object-cover" />
          ) : (
            initials(name)
          )}
        </div>

        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate leading-tight">{name}</p>
              <p className="text-xs text-muted-foreground truncate">{ROLE_LABELS[role]}</p>
            </div>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0",
                open && "rotate-180"
              )}
            />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-popover border border-border rounded-xl shadow-lg py-1 overflow-hidden animate-scale-in">
            {/* User info header */}
            <div className="px-3 py-2.5 border-b border-border/50">
              <p className="text-sm font-medium text-foreground truncate">{name}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>

            {/* Menu items */}
            <div className="p-1">
              <button
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm",
                  "text-foreground hover:bg-muted transition-colors"
                )}
              >
                <User className="w-4 h-4 text-muted-foreground" />
                Profile settings
              </button>
              <button
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm",
                  "text-foreground hover:bg-muted transition-colors"
                )}
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                Preferences
              </button>
            </div>

            <div className="border-t border-border/50 p-1 mt-1">
              <form action={signOut}>
                <button
                  type="submit"
                  className={cn(
                    "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm",
                    "text-red-500 hover:bg-red-500/10 transition-colors"
                  )}
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
