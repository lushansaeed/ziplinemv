/**
 * Core slot generation utility — Part 3 of the slot system spec.
 * Pure function, no DB access, fully testable.
 */

export interface GeneratedSlot {
  startTime: string;  // "09:00"
  endTime:   string;  // "09:30"
  label:     string;  // "09:00 to 09:30"
}

export interface GenerateSlotsInput {
  startTime:          string;   // "09:00"
  endTime:            string;   // "18:00"
  breakStartTime?:    string;   // "12:30" — optional
  breakEndTime?:      string;   // "13:30" — optional
  intervalMinutes:    number;   // 15 | 30 | 45 | 60
}

// Convert "HH:MM" to total minutes since midnight
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Convert total minutes back to "HH:MM"
function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatLabel(start: string, end: string): string {
  return `${start} to ${end}`;
}

export function generateSlots(input: GenerateSlotsInput): GeneratedSlot[] {
  const {
    startTime,
    endTime,
    breakStartTime,
    breakEndTime,
    intervalMinutes,
  } = input;

  // Validate interval
  if (![15, 30, 45, 60].includes(intervalMinutes)) {
    throw new Error(`intervalMinutes must be 15, 30, 45, or 60. Got: ${intervalMinutes}`);
  }

  const startMins   = toMinutes(startTime);
  const endMins     = toMinutes(endTime);
  const breakStart  = breakStartTime ? toMinutes(breakStartTime) : null;
  const breakEnd    = breakEndTime   ? toMinutes(breakEndTime)   : null;

  if (endMins <= startMins) {
    throw new Error(`End time (${endTime}) must be after start time (${startTime})`);
  }

  if (breakStart !== null && breakEnd !== null) {
    if (breakEnd <= breakStart) {
      throw new Error(`Break end (${breakEndTime}) must be after break start (${breakStartTime})`);
    }
  }

  const slots: GeneratedSlot[] = [];
  let cursor = startMins;

  while (cursor < endMins) {
    const slotEnd = cursor + intervalMinutes;

    // Don't generate a slot that ends after operating end time
    if (slotEnd > endMins) break;

    // Break overlap rule:
    // Exclude if: slot.startTime < breakEnd AND slot.endTime > breakStart
    const overlapsBreak =
      breakStart !== null &&
      breakEnd   !== null &&
      cursor  < breakEnd &&
      slotEnd > breakStart;

    if (!overlapsBreak) {
      const start = fromMinutes(cursor);
      const end   = fromMinutes(slotEnd);
      slots.push({ startTime: start, endTime: end, label: formatLabel(start, end) });
    }

    cursor += intervalMinutes;
  }

  return slots;
}

/** Count how many slots a template would generate */
export function countSlots(input: GenerateSlotsInput): number {
  try { return generateSlots(input).length; }
  catch { return 0; }
}

/** Validate template config — returns array of error strings */
export function validateSlotConfig(input: Partial<GenerateSlotsInput>): string[] {
  const errors: string[] = [];
  if (!input.startTime) errors.push("Start time is required");
  if (!input.endTime)   errors.push("End time is required");
  if (input.startTime && input.endTime && toMinutes(input.endTime) <= toMinutes(input.startTime)) {
    errors.push("End time must be after start time");
  }
  if (input.breakStartTime && input.breakEndTime) {
    if (toMinutes(input.breakEndTime) <= toMinutes(input.breakStartTime)) {
      errors.push("Break end must be after break start");
    }
  }
  if (input.intervalMinutes && ![15,30,45,60].includes(input.intervalMinutes)) {
    errors.push("Slot interval must be 15, 30, 45, or 60 minutes");
  }
  return errors;
}
