"use client";

import { useState } from "react";
import {
  deleteAgentRate,
  deletePricingRule,
  saveAgentRate,
  saveAgentRateMatrix,
  saveBookingTimeSlotSettingsAction,
  savePricingEngineAddOns,
  savePricingEngineDefaults,
  savePricingEngineExchangeRate,
  savePricingRule
} from "@/lib/admin/actions";
import type { BookingTimeSlotSettings } from "@/lib/booking-time-slots";
import type { RidePricingConfig } from "@/lib/pricing";
import type { PricingAddOn } from "@/lib/pricing-engine";

type PricingTab = "defaults" | "seasonal" | "offers" | "groups" | "agents" | "exchange" | "addons" | "capacity";
type PricingRuleRow = {
  id: string;
  name: string;
  audience: string;
  adultPrice: string;
  childPrice: string;
  currency: string;
  validFrom: string;
  validTo: string;
  minGroup: number | "";
  isActive: boolean;
};
type AgentRow = {
  id: string;
  agencyName: string;
  email: string;
  commissionPercent: string;
  rates: Array<{ id: string; name: string; price: string; currency: string; validFrom: string; validTo: string }>;
};

const tabs: Array<{ id: PricingTab; label: string }> = [
  { id: "defaults", label: "Default Prices" },
  { id: "seasonal", label: "Seasonal Rates" },
  { id: "offers", label: "Offers" },
  { id: "groups", label: "Group Rates" },
  { id: "agents", label: "Agent Rates" },
  { id: "exchange", label: "Exchange Rate" },
  { id: "addons", label: "Add-Ons" },
  { id: "capacity", label: "Slot Capacity" }
];

export function AdminPricingEngineWorkspace({
  pricing,
  addOns,
  slotSettings,
  rules,
  agents
}: {
  pricing: RidePricingConfig;
  addOns: PricingAddOn[];
  slotSettings: BookingTimeSlotSettings;
  rules: PricingRuleRow[];
  agents: AgentRow[];
}) {
  const [activeTab, setActiveTab] = useState<PricingTab>("defaults");
  const seasonal = rules.filter((rule) => rule.audience.startsWith("seasonal"));
  const offers = rules.filter((rule) => rule.audience.startsWith("offer"));
  const groups = rules.filter((rule) => rule.audience.startsWith("group") || rule.minGroup);

  return (
    <div className="grid gap-6">
      <div className="flex gap-2 overflow-x-auto rounded-3xl bg-white/75 p-2 shadow-sm">
        {tabs.map((tab) => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-black transition ${activeTab === tab.id ? "bg-ocean-950 text-white shadow-glow" : "text-ocean-950/60 hover:bg-white"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "defaults" ? <DefaultPricesTab pricing={pricing} /> : null}
      {activeTab === "seasonal" ? <RuleTab title="Seasonal Rates" kind="seasonal" rules={seasonal} /> : null}
      {activeTab === "offers" ? <OffersTab rules={offers} /> : null}
      {activeTab === "groups" ? <RuleTab title="Group Rates" kind="group" rules={groups} /> : null}
      {activeTab === "agents" ? <AgentRatesTab agents={agents} /> : null}
      {activeTab === "exchange" ? <ExchangeRateTab pricing={pricing} /> : null}
      {activeTab === "addons" ? <AddOnsTab addOns={addOns} /> : null}
      {activeTab === "capacity" ? <SlotCapacityTab settings={slotSettings} /> : null}
    </div>
  );
}

function DefaultPricesTab({ pricing }: { pricing: RidePricingConfig }) {
  return (
    <Card title="Default Prices">
      <form action={savePricingEngineDefaults} className="grid gap-4 md:grid-cols-3">
        <Field name="touristAdultUsd" label="Tourist Adult Price" type="number" step="0.01" defaultValue={pricing.touristAdultUsd} />
        <Field name="touristChildUsd" label="Tourist Kid Price" type="number" step="0.01" defaultValue={pricing.touristChildUsd} />
        <Field name="localAdultMvr" label="Local Adult Price" type="number" step="0.01" defaultValue={pricing.localAdultMvr} />
        <Field name="localChildMvr" label="Local Kid Price" type="number" step="0.01" defaultValue={pricing.localChildMvr} />
        <Field name="maafushiAdultMvr" label="Maafushi Resident Price" type="number" step="0.01" defaultValue={pricing.maafushiAdultMvr} />
        <Field name="maafushiChildMvr" label="Maafushi Kids Price" type="number" step="0.01" defaultValue={pricing.maafushiChildMvr} />
        <Select name="defaultCurrency" label="Default Currency" defaultValue={pricing.defaultCurrency} options={["USD", "MVR"]} />
        <Field name="exchangeRateMvrPerUsd" label="USD To MVR Rate" type="number" step="0.01" defaultValue={pricing.exchangeRateMvrPerUsd} />
        <Field name="affiliateDiscountPercent" label="Coupon Discount %" type="number" step="0.01" defaultValue={pricing.affiliateDiscountPercent} />
        <button className="rounded-full bg-ocean-950 px-5 py-3 text-sm font-black text-white md:col-span-3">Save Default Prices</button>
      </form>
    </Card>
  );
}

function RuleTab({ title, kind, rules }: { title: string; kind: "seasonal" | "group"; rules: PricingRuleRow[] }) {
  return (
    <Card title={title}>
      <PricingRuleForm kind={kind} />
      <RuleList rules={rules} kind={kind} />
    </Card>
  );
}

function OffersTab({ rules }: { rules: PricingRuleRow[] }) {
  return (
    <Card title="Offers">
      <PricingRuleForm kind="offer" />
      <RuleList rules={rules} kind="offer" />
    </Card>
  );
}

function PricingRuleForm({ kind, rule }: { kind: "seasonal" | "offer" | "group"; rule?: PricingRuleRow }) {
  const audienceDefault = kind === "seasonal" ? "seasonal:both" : kind === "offer" ? "offer:both" : "group:both";
  return (
    <form action={savePricingRule} className="grid gap-4 rounded-2xl bg-ocean-50/55 p-4 md:grid-cols-4">
      {rule ? <input type="hidden" name="id" value={rule.id} /> : null}
      <Field name="name" label={kind === "offer" ? "Offer Name" : kind === "group" ? "Group Rate Name" : "Season Name"} defaultValue={rule?.name ?? ""} required />
      <input type="hidden" name="audience" value={rule?.audience ?? audienceDefault} />
      <Field name="adultPrice" label="Adult Price" type="number" step="0.01" defaultValue={rule?.adultPrice ?? ""} required />
      <Field name="childPrice" label="Kid Price" type="number" step="0.01" defaultValue={rule?.childPrice ?? ""} required />
      <Select name="currency" label="Currency" defaultValue={rule?.currency ?? "USD"} options={["USD", "MVR"]} />
      {kind === "group" ? <Field name="minGroup" label="Minimum Guests" type="number" defaultValue={rule?.minGroup ?? ""} /> : <Field name="minGroup" label="Minimum Guests" type="number" defaultValue={rule?.minGroup ?? ""} />}
      <Field name="validFrom" label="Start Date" type="date" defaultValue={rule?.validFrom ?? ""} />
      <Field name="validTo" label="End Date" type="date" defaultValue={rule?.validTo ?? ""} />
      <label className="flex items-center gap-2 text-sm font-black text-ocean-950">
        <input name="isActive" type="checkbox" defaultChecked={rule?.isActive ?? true} /> Active
      </label>
      <button className="rounded-full bg-ocean-950 px-5 py-3 text-sm font-black text-white md:col-span-4">{rule ? "Save" : "Add New"}</button>
    </form>
  );
}

function RuleList({ rules, kind }: { rules: PricingRuleRow[]; kind: "seasonal" | "offer" | "group" }) {
  return (
    <div className="mt-6 grid gap-4">
      {rules.map((rule) => (
        <div key={rule.id} className="grid gap-3 rounded-2xl border border-ocean-950/10 p-4">
          <PricingRuleForm kind={kind} rule={rule} />
          <form action={deletePricingRule}>
            <input type="hidden" name="id" value={rule.id} />
            <button className="text-sm font-black text-red-600">Delete {rule.name}</button>
          </form>
        </div>
      ))}
      {!rules.length ? <Empty title="No Records Yet." /> : null}
    </div>
  );
}

function AgentRatesTab({ agents }: { agents: AgentRow[] }) {
  return (
    <Card title="Agent Rates">
      <div className="grid gap-5">
        {agents.map((agent) => (
          <section key={agent.id} className="rounded-2xl border border-ocean-950/10 p-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-black text-ocean-950">{agent.agencyName}</h3>
                <p className="text-xs font-bold text-ocean-950/45">{agent.email}</p>
              </div>
              <p className="text-sm font-black text-ocean-950">{agent.commissionPercent}% Commission</p>
            </div>
            <div className="mt-4 grid gap-3">
              <AgentRateMatrixForm agent={agent} />
              {agent.rates.map((rate) => (
                <div key={rate.id} className="grid gap-3 rounded-2xl bg-ocean-50/55 p-3">
                  <AgentRateForm agent={agent} rate={rate} />
                  <form action={deleteAgentRate}>
                    <input type="hidden" name="id" value={rate.id} />
                    <button className="text-sm font-black text-red-600">Delete {rate.name}</button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Card>
  );
}

function AgentRateMatrixForm({ agent }: { agent: AgentRow }) {
  const values = Object.fromEntries(agent.rates.map((rate) => [rate.name, rate.price]));
  return (
    <form action={saveAgentRateMatrix} className="grid gap-3 rounded-2xl bg-ocean-50/55 p-4 md:grid-cols-3">
      <input type="hidden" name="agentId" value={agent.id} />
      <Field name="touristAdultAgentRate" label="Tourist Adult Agent Rate, USD" type="number" step="0.01" defaultValue={values["Tourist Adult Agent Rate"] ?? ""} />
      <Field name="touristKidAgentRate" label="Tourist Kid Agent Rate, USD" type="number" step="0.01" defaultValue={values["Tourist Kid Agent Rate"] ?? ""} />
      <Field name="localAdultAgentRate" label="Local Adult Agent Rate, MVR" type="number" step="0.01" defaultValue={values["Local Adult Agent Rate"] ?? ""} />
      <Field name="localKidAgentRate" label="Local Kid Agent Rate, MVR" type="number" step="0.01" defaultValue={values["Local Kid Agent Rate"] ?? ""} />
      <Field name="maafushiResidentAgentRate" label="Maafushi Resident Agent Rate, MVR" type="number" step="0.01" defaultValue={values["Maafushi Resident Agent Rate"] ?? ""} />
      <Field name="maafushiKidAgentRate" label="Maafushi Kid Agent Rate, MVR" type="number" step="0.01" defaultValue={values["Maafushi Kid Agent Rate"] ?? ""} />
      <Field name="commissionPercent" label="Commission Percentage" type="number" step="0.01" defaultValue={agent.commissionPercent} />
      <label className="flex items-center gap-2 self-end text-sm font-black text-ocean-950">
        <input name="isActive" type="checkbox" defaultChecked /> Active
      </label>
      <button className="rounded-full bg-ocean-950 px-4 py-3 text-sm font-black text-white md:col-span-3">Save Agent Rates</button>
    </form>
  );
}

function AgentRateForm({ agent, rate }: { agent: AgentRow; rate?: AgentRow["rates"][number] }) {
  return (
    <form action={saveAgentRate} className="grid gap-3 md:grid-cols-6">
      <input type="hidden" name="agentId" value={agent.id} />
      {rate ? <input type="hidden" name="id" value={rate.id} /> : null}
      <Field name="name" label="Rate Name" defaultValue={rate?.name ?? "Agent Rate"} />
      <Field name="price" label="Agent Rate" type="number" step="0.01" defaultValue={rate?.price ?? ""} required />
      <Select name="currency" label="Currency" defaultValue={rate?.currency ?? "USD"} options={["USD", "MVR"]} />
      <Field name="commissionPercent" label="Commission %" type="number" step="0.01" defaultValue={agent.commissionPercent} />
      <Field name="validFrom" label="Valid From" type="date" defaultValue={rate?.validFrom ?? ""} />
      <Field name="validTo" label="Valid To" type="date" defaultValue={rate?.validTo ?? ""} />
      <button className="rounded-full bg-ocean-950 px-4 py-3 text-sm font-black text-white md:col-span-6">{rate ? "Save Rate" : "Add New Rate"}</button>
    </form>
  );
}

function ExchangeRateTab({ pricing }: { pricing: RidePricingConfig }) {
  return (
    <Card title="Exchange Rate">
      <form action={savePricingEngineExchangeRate} className="grid gap-4 md:grid-cols-3">
        <Field name="exchangeRateMvrPerUsd" label="USD To MVR Rate" type="number" step="0.01" defaultValue={pricing.exchangeRateMvrPerUsd} />
        <Field name="effectiveFrom" label="Effective From Date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        <label className="flex items-center gap-2 self-end text-sm font-black text-ocean-950">
          <input name="isActive" type="checkbox" defaultChecked /> Active
        </label>
        <button className="rounded-full bg-ocean-950 px-5 py-3 text-sm font-black text-white md:col-span-3">Save Exchange Rate</button>
      </form>
    </Card>
  );
}

function AddOnsTab({ addOns }: { addOns: PricingAddOn[] }) {
  const [items, setItems] = useState(addOns);
  const addNew = () => setItems((current) => [...current, { id: `addon_${Date.now()}`, label: "", price: 0, currency: "USD", enabled: true, description: "" }]);
  return (
    <Card title="Add-Ons">
      <form action={savePricingEngineAddOns} className="grid gap-4">
        <div className="flex justify-end">
          <button type="button" onClick={addNew} className="rounded-full bg-ocean-50 px-5 py-3 text-sm font-black text-ocean-950">Add New Add-On</button>
        </div>
        {items.map((item) => (
          <section key={item.id} className="grid gap-3 rounded-2xl bg-ocean-50/55 p-4 md:grid-cols-5">
            <input type="hidden" name="addonId" value={item.id} />
            <Field name={`${item.id}_label`} label="Add-On Name" defaultValue={item.label} />
            <Field name={`${item.id}_price`} label="Price" type="number" step="0.01" defaultValue={item.price} />
            <Select name={`${item.id}_currency`} label="Currency" defaultValue={item.currency} options={["USD", "MVR"]} />
            <Field name={`${item.id}_description`} label="Description" defaultValue={item.description} />
            <label className="flex items-center gap-2 self-end text-sm font-black text-ocean-950">
              <input name={`${item.id}_enabled`} type="checkbox" defaultChecked={item.enabled} /> Enabled
            </label>
          </section>
        ))}
        <button className="rounded-full bg-ocean-950 px-5 py-3 text-sm font-black text-white">Save Add-Ons</button>
      </form>
    </Card>
  );
}

function SlotCapacityTab({ settings }: { settings: BookingTimeSlotSettings }) {
  return (
    <Card title="Slot Capacity">
      <form action={saveBookingTimeSlotSettingsAction} className="grid gap-4 md:grid-cols-3">
        <input type="hidden" name="redirectPath" value="/admin/pricing" />
        <Field name="startTime" label="Start Time" type="time" defaultValue={settings.startTime} required />
        <Field name="endTime" label="End Time" type="time" defaultValue={settings.endTime} required />
        <Select name="slotDuration" label="Slot Duration" defaultValue={String(settings.slotDuration)} options={["15", "30", "45", "60"]} />
        <Field name="guestsPerSlot" label="Guests Per Slot" type="number" min="1" defaultValue={settings.guestsPerSlot} required />
        <label className="flex items-center gap-2 self-end text-sm font-black text-ocean-950">
          <input name="breakEnabled" type="checkbox" defaultChecked={settings.breakEnabled} /> Enable Break Time
        </label>
        <div />
        <Field name="breakStartTime" label="Break Start Time" type="time" defaultValue={settings.breakStartTime} />
        <Field name="breakEndTime" label="Break End Time" type="time" defaultValue={settings.breakEndTime} />
        <button className="rounded-full bg-ocean-950 px-5 py-3 text-sm font-black text-white md:col-span-3">Save Slot Capacity</button>
      </form>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-[0_18px_60px_rgba(8,51,68,0.08)] md:p-7">
      <h2 className="text-2xl font-black text-ocean-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-black text-ocean-950">
      {label}
      <input {...props} className="h-12 min-w-0 rounded-2xl border border-ocean-950/10 bg-white px-4 text-sm font-semibold outline-none focus:border-ocean-500 focus:ring-4 focus:ring-ocean-500/10" />
    </label>
  );
}

function Select({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: string[] }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-black text-ocean-950">
      {label}
      <select {...props} className="h-12 min-w-0 rounded-2xl border border-ocean-950/10 bg-white px-4 text-sm font-semibold outline-none focus:border-ocean-500 focus:ring-4 focus:ring-ocean-500/10">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Empty({ title }: { title: string }) {
  return <p className="rounded-2xl border border-dashed border-ocean-950/15 bg-white/55 p-8 text-center font-black text-ocean-950">{title}</p>;
}
