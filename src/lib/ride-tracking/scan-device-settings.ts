export type ScanMode = "camera" | "manual";

export type ScanDeviceSettings = {
  scanMode: ScanMode;
  notes: string;
};

const PREFIX = "__zipline_scan_settings__:";

export function parseScanDeviceSettings(notes?: string | null): ScanDeviceSettings {
  const raw = notes ?? "";
  if (!raw.startsWith(PREFIX)) return { scanMode: "camera", notes: raw };

  const newlineIndex = raw.indexOf("\n");
  const encoded = raw.slice(PREFIX.length, newlineIndex === -1 ? undefined : newlineIndex);
  const displayNotes = newlineIndex === -1 ? "" : raw.slice(newlineIndex + 1);

  try {
    const parsed = JSON.parse(encoded) as Partial<ScanDeviceSettings>;
    return {
      scanMode: parsed.scanMode === "manual" ? "manual" : "camera",
      notes: displayNotes,
    };
  } catch {
    return { scanMode: "camera", notes: displayNotes };
  }
}

export function serializeScanDeviceSettings(input: Partial<ScanDeviceSettings>) {
  const scanMode = input.scanMode === "manual" ? "manual" : "camera";
  const notes = input.notes?.trim() ?? "";
  const encoded = JSON.stringify({ scanMode });
  return `${PREFIX}${encoded}${notes ? `\n${notes}` : ""}`;
}
