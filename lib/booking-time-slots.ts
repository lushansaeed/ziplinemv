import { BookingStatus, type PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";

export type BookingTimeSlotSettings = {
  startTime: string;
  endTime: string;
  slotDuration: 15 | 30 | 45 | 60;
  guestsPerSlot: number;
  breakEnabled: boolean;
  breakStartTime: string;
  breakEndTime: string;
};

export type BookingSlotOption = {
  label: string;
  value: string;
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
  available: number;
  isFull: boolean;
  disabled: boolean;
};

type DbLike = PrismaClient | Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
const bookingTimeZone = "Indian/Maldives";

const settingKeys = {
  startTime: "booking_start_time",
  endTime: "booking_end_time",
  slotDuration: "booking_slot_duration",
  guestsPerSlot: "booking_guests_per_slot",
  breakEnabled: "booking_break_enabled",
  breakStartTime: "booking_break_start_time",
  breakEndTime: "booking_break_end_time"
} as const;

const activeBookingStatuses = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.PAID,
  BookingStatus.CHECKED_IN,
  BookingStatus.COMPLETED
];

export const defaultBookingTimeSlotSettings: BookingTimeSlotSettings = {
  startTime: "09:00",
  endTime: "18:00",
  slotDuration: 30,
  guestsPerSlot: 10,
  breakEnabled: false,
  breakStartTime: "12:30",
  breakEndTime: "13:30"
};

export async function getBookingTimeSlotSettings(db: DbLike = getDb()): Promise<BookingTimeSlotSettings> {
  const rows = await db.setting.findMany({ where: { key: { in: Object.values(settingKeys) } } });
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return {
    startTime: stringValue(values.booking_start_time, defaultBookingTimeSlotSettings.startTime),
    endTime: stringValue(values.booking_end_time, defaultBookingTimeSlotSettings.endTime),
    slotDuration: durationValue(values.booking_slot_duration, defaultBookingTimeSlotSettings.slotDuration),
    guestsPerSlot: positiveIntValue(values.booking_guests_per_slot, defaultBookingTimeSlotSettings.guestsPerSlot),
    breakEnabled: booleanValue(values.booking_break_enabled, defaultBookingTimeSlotSettings.breakEnabled),
    breakStartTime: stringValue(values.booking_break_start_time, defaultBookingTimeSlotSettings.breakStartTime),
    breakEndTime: stringValue(values.booking_break_end_time, defaultBookingTimeSlotSettings.breakEndTime)
  };
}

export function validateBookingTimeSlotSettings(settings: BookingTimeSlotSettings) {
  const start = timeToMinutes(settings.startTime);
  const end = timeToMinutes(settings.endTime);
  const breakStart = timeToMinutes(settings.breakStartTime);
  const breakEnd = timeToMinutes(settings.breakEndTime);

  if (start === null) return "Start time is required.";
  if (end === null) return "End time is required.";
  if (start >= end) return "Start time must be earlier than end time.";
  if (![15, 30, 45, 60].includes(settings.slotDuration)) return "Slot duration is required.";
  if (!Number.isFinite(settings.guestsPerSlot) || settings.guestsPerSlot <= 0) return "Guests per slot must be greater than 0.";

  if (settings.breakEnabled) {
    if (breakStart === null) return "Break start time is required.";
    if (breakEnd === null) return "Break end time is required.";
    if (breakStart >= breakEnd) return "Break start time must be earlier than break end time.";
    if (breakStart < start || breakEnd > end) return "Break time must be within operating hours.";
  }

  return null;
}

export async function saveBookingTimeSlotSettings(settings: BookingTimeSlotSettings, db: DbLike = getDb()) {
  const error = validateBookingTimeSlotSettings(settings);
  if (error) throw new Error(error);

  await upsertSetting(db, settingKeys.startTime, settings.startTime);
  await upsertSetting(db, settingKeys.endTime, settings.endTime);
  await upsertSetting(db, settingKeys.slotDuration, settings.slotDuration);
  await upsertSetting(db, settingKeys.guestsPerSlot, settings.guestsPerSlot);
  await upsertSetting(db, settingKeys.breakEnabled, settings.breakEnabled);
  await upsertSetting(db, settingKeys.breakStartTime, settings.breakStartTime);
  await upsertSetting(db, settingKeys.breakEndTime, settings.breakEndTime);
}

export function generateBookingTimeSlots(settings: BookingTimeSlotSettings) {
  const error = validateBookingTimeSlotSettings(settings);
  if (error) return [];

  const start = timeToMinutes(settings.startTime)!;
  const end = timeToMinutes(settings.endTime)!;
  const breakStart = timeToMinutes(settings.breakStartTime);
  const breakEnd = timeToMinutes(settings.breakEndTime);
  const slots: Array<{ label: string; value: string; startTime: string; endTime: string; startMinutes: number; endMinutes: number; capacity: number }> = [];

  for (let cursor = start; cursor + settings.slotDuration <= end; cursor += settings.slotDuration) {
    const slotEnd = cursor + settings.slotDuration;
    const overlapsBreak = settings.breakEnabled && breakStart !== null && breakEnd !== null && cursor < breakEnd && slotEnd > breakStart;

    if (!overlapsBreak) {
      const startTime = minutesToTime(cursor);
      const endTime = minutesToTime(slotEnd);
      const label = `${startTime} - ${endTime}`;
      slots.push({ label, value: label, startTime, endTime, startMinutes: cursor, endMinutes: slotEnd, capacity: settings.guestsPerSlot });
    }
  }

  return slots;
}

export async function getBookingSlotOptions(date: string, requestedGuests = 1, db: DbLike = getDb()): Promise<BookingSlotOption[]> {
  const settings = await getBookingTimeSlotSettings(db);
  const slots = generateBookingTimeSlots(settings);
  const usage = await getBookedRiderCounts(date, db, slots);
  const pastDate = isPastBookingDate(date);

  return slots.map((slot) => {
    const booked = usage.get(slot.label) ?? 0;
    const available = Math.max(slot.capacity - booked, 0);
    const passed = pastDate || isPassedBookingSlot(date, slot.startMinutes);
    return {
      label: slot.label,
      value: slot.value,
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: slot.capacity,
      booked,
      available,
      isFull: available <= 0,
      disabled: passed || available <= 0 || requestedGuests > available
    };
  });
}

export async function ensureBookableTimeSlot(db: DbLike, date: string, label: string, riderCount: number) {
  if (isPastBookingDate(date)) {
    throw new Error("Past dates cannot be selected.");
  }

  const settings = await getBookingTimeSlotSettings(db);
  const slots = generateBookingTimeSlots(settings);
  const slot = slots.find((item) => item.label === label || item.startTime === label);

  if (!slot) {
    throw new Error("This time slot is not available.");
  }

  if (isPassedBookingSlot(date, slot.startMinutes)) {
    throw new Error("This time slot has already passed.");
  }

  const usage = await getBookedRiderCounts(date, db, slots);
  const booked = usage.get(slot.label) ?? 0;
  const available = Math.max(slot.capacity - booked, 0);

  if (riderCount > available) {
    throw new Error("Not enough capacity available for this time slot.");
  }

  const startsAt = dateTimeForSlot(date, slot.startTime);
  const existing = await db.timeSlot.findFirst({ where: { label: slot.label, startsAt } });

  if (existing) {
    if (!existing.isActive || existing.maxRiders !== slot.capacity) {
      return db.timeSlot.update({ where: { id: existing.id }, data: { isActive: true, maxRiders: slot.capacity } });
    }

    return existing;
  }

  return db.timeSlot.create({
    data: {
      label: slot.label,
      startsAt,
      maxRiders: slot.capacity,
      isActive: true
    }
  });
}

export function dateTimeForSlot(date: string, time: string) {
  return new Date(`${date}T${time}:00.000`);
}

export function todayBookingDate() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: bookingTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function isPastBookingDate(date: string) {
  return Boolean(date) && date < todayBookingDate();
}

function isPassedBookingSlot(date: string, slotStartMinutes: number) {
  if (date !== todayBookingDate()) return false;
  return slotStartMinutes <= currentBookingMinutes();
}

function currentBookingMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: bookingTimeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function timeToMinutes(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function minutesToTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

async function getBookedRiderCounts(
  date: string,
  db: DbLike,
  slots: Array<{ label: string; startMinutes: number; endMinutes: number }> = []
) {
  if (!date) return new Map<string, number>();

  const start = new Date(`${date}T00:00:00.000`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const bookings = await db.booking.findMany({
    where: {
      date: { gte: start, lt: end },
      bookingStatus: { in: activeBookingStatuses }
    },
    select: {
      date: true,
      riderCount: true,
      timeSlot: { select: { label: true } }
    }
  });

  return bookings.reduce((counts, booking) => {
    const minutes = booking.date.getHours() * 60 + booking.date.getMinutes();
    const generatedSlot = slots.find((slot) => slot.startMinutes === minutes);
    const label = generatedSlot?.label ?? booking.timeSlot.label;
    counts.set(label, (counts.get(label) ?? 0) + booking.riderCount);
    return counts;
  }, new Map<string, number>());
}

async function upsertSetting(db: DbLike, key: string, value: string | number | boolean) {
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value ? value : fallback;
}

function durationValue(value: unknown, fallback: BookingTimeSlotSettings["slotDuration"]) {
  const numeric = Number(value);
  return numeric === 15 || numeric === 30 || numeric === 45 || numeric === 60 ? numeric : fallback;
}

function positiveIntValue(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : fallback;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}
