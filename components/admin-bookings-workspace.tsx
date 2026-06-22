"use client";

import { useMemo, useState } from "react";
import { Download, Plus, Search, X } from "lucide-react";
import { AdminCreateBookingForm } from "@/components/admin-create-booking-form";
import { DataCard, ProgressBar, StatusBadge } from "@/components/dashboard-ui";
import { deleteBooking, updateBooking } from "@/lib/admin/actions";

type BookingRow = {
  id: string;
  reference: string;
  customerName: string;
  phone: string;
  email: string;
  date: string;
  timeSlot: string;
  adults: number;
  kids: number;
  totalGuests: number;
  addOns: string;
  bookingSource: string;
  agentName: string;
  affiliateCode: string;
  totalAmount: string;
  currency: string;
  paymentStatus: string;
  bookingStatus: string;
  createdDate: string;
  internalNotes: string;
};

const bookingStatuses = ["PENDING", "CONFIRMED", "PAID", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW", "REFUNDED"];
const paymentStatuses = ["UNPAID", "PARTIALLY_PAID", "PAID", "REFUNDED"];
const filterStatuses = ["All", "Pending", "Confirmed", "Completed"];
const exchangeRateMvrPerUsd = 20;

export function AdminBookingsWorkspace({ bookings }: { bookings: BookingRow[] }) {
  const [activeTab, setActiveTab] = useState<"overview" | "bookings">("overview");
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const filteredBookings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      const matchesStatus = statusFilter === "All" || booking.bookingStatus === statusFilter.toUpperCase();
      const matchesDate = !dateFilter || booking.date === dateFilter;
      const matchesSearch =
        !normalizedSearch ||
        [
          booking.reference,
          booking.customerName,
          booking.phone,
          booking.email,
          booking.timeSlot,
          booking.bookingSource,
          booking.agentName,
          booking.affiliateCode,
          booking.paymentStatus,
          booking.bookingStatus
        ].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesStatus && matchesDate && matchesSearch;
    });
  }, [bookings, dateFilter, search, statusFilter]);

  const counts = countBy(bookings.map((booking) => booking.bookingStatus));
  const todaysBookings = bookings.filter((booking) => booking.date === today);
  const totalGuests = bookings.reduce((sum, booking) => sum + booking.totalGuests, 0);
  const totalSales = bookings.reduce((sum, booking) => sum + toMvr(Number(booking.totalAmount), booking.currency), 0);

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 rounded-3xl bg-white/70 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-lagoon">Booking section</p>
          <h2 className="text-2xl font-black text-ocean-950">Bookings</h2>
        </div>
        <button type="button" onClick={() => setShowCreate((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-full bg-ocean-950 px-5 py-3 text-sm font-black text-white shadow-glow">
          <Plus className="h-4 w-4" />
          {showCreate ? "Hide Create Booking" : "Create Booking"}
        </button>
      </div>

      {showCreate ? (
        <div className="rounded-3xl bg-white/50 p-4 shadow-sm">
          <AdminCreateBookingForm />
        </div>
      ) : null}

      <div className="flex gap-2 rounded-2xl bg-white/70 p-1 shadow-sm">
        {[
          ["overview", "Overview"],
          ["bookings", "Bookings"]
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value as "overview" | "bookings")}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-black transition ${activeTab === value ? "bg-ocean-950 text-white shadow-sm" : "text-ocean-950/60 hover:bg-white"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <OverviewTab bookings={bookings} counts={counts} todaysBookings={todaysBookings} totalGuests={totalGuests} totalSales={totalSales} />
      ) : (
        <BookingsTab
          bookings={filteredBookings}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          search={search}
          setSearch={setSearch}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          clearFilters={() => {
            setStatusFilter("All");
            setSearch("");
            setDateFilter("");
          }}
        />
      )}
    </div>
  );
}

function OverviewTab({
  bookings,
  counts,
  todaysBookings,
  totalGuests,
  totalSales
}: {
  bookings: BookingRow[];
  counts: Record<string, number>;
  todaysBookings: BookingRow[];
  totalGuests: number;
  totalSales: number;
}) {
  const totalBookings = Math.max(bookings.length, 1);
  const summaryCards = [
    ["Today's Bookings", String(todaysBookings.length)],
    ["Pending Bookings", String(counts.PENDING ?? 0)],
    ["Confirmed Bookings", String(counts.CONFIRMED ?? 0)],
    ["Completed Bookings", String(counts.COMPLETED ?? 0)],
    ["Cancelled Bookings", String(counts.CANCELLED ?? 0)],
    ["Total Guests", String(totalGuests)],
    ["Total Sales", `MVR ${totalSales.toFixed(2)}`]
  ];

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(([label, value]) => (
          <article key={label} className="rounded-2xl bg-white/75 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-ocean-950/40">{label}</p>
            <p className="mt-3 text-3xl font-black text-ocean-950">{value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <DataCard title="Booking status summary" eyebrow="Status mix">
          <div className="grid gap-4">
            {bookingStatuses.map((status) => {
              const count = counts[status] ?? 0;
              const value = Math.round((count / totalBookings) * 100);
              return (
                <div key={status} className="rounded-2xl bg-white/65 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <StatusBadge status={status} />
                    <span className="font-black text-ocean-950">{count}</span>
                  </div>
                  <ProgressBar label={`${value}% of bookings`} value={value} />
                </div>
              );
            })}
          </div>
        </DataCard>

        <div className="grid gap-5">
          <DataCard title="Recent bookings" eyebrow="Latest activity">
            <CompactBookingList bookings={bookings.slice(0, 6)} empty="No recent bookings yet." />
          </DataCard>
          <DataCard title="Today's schedule" eyebrow={new Date().toISOString().slice(0, 10)}>
            <CompactBookingList bookings={todaysBookings.slice(0, 6)} empty="No bookings scheduled today." />
          </DataCard>
        </div>
      </div>
    </div>
  );
}

function BookingsTab({
  bookings,
  statusFilter,
  setStatusFilter,
  search,
  setSearch,
  dateFilter,
  setDateFilter,
  clearFilters
}: {
  bookings: BookingRow[];
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  dateFilter: string;
  setDateFilter: (value: string) => void;
  clearFilters: () => void;
}) {
  return (
    <div className="grid gap-5">
      <div className="rounded-3xl bg-white/75 p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[180px_1fr_180px_auto_auto] lg:items-end">
          <label className="grid gap-1 text-sm font-bold text-ocean-950">
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-ocean-950/10 bg-white px-4 py-3">
              {filterStatuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-ocean-950">
            Search
            <span className="flex items-center gap-2 rounded-2xl border border-ocean-950/10 bg-white px-4 py-3">
              <Search className="h-4 w-4 text-ocean-950/35" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Reference, customer, phone, email..." className="min-w-0 flex-1 bg-transparent outline-none" />
            </span>
          </label>
          <label className="grid gap-1 text-sm font-bold text-ocean-950">
            Date
            <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="rounded-2xl border border-ocean-950/10 bg-white px-4 py-3" />
          </label>
          <button type="button" onClick={clearFilters} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-ocean-950 shadow-sm">
            <X className="h-4 w-4" />
            Clear filters
          </button>
          <button type="button" onClick={() => exportCsv(bookings)} className="inline-flex items-center justify-center gap-2 rounded-full bg-ocean-950 px-5 py-3 text-sm font-black text-white shadow-glow">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {bookings.length ? bookings.map((booking) => (
          <article key={booking.id} className="border-b border-ocean-950/10 p-4">
            <div className="grid gap-3 text-sm md:grid-cols-8">
              <strong>{booking.reference}</strong>
              <span>{booking.customerName}</span>
              <span>{booking.date}</span>
              <span>{booking.timeSlot}</span>
              <span>{booking.adults} adults / {booking.kids} kids</span>
              <span>{booking.bookingSource}</span>
              <StatusBadge status={booking.bookingStatus} />
              <span>{booking.currency} {Number(booking.totalAmount).toFixed(2)}</span>
            </div>
            {booking.addOns ? (
              <p className="mt-2 text-xs font-bold text-ocean-950/55">Add-ons: {booking.addOns}</p>
            ) : null}
            <form action={updateBooking} className="mt-3 grid gap-3 md:grid-cols-4">
              <input type="hidden" name="id" value={booking.id} />
              <Select name="bookingStatus" label="Booking" options={bookingStatuses} defaultValue={booking.bookingStatus} />
              <Select name="paymentStatus" label="Payment" options={paymentStatuses} defaultValue={booking.paymentStatus} />
              <Field name="internalNotes" label="Notes" defaultValue={booking.internalNotes} />
              <div className="flex items-end gap-2">
                <button className="rounded-full bg-ocean-950 px-4 py-2 text-sm font-bold text-white">Save</button>
              </div>
            </form>
            <form action={deleteBooking} className="mt-2">
              <input type="hidden" name="id" value={booking.id} />
              <button className="text-sm font-bold text-red-600">Delete booking</button>
            </form>
          </article>
        )) : <p className="p-5 text-sm font-bold text-ocean-950/60">No bookings match the selected filters.</p>}
      </div>
    </div>
  );
}

function CompactBookingList({ bookings, empty }: { bookings: BookingRow[]; empty: string }) {
  if (!bookings.length) return <p className="rounded-2xl bg-white/60 p-4 text-sm font-bold text-ocean-950/55">{empty}</p>;

  return (
    <div className="grid gap-3">
      {bookings.map((booking) => (
        <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/65 p-4">
          <div>
            <p className="font-black text-ocean-950">{booking.reference}</p>
            <p className="text-sm font-bold text-ocean-950/55">{booking.customerName} / {booking.timeSlot}</p>
          </div>
          <StatusBadge status={booking.bookingStatus} />
        </div>
      ))}
    </div>
  );
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-1 text-sm font-bold">
      {label}
      <input {...props} className="rounded-lg border border-ocean-950/10 px-3 py-2" />
    </label>
  );
}

function Select({ label, name, options, defaultValue }: { label: string; name: string; options: string[]; defaultValue?: string }) {
  return (
    <label className="grid gap-1 text-sm font-bold">
      {label}
      <select name={name} defaultValue={defaultValue} className="rounded-lg border border-ocean-950/10 px-3 py-2">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function countBy(items: string[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item] = (counts[item] ?? 0) + 1;
    return counts;
  }, {});
}

function toMvr(amount: number, currency: string) {
  return currency === "MVR" ? amount : amount * exchangeRateMvrPerUsd;
}

function exportCsv(bookings: BookingRow[]) {
  const headers = [
    "Booking reference",
    "Customer name",
    "Phone number",
    "Email",
    "Booking date",
    "Time slot",
    "Adults",
    "Kids",
    "Total guests",
    "Add-ons",
    "Booking source",
    "Agent name",
    "Affiliate code",
    "Total amount",
    "Currency",
    "Payment status",
    "Booking status",
    "Created date"
  ];
  const rows = bookings.map((booking) => [
    booking.reference,
    booking.customerName,
    booking.phone,
    booking.email,
    booking.date,
    booking.timeSlot,
    booking.adults,
    booking.kids,
    booking.totalGuests,
    booking.addOns,
    booking.bookingSource,
    booking.agentName,
    booking.affiliateCode,
    booking.totalAmount,
    booking.currency,
    booking.paymentStatus,
    booking.bookingStatus,
    booking.createdDate
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `zipline-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}
