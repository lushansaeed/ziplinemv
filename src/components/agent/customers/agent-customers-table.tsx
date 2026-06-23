"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

interface CustomerRow {
  id: string; name: string; phone: string;
  email: string | null; nationality: string | null;
  hotel: string | null; createdAt: Date;
  _count: { bookings: number };
}

export function AgentCustomersTable({ customers }: { customers: CustomerRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = customers.filter((c) =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, email…"
          className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="admin-card p-0 overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Nationality</th>
              <th>Hotel</th>
              <th>Bookings</th>
              <th>First booking</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                  {search ? "No customers match your search." : "No customers yet. Create a booking to add a customer."}
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="table-row-hover">
                  <td>
                    <p className="font-medium text-sm">{c.name}</p>
                    {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                  </td>
                  <td className="text-sm">{c.phone}</td>
                  <td className="text-sm text-muted-foreground">{c.nationality ?? "—"}</td>
                  <td className="text-sm text-muted-foreground">{c.hotel ?? "—"}</td>
                  <td>
                    <span className="font-bold text-sm text-primary">{c._count.bookings}</span>
                  </td>
                  <td className="text-sm text-muted-foreground">{formatDate(c.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">Showing {filtered.length} of {customers.length} customers</p>
      )}
    </div>
  );
}
