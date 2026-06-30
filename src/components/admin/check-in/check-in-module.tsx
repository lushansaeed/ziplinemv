"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  Search, QrCode, CheckCircle2, XCircle, AlertTriangle,
  Loader2, User, Calendar, Clock, Package, Weight,
  ShieldCheck, ShieldAlert, Link2, Camera, X,
} from "lucide-react";
import jsQR from "jsqr";
import { toast } from "sonner";
import { checkInBooking, completeBooking, updatePaymentStatus } from "@/lib/admin/booking-actions";
import { StatusBadge } from "../shared/status-badge";
import { formatCurrency, formatDate, isWeightEligible } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { isWaiverSignedForRider } from "@/lib/ride-tracking/waiver-matching";

interface RideTracking {
  bookingRiderId: string;
  status: string;
  wristband: { qrCode: string } | null;
}

interface BookingRider {
  id: string;
  name: string;
  age: number | null;
  weight: number | null;
}

interface BookingResult {
  id: string; reference: string; bookingDate: Date; bookingStatus: string;
  paymentStatus: string; waiverStatus: string; numRiders: number;
  source: string; total: number; currency: string;
  customer: { name: string; phone: string };
  package: { name: string };
  slot: { startTime: string };
  riders: BookingRider[];
  waivers?: Array<{ status: string; riderName: string; riderId: string | null }>;
  checkIn: { checkedInAt: Date } | null;
  rideTrackings?: RideTracking[];
}

function riderWaiverSigned(
  rider: BookingRider,
  waivers: BookingResult["waivers"],
  riders: BookingRider[]
): boolean {
  if (!waivers) return false;
  return isWaiverSignedForRider(rider, waivers, riders);
}

function ScannerModal({
  title,
  description,
  onScan,
  onClose,
}: {
  title: string;
  description: string;
  onScan: (value: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const frameRef = useRef<number | null>(null);
  const lastScanRef = useRef("");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);

  const stopCamera = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera access is not available in this browser.");
        }

        if ("BarcodeDetector" in window) {
          detectorRef.current = detectorRef.current ?? new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play();
        }
        setStarting(false);
      } catch (err: any) {
        setError(err?.message ?? "Camera access failed. Use manual input instead.");
        setStarting(false);
      }
    }

    start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      if (cancelled) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        try {
          let rawValue = "";
          if (detectorRef.current) {
            const codes = await detectorRef.current.detect(video);
            rawValue = codes?.[0]?.rawValue?.trim() ?? "";
          }
          if (!rawValue) {
            const canvas = canvasRef.current;
            const context = canvas?.getContext("2d", { willReadFrequently: true });
            if (canvas && context && video.videoWidth > 0 && video.videoHeight > 0) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
              rawValue = jsQR(imageData.data, imageData.width, imageData.height)?.data?.trim() ?? "";
            }
          }
          if (rawValue && rawValue !== lastScanRef.current) {
            lastScanRef.current = rawValue;
            stopCamera();
            onScan(rawValue);
            return;
          }
        } catch (err: any) {
          setError(err?.message ?? "Scanner paused. Close and try again.");
        }
      }
      frameRef.current = requestAnimationFrame(detect);
    }

    frameRef.current = requestAnimationFrame(detect);
    return () => {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [onScan, stopCamera]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6">
      <div className="w-full max-w-lg overflow-hidden rounded-t-3xl border border-border bg-background shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-4">
          <div>
            <p className="text-lg font-bold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <button
            type="button"
            onClick={() => { stopCamera(); onClose(); }}
            className="rounded-full border border-border p-2 text-muted-foreground hover:bg-muted"
            aria-label="Close scanner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-black">
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,transparent_42%,rgba(0,0,0,0.58)_43%,rgba(0,0,0,0.72)_100%)]" />
            <div className="absolute inset-x-12 top-1/2 aspect-square -translate-y-1/2 rounded-3xl border-2 border-primary shadow-[0_0_30px_rgba(20,184,166,0.35)]" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 text-center">
              <p className="text-sm font-semibold text-white">
                {starting ? "Starting camera..." : error ? "Camera unavailable" : "Point camera at the QR code"}
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CheckInModule({ canEditPayments = false }: { canEditPayments?: boolean }) {
  const [query, setQuery]           = useState("");
  const [result, setResult]         = useState<BookingResult | null>(null);
  const [notFound, setNotFound]     = useState(false);
  const [searching, setSearching]   = useState(false);
  const [scanner, setScanner]       = useState<{ type: "booking" } | { type: "wristband"; riderId: string } | null>(null);

  // Wristband QR inputs per rider id
  const [qrInputs, setQrInputs] = useState<Record<string, string>>({});
  const [linking, setLinking]   = useState(false);

  const [isCheckingIn, startCheckInTransition] = useTransition();
  const [isCompleting, startCompleteTransition] = useTransition();
  const [isMarkingPaid, startMarkPaidTransition] = useTransition();

  async function search(value = query, mode: "manual" | "qr" = "manual") {
    const lookup = value.trim();
    if (!lookup) return;
    setSearching(true);
    setResult(null);
    setNotFound(false);
    setQrInputs({});
    try {
      const res  = await fetch(`/api/admin/check-in/search?q=${encodeURIComponent(lookup)}&mode=${mode}`);
      const data = await res.json();
      if (data.booking) {
        setResult(data.booking);
        setQuery(data.booking.reference);
      } else {
        setNotFound(true);
        if (mode === "qr") toast.error("Invalid booking QR. Booking not found.");
      }
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") search();
  }

  function handleScan(value: string) {
    if (!scanner) return;
    if (scanner.type === "booking") {
      setScanner(null);
      setQuery(value);
      search(value, "qr");
      return;
    }

    const trimmed = value.trim();
    const alreadyEntered = Object.entries(qrInputs).some(([riderId, qr]) =>
      riderId !== scanner.riderId && qr.trim() === trimmed
    );
    if (alreadyEntered) {
      toast.error("This wristband QR is already entered for another rider.");
      setScanner(null);
      return;
    }

    setQrInputs((p) => ({ ...p, [scanner.riderId]: trimmed }));
    setScanner(null);
    toast.success("Wristband QR captured.");
  }

  async function handleWristbandCheckIn() {
    if (!result) return;

    const missingWristbands = result.riders.filter((rider) => !riderWristbands(rider)?.wristband);
    const assignments = result.riders
      .filter((r) => {
        const hasWristband = result.rideTrackings?.find((t) => t.bookingRiderId === r.id)?.wristband;
        return !hasWristband && qrInputs[r.id]?.trim();
      })
      .map((r) => ({ bookingRiderId: r.id, wristbandQrCode: qrInputs[r.id].trim() }));

    if (!isPaymentSettled) {
      toast.error("Check-in blocked. Payment has not been settled for this booking.");
      return;
    }

    if (assignments.length !== missingWristbands.length) {
      toast.error("Check-in blocked. Please scan a physical wristband QR for each rider before check-in.");
      return;
    }

    setLinking(true);
    try {
      const res = await fetch(`/api/admin/bookings/${result.id}/wristband-check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errs: string[] = data.errors ?? [data.error ?? "Failed"];
        errs.forEach((e) => toast.error(e, { duration: 8000 }));
      } else {
        toast.success(data.message ?? "Check-in completed and wristbands linked successfully.");
        // Refresh result
        const fresh = await fetch(`/api/admin/check-in/search?q=${encodeURIComponent(result.reference)}`);
        const freshData = await fresh.json();
        if (freshData.booking) setResult(freshData.booking);
        setQrInputs({});
      }
    } finally {
      setLinking(false);
    }
  }

  const weightIssues   = result?.riders.filter((r) => r.weight && !isWeightEligible(r.weight).eligible) ?? [];
  const signedWaivers  = result?.waivers?.filter((w) => w.status === "SIGNED").length ?? 0;
  const allWaiversDone = result ? signedWaivers >= result.numRiders : false;
  const isPaymentSettled = result ? ["PAID", "COMPLIMENTARY"].includes(result.paymentStatus) : false;

  // Per-rider wristband state
  const riderWristbands = (rider: BookingRider) =>
    result?.rideTrackings?.find((t) => t.bookingRiderId === rider.id);

  const allWristbandsLinked = result?.riders.every((r) => !!riderWristbands(r)?.wristband) ?? false;
  const missingWristbandRiders = result?.riders.filter((r) => !riderWristbands(r)?.wristband) ?? [];
  const allMissingWristbandsEntered = missingWristbandRiders.every((r) => Boolean(qrInputs[r.id]?.trim()));
  const canLinkWristbands   = isPaymentSettled && allWaiversDone && !allWristbandsLinked;
  const isReadyForCheckIn = isPaymentSettled && allWaiversDone && allWristbandsLinked && weightIssues.length === 0;
  const bookingType = result?.source
    ? result.source === "DIRECT"
      ? "Public"
      : result.source.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    : "";

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="admin-card space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold">Check-in / Wristband Linking</p>
            <p className="text-xs text-muted-foreground">Scan the customer booking QR, then scan one physical wristband QR for each rider.</p>
          </div>
          <button
            type="button"
            onClick={() => setScanner({ type: "booking" })}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Camera className="h-4 w-4" />
            Scan Booking QR
          </button>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Reference number, phone, or name…"
              className={cn(
                "w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-background",
                "text-sm focus:outline-none focus:ring-2 focus:ring-ring",
                "placeholder:text-muted-foreground"
              )}
              autoFocus
            />
          </div>
          <button
            onClick={() => search()}
            disabled={searching || !query.trim()}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Manual fallback: enter a booking reference, confirmation URL, phone number, or customer name.
        </p>
      </div>

      {notFound && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-destructive text-sm">No booking found for "{query}".</p>
        </div>
      )}

      {result && (
        <div className="admin-card space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-mono font-bold text-2xl text-primary">{result.reference}</p>
              <p className="text-muted-foreground text-sm mt-0.5">{result.customer.name} · {result.customer.phone}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge value={result.bookingStatus} type="booking" />
              <StatusBadge value={result.paymentStatus} type="payment" />
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Calendar, label: "Date",    value: formatDate(result.bookingDate) },
              { icon: Clock,    label: "Time",    value: result.slot.startTime },
              { icon: Package,  label: "Package", value: result.package.name },
              { icon: QrCode,   label: "Type",    value: bookingType },
              { icon: User,     label: "Riders",  value: `${result.numRiders}` },
              { icon: ShieldCheck, label: "Waivers", value: allWaiversDone ? "Complete" : `${signedWaivers}/${result.numRiders} signed` },
              { icon: Link2, label: "Wristbands", value: allWristbandsLinked ? "Linked" : `${result.riders.length - missingWristbandRiders.length}/${result.riders.length} linked` },
              { icon: CheckCircle2, label: "Check-in", value: result.checkIn ? "Checked in" : "Pending" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="bg-muted/40 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-xs">{item.label}</span>
                  </div>
                  <p className="font-semibold text-sm">{item.value}</p>
                </div>
              );
            })}
          </div>

          {/* ── Per-rider panel ─────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Riders</p>
            <div className="space-y-3">
              {result.riders.map((rider) => {
                const wCheck      = rider.weight ? isWeightEligible(rider.weight) : null;
                const waiversOk   = riderWaiverSigned(rider, result.waivers, result.riders);
                const tracking    = riderWristbands(rider);
                const wristband   = tracking?.wristband;
                const weightBad   = wCheck?.eligible === false;

                return (
                  <div
                    key={rider.id}
                    className={cn(
                      "rounded-xl border p-4 space-y-3",
                      weightBad
                        ? "border-destructive/40 bg-destructive/5"
                        : "border-border bg-muted/20"
                    )}
                  >
                    {/* Rider info row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">{rider.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {[rider.age && `${rider.age} yrs`, rider.weight && `${rider.weight} kg`].filter(Boolean).join(" · ")}
                        </span>
                        {weightBad && (
                          <span className="text-xs text-destructive font-medium">{wCheck?.reason}</span>
                        )}
                      </div>
                      {/* Waiver badge */}
                      <span className={cn(
                        "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                        waiversOk
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      )}>
                        {waiversOk
                          ? <><ShieldCheck className="w-3 h-3" /> Waiver signed</>
                          : <><ShieldAlert className="w-3 h-3" /> Waiver missing</>
                        }
                      </span>
                    </div>

                    {/* Wristband section */}
                    {wristband ? (
                      <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                        <Link2 className="w-4 h-4 flex-shrink-0" />
                        <span className="font-mono font-semibold">{wristband.qrCode}</span>
                        <span className="text-green-600/70 dark:text-green-500/70 text-xs ml-1">linked</span>
                      </div>
                    ) : waiversOk ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <QrCode className="w-3 h-3" /> Physical wristband QR
                          </label>
                          <button
                            type="button"
                            onClick={() => setScanner({ type: "wristband", riderId: rider.id })}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                          >
                            <Camera className="h-3 w-3" />
                            Scan Wristband
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={qrInputs[rider.id] ?? ""}
                            onChange={(e) => setQrInputs((p) => ({ ...p, [rider.id]: e.target.value }))}
                            placeholder="Scan or enter wristband QR..."
                            autoComplete="off"
                            className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          {qrInputs[rider.id]?.trim() && (
                            <button
                              type="button"
                              onClick={() => setQrInputs((p) => ({ ...p, [rider.id]: "" }))}
                              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        Wristband linking blocked — rider must sign waiver first
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment notice */}
          {!isPaymentSettled && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">Payment outstanding</p>
                <p className="text-yellow-700 dark:text-yellow-500 text-sm">
                  {formatCurrency(Number(result.total), result.currency)} — not yet paid.
                </p>
              </div>
            </div>
          )}

          {/* Weight blocker */}
          {weightIssues.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-destructive">Cannot proceed</p>
                <p className="text-destructive/80 text-sm">
                  {weightIssues.map((r) => r.name).join(", ")} {weightIssues.length === 1 ? "does" : "do"} not meet weight requirements.
                </p>
              </div>
            </div>
          )}

          {/* Waiver summary — only show if any missing */}
          {!allWaiversDone && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800">
              <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-400">Waivers not completed</p>
                <p className="text-red-700 dark:text-red-500 text-sm mt-0.5">
                  {signedWaivers} of {result.numRiders} waivers signed. All riders must sign before wristbands can be linked or check-in can proceed.
                </p>
              </div>
            </div>
          )}

          {/* Wristband summary */}
          {isPaymentSettled && allWaiversDone && !allWristbandsLinked && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <QrCode className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-400">Wristbands required</p>
                <p className="text-orange-700 dark:text-orange-500 text-sm mt-0.5">
                  Reception check-in is blocked until every rider has a scanned physical wristband QR assigned and locked.
                </p>
              </div>
            </div>
          )}

          {/* Already checked in banner */}
          {result.checkIn && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-400 font-medium">
                Checked in at {new Date(result.checkIn.checkedInAt).toLocaleTimeString()}
                {allWristbandsLinked ? " · All wristbands linked" : ""}
              </p>
            </div>
          )}

          {/* ── Action bar ──────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-border">

            {/* Primary: link wristbands + check in */}
            {canLinkWristbands && !result.checkIn && weightIssues.length === 0 && (
              <button
                onClick={handleWristbandCheckIn}
                disabled={linking || !allMissingWristbandsEntered}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                Link Wristbands & Check In
              </button>
            )}

            {/* Fallback check-in without wristbands (if all wristbands already linked) */}
            {isReadyForCheckIn && result.bookingStatus === "CONFIRMED" && !result.checkIn && (
              <button
                onClick={() => startCheckInTransition(async () => {
                  const r = await checkInBooking(result.id);
                  if (r.success) {
                    toast.success("Check-in completed and wristbands linked successfully.");
                    setResult((p) => p ? { ...p, bookingStatus: "CHECKED_IN", checkIn: { checkedInAt: new Date() } } : p);
                  } else toast.error((r as any).error ?? "Action failed");
                })}
                disabled={isCheckingIn}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isCheckingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Check in
              </button>
            )}

            {result.bookingStatus === "CHECKED_IN" && (
              <button
                onClick={() => startCompleteTransition(async () => {
                  const r = await completeBooking(result.id);
                  if (r.success) {
                    toast.success("Booking completed!");
                    setResult((p) => p ? { ...p, bookingStatus: "COMPLETED" } : p);
                  } else toast.error((r as any).error ?? "Action failed");
                })}
                disabled={isCompleting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Mark completed
              </button>
            )}

            {canEditPayments && result.paymentStatus === "UNPAID" && (
              <button
                onClick={() => startMarkPaidTransition(async () => {
                  const r = await updatePaymentStatus(result.id, "PAID" as any, "cash");
                  if (r.success) {
                    toast.success("Marked as paid");
                    setResult((p) => p ? { ...p, paymentStatus: "PAID" } : p);
                  } else toast.error((r as any).error ?? "Could not mark payment as paid");
                })}
                disabled={isMarkingPaid}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
              >
                {isMarkingPaid && <Loader2 className="w-4 h-4 animate-spin" />}
                Mark paid (cash)
              </button>
            )}

            <button
              onClick={() => { setResult(null); setQuery(""); setNotFound(false); setQrInputs({}); }}
              className="ml-auto px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-muted transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
      {scanner && (
        <ScannerModal
          title={scanner.type === "booking" ? "Scan Booking QR" : "Scan Wristband QR"}
          description={
            scanner.type === "booking"
              ? "Scan the QR code from the customer confirmation page."
              : "Scan the pre-printed physical wristband QR code."
          }
          onScan={handleScan}
          onClose={() => setScanner(null)}
        />
      )}
    </div>
  );
}
