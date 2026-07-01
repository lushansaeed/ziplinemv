"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Scan, Wind, Clock, User, Lock, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { QrScannerShell } from "@/components/shared/qr-scanner-shell";
import { decodeQrFromImageFile, decodeQrFromVideoFrame } from "@/lib/qr-decode";

const LOCATION_LABELS: Record<string, string> = {
  FIRST_FLOOR:   "First Floor",
  THIRD_FLOOR:   "Third Floor",
  FIFTH_FLOOR:   "Fifth Floor / Launch Tower",
  LANDING_TOWER: "Landing Tower · Vahmaafushi",
};

const LOCATION_COLORS: Record<string, string> = {
  FIRST_FLOOR:   "from-amber-600 to-amber-800",
  THIRD_FLOOR:   "from-orange-600 to-orange-800",
  FIFTH_FLOOR:   "from-red-600 to-red-800",
  LANDING_TOWER: "from-emerald-600 to-emerald-800",
};

interface DeviceInfo {
  id: string;
  deviceName: string;
  assignedLocation: string;
  scanMode: "camera" | "manual";
  status: string;
}

interface ScanResult {
  success: boolean;
  error?: string;
  riderName?: string;
  locationLabel?: string;
  status?: string;
  rideDurationSeconds?: number;
  rideSpeedKmph?: string | number;
  launchLineNumber?: number | null;
  windSpeedKmh?: string | number;
  windDirectionCompass?: string;
}

const DNF_REASONS = [
  "Customer changed mind",
  "Rider refused to fly",
  "Safety concern",
  "Weather concern",
  "Other",
];

function ScanResultPanel({ result, compact = false }: { result: ScanResult; compact?: boolean }) {
  return (
    <div className={cn(
      "w-full rounded-2xl border-2 transition-all",
      compact ? "p-4 shadow-2xl backdrop-blur-md" : "p-6",
      result.success
        ? "bg-emerald-950/95 border-emerald-500"
        : result.error?.toLowerCase().includes("waiver")
          ? "bg-orange-950/95 border-orange-500"
          : "bg-red-950/95 border-red-500"
    )}>
      <div className="flex items-start gap-4">
        {result.success
          ? <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0 mt-0.5" />
          : <XCircle className="w-8 h-8 text-red-400 flex-shrink-0 mt-0.5" />
        }
        <div className="flex-1 min-w-0">
          {result.success ? (
            <>
              <p className="text-emerald-300 font-bold text-lg">{result.locationLabel ?? "Scan recorded"}</p>
              {result.riderName && (
                <p className="text-white flex items-center gap-2 mt-1">
                  <User className="w-4 h-4" />{result.riderName}
                </p>
              )}
              {result.rideDurationSeconds && (
                <p className="text-emerald-300 mt-2 font-bold text-xl flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {result.rideDurationSeconds}s · {Number(result.rideSpeedKmph).toFixed(1)} km/h
                </p>
              )}
              {result.launchLineNumber && (
                <p className="text-white/80 text-sm mt-1">
                  Launch line: <span className="font-bold text-white">Line {result.launchLineNumber}</span>
                </p>
              )}
              {result.windSpeedKmh && (
                <p className="text-white/70 text-sm mt-1 flex items-center gap-1">
                  <Wind className="w-4 h-4" />
                  Wind: {Number(result.windSpeedKmh).toFixed(1)} km/h {result.windDirectionCompass}
                </p>
              )}
            </>
          ) : result.error?.toLowerCase().includes("waiver") ? (
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-orange-300 font-bold text-base">Waiver Not Completed</p>
                <p className="text-orange-200/80 text-sm mt-1">{result.error}</p>
                <p className="text-orange-300/60 text-xs mt-2">
                  Ask the customer to sign the waiver form before proceeding. Contact reception if needed.
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-red-300 font-bold text-base">Scan Failed</p>
              <p className="text-red-100/90 text-sm mt-1">{result.error}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ScanInterface({ deviceCode }: { deviceCode: string }) {
  // Auth state
  const [pin, setPin]             = useState("");
  const [showPin, setShowPin]     = useState(false);
  const [authError, setAuthError] = useState("");
  const [device, setDevice]       = useState<DeviceInfo | null>(null);
  const [authing, setAuthing]     = useState(false);

  // Scan state
  const [qrInput, setQrInput]     = useState("");
  const [result, setResult]       = useState<ScanResult | null>(null);
  const [scanning, setScanning]   = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraPrompt, setCameraPrompt] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [launchLineNumber, setLaunchLineNumber] = useState<1 | 2>(1);
  const inputRef                  = useRef<HTMLInputElement>(null);
  const videoRef                  = useRef<HTMLVideoElement>(null);
  const canvasRef                 = useRef<HTMLCanvasElement>(null);
  const streamRef                 = useRef<MediaStream | null>(null);
  const detectorRef               = useRef<any>(null);
  const lastDetectedRef           = useRef("");
  const scanLoopRef               = useRef<number | null>(null);

  // Did Not Fly modal
  const [dnfQr, setDnfQr]         = useState("");
  const [dnfReason, setDnfReason] = useState("");
  const [dnfRemarks, setDnfRemarks] = useState("");
  const [dnfSaving, setDnfSaving] = useState(false);
  const [showDnf, setShowDnf]     = useState(false);

  // Restore PIN from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem(`scan-pin-${deviceCode}`);
    if (stored) authenticate(stored);
  }, []); // eslint-disable-line

  async function authenticate(pinVal?: string) {
    const usePin = pinVal ?? pin;
    if (!usePin) return;
    setAuthing(true);
    setAuthError("");
    try {
      const res = await fetch(`/api/scan?deviceCode=${encodeURIComponent(deviceCode)}&devicePin=${encodeURIComponent(usePin)}`);
      if (!res.ok) {
        setAuthError("Invalid PIN or device not found.");
        sessionStorage.removeItem(`scan-pin-${deviceCode}`);
      } else {
        const info = await res.json();
        if (info.status !== "ACTIVE") {
          setAuthError("This device is inactive. Contact admin.");
        } else {
          setDevice(info);
          sessionStorage.setItem(`scan-pin-${deviceCode}`, usePin);
        }
      }
    } catch {
      setAuthError("Connection error. Try again.");
    } finally {
      setAuthing(false);
    }
  }

  const processQr = useCallback(async (code: string) => {
    if (!code.trim() || !device || scanning) return;
    setScanning(true);
    setResult(null);
    const storedPin = sessionStorage.getItem(`scan-pin-${deviceCode}`) ?? "";
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCode: code.trim(),
          deviceCode,
          devicePin: storedPin,
          launchLineNumber: device.assignedLocation === "FIFTH_FLOOR" ? launchLineNumber : undefined,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: "Network error. Please try again." });
    } finally {
      setScanning(false);
      setQrInput("");
      setTimeout(() => inputRef.current?.focus(), 100);
      setTimeout(() => setResult(null), 8000);
    }
  }, [device, scanning, deviceCode, launchLineNumber]);

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    scanLoopRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
    setCameraStarting(false);
    setTorchAvailable(false);
    setTorchOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!device || device.scanMode === "manual" || scanning) return;
    setCameraError("");
    setCameraStarting(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not available in this browser.");
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
            frameRate: { ideal: 30, max: 60 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack?.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean } | undefined;
      setTorchAvailable(Boolean(capabilities?.torch));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }
      setCameraActive(true);
      setCameraPrompt(false);
    } catch (error: any) {
      setCameraError(error?.message ? `Camera access failed: ${error.message}` : "Camera access failed. Allow camera permission, then press Start Camera.");
      setCameraPrompt(true);
    } finally {
      setCameraStarting(false);
    }
  }, [device, scanning]);

  const toggleTorch = useCallback(async () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;
    try {
      const nextValue = !torchOn;
      await videoTrack.applyConstraints({ advanced: [{ torch: nextValue } as MediaTrackConstraintSet] });
      setTorchOn(nextValue);
    } catch (error: any) {
      setCameraError(error?.message ? `Light could not be changed: ${error.message}` : "Light is not available on this device.");
      setTorchAvailable(false);
    }
  }, [torchOn]);

  const processImageFile = useCallback(async (file: File) => {
    const canvas = canvasRef.current;
    if (!canvas || scanning) return;
    setCameraError("");
    try {
      const rawValue = await decodeQrFromImageFile(file, canvas, detectorRef.current);
      if (!rawValue) {
        setCameraError("No QR code found in that image.");
        return;
      }
      await processQr(rawValue);
    } catch (error: any) {
      setCameraError(error?.message ? `Could not read image: ${error.message}` : "Could not read QR code from that image.");
    }
  }, [processQr, scanning]);

  useEffect(() => {
    if (!device || device.scanMode === "manual") {
      stopCamera();
      return;
    }
    setCameraPrompt(true);
    return stopCamera;
  }, [device, stopCamera]);

  useEffect(() => {
    if (!cameraActive || device?.scanMode === "manual" || !device) return;

    let cancelled = false;
    async function detect() {
      if (cancelled || scanning) {
        scanLoopRef.current = requestAnimationFrame(detect);
        return;
      }

      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        try {
          let rawValue = "";
          const canvas = canvasRef.current;
          if (canvas) rawValue = await decodeQrFromVideoFrame(video, canvas, detectorRef.current);
          if (rawValue && rawValue !== lastDetectedRef.current) {
            lastDetectedRef.current = rawValue;
            await processQr(rawValue);
            setTimeout(() => { lastDetectedRef.current = ""; }, 2500);
          }
        } catch (error: any) {
          setCameraError(error?.message ? `Camera scanner paused: ${error.message}` : "Camera scanner paused. Press Retry.");
        }
      }
      scanLoopRef.current = requestAnimationFrame(detect);
    }

    scanLoopRef.current = requestAnimationFrame(detect);
    return () => {
      cancelled = true;
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    };
  }, [cameraActive, device, scanning, processQr]);

  // Auto-submit when scanner sends \n or \r
  function handleQrKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") processQr(qrInput);
  }

  async function submitDnf() {
    if (!dnfReason || !dnfRemarks.trim()) return;
    setDnfSaving(true);
    const storedPin = sessionStorage.getItem(`scan-pin-${deviceCode}`) ?? "";
    try {
      const res = await fetch("/api/scan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: dnfQr.trim(), deviceCode, devicePin: storedPin, reason: dnfReason, remarks: dnfRemarks }),
      });
      const data = await res.json();
      setResult({ success: data.success, error: data.error, locationLabel: "Did Not Fly recorded" });
      setShowDnf(false);
      setDnfQr(""); setDnfReason(""); setDnfRemarks("");
      setTimeout(() => setResult(null), 8000);
    } finally {
      setDnfSaving(false);
    }
  }

  // ── PIN entry screen ──────────────────────────────────────────────────────
  if (!device) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-950">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Scan Station</h1>
            <p className="text-gray-400 text-sm mt-1 font-mono">{deviceCode}</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") authenticate(); }}
                placeholder="Enter device PIN"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
                maxLength={8}
                inputMode="numeric"
                autoFocus
              />
              <button
                onClick={() => setShowPin((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {authError && (
              <p className="text-red-400 text-sm text-center">{authError}</p>
            )}

            <button
              onClick={() => authenticate()}
              disabled={!pin || authing}
              className="w-full py-4 rounded-xl bg-amber-500 text-gray-900 font-bold text-lg disabled:opacity-40"
            >
              {authing ? "Verifying..." : "Unlock"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Active scan screen ────────────────────────────────────────────────────
  const location  = device.assignedLocation;
  const gradient  = LOCATION_COLORS[location] ?? "from-gray-700 to-gray-900";
  const isFifthFloor = location === "FIFTH_FLOOR";
  const showManualInput = device.scanMode === "manual";

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <div className={cn("bg-gradient-to-r px-6 py-4", gradient)}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-wider font-semibold">Scan Station</p>
            <h1 className="text-white text-xl font-bold">{LOCATION_LABELS[location] ?? location}</h1>
            <p className="text-white/60 text-xs font-mono mt-0.5">{device.deviceName}</p>
          </div>
          <Scan className="w-8 h-8 text-white/30" />
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-lg mx-auto w-full space-y-6">

        {/* Launch line selector (5th floor only) */}
        {isFifthFloor && (
          <div className="w-full rounded-2xl border border-red-500/40 bg-red-950/50 p-4 space-y-3">
            <p className="text-center text-sm font-semibold uppercase tracking-wider text-red-100">
              Select launch line before scanning
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map((line) => (
                <button
                  key={line}
                  type="button"
                  onClick={() => setLaunchLineNumber(line as 1 | 2)}
                  className={cn(
                    "rounded-2xl border-2 py-4 text-lg font-black transition-colors",
                    launchLineNumber === line
                      ? "border-amber-300 bg-amber-400 text-gray-950 shadow-[0_0_28px_rgba(245,166,35,0.35)]"
                      : "border-white/15 bg-white/5 text-white hover:bg-white/10"
                  )}
                >
                  Line {line}
                </button>
              ))}
            </div>
          </div>
        )}

        {showManualInput ? (
          <div className="w-full space-y-3">
            <label className="text-gray-400 text-sm font-medium block text-center">
              Manual/testing QR input
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyDown={handleQrKeyDown}
                placeholder="Enter or scan wristband QR..."
                autoFocus
                autoComplete="off"
                className="w-full bg-gray-800 border-2 border-gray-700 rounded-2xl px-5 py-5 text-white text-center text-lg font-mono tracking-widest focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <button
              onClick={() => processQr(qrInput)}
              disabled={!qrInput.trim() || scanning}
              className="w-full py-4 rounded-2xl bg-amber-500 text-gray-900 font-bold text-lg disabled:opacity-40 transition-opacity"
            >
              {scanning ? "Processing..." : "Scan"}
            </button>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div className="relative -mx-6 min-h-[calc(100dvh-13rem)] w-[calc(100%+3rem)] overflow-hidden rounded-none border border-white/10 bg-black shadow-2xl sm:-mx-0 sm:w-full sm:rounded-[2rem]">
              <QrScannerShell
                title="Scan QR Code"
                instruction={scanning ? "Processing wristband..." : cameraActive ? "Align the QR Code within the frame to scan" : cameraPrompt ? "Tap Start Camera to scan" : "Camera is not active"}
                videoRef={videoRef}
                canvasRef={canvasRef}
                starting={cameraStarting}
                processing={scanning}
                error={cameraError}
                lightAvailable={torchAvailable}
                lightOn={torchOn}
                onAlbumFile={processImageFile}
                onToggleLight={toggleTorch}
                className="min-h-[calc(100dvh-13rem)]"
              />
              {!cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-8">
                  <button
                    onClick={startCamera}
                    disabled={cameraStarting}
                    className="rounded-2xl bg-amber-500 px-6 py-4 text-base font-bold text-gray-950 shadow-lg disabled:opacity-60"
                  >
                    {cameraStarting ? "Starting camera..." : "Start Camera"}
                  </button>
                </div>
              )}
              {result && (
                <div className="absolute inset-x-3 bottom-16 z-20">
                  <ScanResultPanel result={result} compact />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Result */}
        {result && showManualInput && <ScanResultPanel result={result} />}

        {/* Did Not Fly button (5th floor only) */}
        {isFifthFloor && (
          <button
            onClick={() => setShowDnf(true)}
            className="w-full py-3 rounded-2xl border-2 border-orange-500/40 text-orange-300 font-semibold flex items-center justify-center gap-2 hover:bg-orange-500/10 transition-colors"
          >
            <AlertTriangle className="w-5 h-5" />
            Mark Rider as Did Not Fly
          </button>
        )}

        {/* Sign out */}
        <button
          onClick={() => { sessionStorage.removeItem(`scan-pin-${deviceCode}`); setDevice(null); setPin(""); }}
          className="text-gray-600 text-xs hover:text-gray-400 transition-colors"
        >
          Sign out of device
        </button>
      </div>

      {/* Did Not Fly modal */}
      {showDnf && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
          <div className="bg-gray-900 rounded-t-3xl border-t border-gray-700 w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
              <h2 className="text-white font-bold text-xl">Did Not Fly</h2>
            </div>
            <p className="text-gray-400 text-sm">This will mark the rider as Did Not Fly. This action requires a reason and mandatory remarks.</p>

            <div className="space-y-1.5">
              <label className="text-gray-300 text-sm font-medium">Rider Wristband QR *</label>
              <input
                type="text" value={dnfQr}
                onChange={(e) => setDnfQr(e.target.value)}
                placeholder="Scan or enter wristband QR..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-300 text-sm font-medium">Reason *</label>
              <select
                value={dnfReason}
                onChange={(e) => setDnfReason(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500"
              >
                <option value="">Select reason…</option>
                {DNF_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-300 text-sm font-medium">Remarks * (mandatory)</label>
              <textarea
                value={dnfRemarks}
                onChange={(e) => setDnfRemarks(e.target.value)}
                rows={3}
                placeholder="Describe what happened in detail..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDnf(false); setDnfQr(""); setDnfReason(""); setDnfRemarks(""); }}
                className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 font-medium"
              >Cancel</button>
              <button
                onClick={submitDnf}
                disabled={!dnfQr.trim() || !dnfReason || !dnfRemarks.trim() || dnfSaving}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold disabled:opacity-40"
              >
                {dnfSaving ? "Saving..." : "Confirm Did Not Fly"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
