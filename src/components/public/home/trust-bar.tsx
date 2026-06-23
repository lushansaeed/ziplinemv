import { Shield, Clock, Weight, Users, Camera } from "lucide-react";

interface TrustBarProps {
  settings: Record<string, unknown>;
}

export function TrustBar({ settings }: TrustBarProps) {
  const items = [
    {
      icon: Shield,
      label: "Safety certified",
      value: "International standards",
      color: "text-brand-lime",
    },
    {
      icon: Clock,
      label: "Experience",
      value: `${settings.experience_duration_min ?? "45–60 secs"} flight`,
      color: "text-brand-citrus",
    },
    {
      icon: Weight,
      label: "Weight range",
      value: `${settings.min_rider_weight_kg ?? 35}–${settings.max_rider_weight_kg ?? 110} kg`,
      color: "text-brand-turquoise",
    },
    {
      icon: Users,
      label: "Minimum age",
      value: `${settings.min_rider_age ?? 6}+ years`,
      color: "text-brand-coral",
    },
    {
      icon: Camera,
      label: "Media add-ons",
      value: "Photo · 360° · Drone",
      color: "text-brand-mango",
    },
  ];

  return (
    <section className="bg-brand-deep border-y border-white/6">
      <div className="container-brand py-6">
        <div className="flex flex-wrap justify-center lg:justify-between gap-6 lg:gap-0">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <div>
                  <p className="text-white/40 text-[11px] uppercase tracking-wider font-medium">{item.label}</p>
                  <p className="text-white text-sm font-semibold">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
