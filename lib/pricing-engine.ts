import { Camera, Film, Waves, type LucideIcon } from "lucide-react";
import { getDb } from "@/lib/db";
import { defaultPricing, type RidePricingConfig } from "@/lib/pricing";

export type PricingAddOn = {
  id: string;
  label: string;
  price: number;
  currency: "USD" | "MVR";
  enabled: boolean;
  description: string;
};

export type PricingEngineConfig = {
  pricing: RidePricingConfig;
  addOns: PricingAddOn[];
};

const settingKeys = {
  pricing: "pricing_engine_default_prices",
  exchangeRate: "pricing_engine_exchange_rate",
  addOns: "pricing_engine_add_ons"
} as const;

export const defaultPricingAddOns: PricingAddOn[] = [
  { id: "photography", label: "Photography", price: 10, currency: "USD", enabled: true, description: "Edited guest photos." },
  { id: "video360", label: "360 Video", price: 10, currency: "USD", enabled: true, description: "360 action camera clip." },
  { id: "drone", label: "Drone Video", price: 30, currency: "USD", enabled: true, description: "Drone video package." }
];

export const addOnIconMap: Record<string, LucideIcon> = {
  photography: Camera,
  video360: Film,
  drone: Waves
};

export async function getPricingEngineConfig(): Promise<PricingEngineConfig> {
  const rows = await getDb().setting.findMany({ where: { key: { in: Object.values(settingKeys) } } });
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const pricingValue = values[settingKeys.pricing];
  const exchangeValue = values[settingKeys.exchangeRate];
  const addOnValue = values[settingKeys.addOns];

  return {
    pricing: {
      ...defaultPricing,
      ...(isRecord(pricingValue) ? pricingValue : {}),
      exchangeRateMvrPerUsd: positiveNumber(isRecord(exchangeValue) ? exchangeValue.rate : exchangeValue, defaultPricing.exchangeRateMvrPerUsd)
    },
    addOns: parseAddOns(addOnValue)
  };
}

export function enabledPricingAddOns(addOns: PricingAddOn[]) {
  return addOns.filter((item) => item.enabled);
}

export function addOnUnitUsd(addOn: PricingAddOn, exchangeRate: number) {
  return addOn.currency === "USD" ? addOn.price : addOn.price / exchangeRate;
}

export function addOnDisplayPrice(addOn: PricingAddOn, displayCurrency: string, exchangeRate: number) {
  if (displayCurrency === addOn.currency) return addOn.price;
  return displayCurrency === "MVR" ? addOn.price * exchangeRate : addOn.price / exchangeRate;
}

export async function saveDefaultPricingSettings(data: RidePricingConfig) {
  await upsertSetting(settingKeys.pricing, data);
}

export async function saveExchangeRateSetting(rate: number, effectiveFrom: string, isActive: boolean) {
  await upsertSetting(settingKeys.exchangeRate, { rate, effectiveFrom, isActive });
}

export async function saveAddOnSettings(addOns: PricingAddOn[]) {
  await upsertSetting(settingKeys.addOns, addOns);
}

async function upsertSetting(key: string, value: unknown) {
  await getDb().setting.upsert({
    where: { key },
    update: { value: value as never },
    create: { key, value: value as never }
  });
}

function parseAddOns(value: unknown): PricingAddOn[] {
  if (!Array.isArray(value)) return defaultPricingAddOns;
  const byId = new Map(defaultPricingAddOns.map((item) => [item.id, item]));
  return defaultPricingAddOns.map((fallback) => {
    const current = value.find((item) => isRecord(item) && item.id === fallback.id);
    if (!isRecord(current)) return fallback;
    return {
      id: fallback.id,
      label: typeof current.label === "string" && current.label ? current.label : fallback.label,
      price: positiveNumber(current.price, fallback.price),
      currency: current.currency === "MVR" ? "MVR" as const : "USD" as const,
      enabled: typeof current.enabled === "boolean" ? current.enabled : fallback.enabled,
      description: typeof current.description === "string" ? current.description : fallback.description
    };
  }).concat(
    value
      .filter((item) => isRecord(item) && typeof item.id === "string" && !byId.has(item.id))
      .map((item) => ({
        id: String(item.id),
        label: typeof item.label === "string" ? item.label : "Add-On",
        price: positiveNumber(item.price, 0),
        currency: item.currency === "MVR" ? "MVR" as const : "USD" as const,
        enabled: typeof item.enabled === "boolean" ? item.enabled : true,
        description: typeof item.description === "string" ? item.description : ""
      }))
  );
}

function positiveNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
