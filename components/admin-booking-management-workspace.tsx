"use client";

import { useState, type ReactNode } from "react";

type BookingManagementTab = "bookings" | "customers" | "agents" | "affiliates";

const tabs: Array<[BookingManagementTab, string]> = [
  ["bookings", "Bookings"],
  ["customers", "Customers"],
  ["agents", "Agents"],
  ["affiliates", "Affiliates"]
];

export function AdminBookingManagementWorkspace({
  initialTab = "bookings",
  availableTabs = tabs.map(([value]) => value),
  bookings,
  customers,
  agents,
  affiliates
}: {
  initialTab?: BookingManagementTab;
  availableTabs?: BookingManagementTab[];
  bookings: ReactNode;
  customers: ReactNode;
  agents: ReactNode;
  affiliates: ReactNode;
}) {
  const allowedTabs = tabs.filter(([value]) => availableTabs.includes(value));
  const [activeTab, setActiveTab] = useState<BookingManagementTab>(availableTabs.includes(initialTab) ? initialTab : "bookings");

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2 rounded-3xl bg-white/75 p-2 shadow-sm">
        {allowedTabs.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value)}
            className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
              activeTab === value ? "bg-ocean-950 text-white shadow-glow" : "text-ocean-950/60 hover:bg-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "bookings" ? bookings : null}
      {activeTab === "customers" ? customers : null}
      {activeTab === "agents" ? agents : null}
      {activeTab === "affiliates" ? affiliates : null}
    </div>
  );
}
