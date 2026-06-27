"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Power, Scan, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LOCATION_LABELS: Record<string, string> = {
  FIRST_FLOOR:   "First Floor",
  THIRD_FLOOR:   "Third Floor",
  FIFTH_FLOOR:   "Fifth Floor / Launch Tower",
  LANDING_TOWER: "Landing Tower (Vahmaafushi)",
};

interface Device {
  id: string;
  deviceName: string;
  deviceCode: string;
  assignedLocation: string;
  status: string;
  lastScanAt: string | null;
  notes: string | null;
  _count: { scanEvents: number };
}

const BLANK = { deviceName: "", deviceCode: "", devicePin: "", assignedLocation: "FIRST_FLOOR", notes: "" };

export function DeviceManager() {
  const [devices, setDevices]     = useState<Device[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState({ ...BLANK });
  const [saving, setSaving]       = useState(false);

  async function load() {
    setLoading(true);
    const res  = await fetch("/api/admin/ride-tracking/devices");
    const data = await res.json();
    setDevices(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setForm({ ...BLANK }); setEditId(null); setShowForm(true); }
  function openEdit(d: Device) {
    setForm({ deviceName: d.deviceName, deviceCode: d.deviceCode, devicePin: "", assignedLocation: d.assignedLocation, notes: d.notes ?? "" });
    setEditId(d.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.deviceName || !form.deviceCode || !form.assignedLocation) {
      toast.error("Name, code and location are required");
      return;
    }
    if (!editId && !form.devicePin) {
      toast.error("PIN is required for new devices");
      return;
    }
    setSaving(true);
    try {
      const res = editId
        ? await fetch(`/api/admin/ride-tracking/devices/${editId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          })
        : await fetch("/api/admin/ride-tracking/devices", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Save failed"); return; }
      toast.success(editId ? "Device updated" : "Device created");
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(d: Device) {
    await fetch(`/api/admin/ride-tracking/devices/${d.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: d.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
    });
    load();
  }

  const scanUrl = (code: string) => `${window.location.origin}/scan/${code}`;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Device
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : devices.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Scan className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No devices yet</p>
          <p className="text-sm mt-1">Add a scanning device to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((d) => (
            <div key={d.id} className={cn("bg-card border rounded-xl p-4 space-y-3", d.status === "ACTIVE" ? "border-border" : "border-border opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{d.deviceName}</p>
                  <p className="text-xs font-mono text-muted-foreground">{d.deviceCode}</p>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", d.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
                  {d.status}
                </span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground/70">{LOCATION_LABELS[d.assignedLocation]}</p>
                <p className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last scan: {d.lastScanAt ? new Date(d.lastScanAt).toLocaleString() : "Never"}
                </p>
                <p>{d._count.scanEvents} total scans</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(d)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground">
                  <Edit2 className="w-3 h-3" />Edit
                </button>
                <button onClick={() => toggleStatus(d)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground">
                  <Power className="w-3 h-3" />{d.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(scanUrl(d.deviceCode)); toast.success("Scan URL copied"); }}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                >
                  <Scan className="w-3 h-3" />URL
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-border">
              <h2 className="font-display font-bold text-lg text-foreground">
                {editId ? "Edit Device" : "Add Scan Device"}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: "deviceName", label: "Device Name", placeholder: "e.g. Fifth Floor Scanner 1" },
                { key: "deviceCode", label: "Device Code (URL slug)", placeholder: "e.g. fifth-floor-1" },
                { key: "devicePin",  label: `PIN (4–8 digits)${editId ? " — leave blank to keep" : ""}`, placeholder: "e.g. 1234" },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">{label}</label>
                  <input
                    type={key === "devicePin" ? "password" : "text"}
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Assigned Location</label>
                <select
                  value={form.assignedLocation}
                  onChange={(e) => setForm((p) => ({ ...p, assignedLocation: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Object.entries(LOCATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Notes</label>
                <input
                  type="text" value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional notes..."
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                {saving ? "Saving..." : editId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
