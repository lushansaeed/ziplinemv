"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function RouteSection() {
  const ref   = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVis(true); },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="section-y bg-brand-deep">
      <div className="container-brand">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <div className={cn(
            "space-y-6 transition-all duration-700",
            vis ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
          )}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-citrus/10 border border-brand-citrus/20">
              <span className="text-brand-citrus text-xs font-semibold tracking-wider uppercase">The route</span>
            </div>
            <h2 className="font-display font-bold text-4xl lg:text-5xl text-white leading-[1.1]">
              The Maldives,<br />
              <span className="text-brand-citrus">from a whole</span><br />
              new angle.
            </h2>
            <p className="text-white/55 text-lg leading-relaxed">
              Launch from Maafushi Island and fly 428 metres across open ocean to Vahmāfushi —
              Maldives' first island-to-island zipline experience. Your return by speedboat is included.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              {[
                { label: "Distance",    value: "428 metres" },
                { label: "Flight time", value: "45–60 seconds" },
                { label: "Full journey",value: "15–30 minutes" },
                { label: "Return",      value: "Speedboat included" },
              ].map((s) => (
                <div key={s.label} className="bg-white/4 rounded-xl p-4 border border-white/6">
                  <p className="text-white/40 text-xs uppercase tracking-wider">{s.label}</p>
                  <p className="text-white font-semibold mt-1">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Animated route map */}
          <div className={cn(
            "transition-all duration-700 delay-200",
            vis ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
          )}>
            <div className="relative bg-gradient-to-br from-brand-ocean/10 via-brand-turquoise/5 to-transparent rounded-3xl p-8 border border-white/6 overflow-hidden">
              {/* Ocean background shimmer */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-950/40 via-cyan-950/20 to-transparent rounded-3xl" />

              <svg viewBox="0 0 400 220" className="w-full relative z-10" xmlns="http://www.w3.org/2000/svg">
                {/* Ocean waves */}
                {[0, 1, 2].map((i) => (
                  <ellipse key={i} cx={200} cy={110 + i * 30} rx={180 - i * 20} ry={8 - i} fill="none" stroke="#06B6D4" strokeWidth="0.5" opacity={0.1 + i * 0.05} />
                ))}

                {/* Maafushi island */}
                <ellipse cx="60" cy="165" rx="45" ry="22" fill="#1a3a2a" stroke="#22c55e" strokeWidth="1.5" />
                <text x="60" y="160" textAnchor="middle" fill="#4ade80" fontSize="9" fontFamily="system-ui" fontWeight="600">MAAFUSHI</text>
                <text x="60" y="172" textAnchor="middle" fill="#86efac" fontSize="7" fontFamily="system-ui" opacity="0.7">Start here</text>

                {/* Vahmāfushi island */}
                <ellipse cx="340" cy="75" rx="42" ry="20" fill="#1a2a3a" stroke="#F5A623" strokeWidth="1.5" />
                <text x="340" y="70" textAnchor="middle" fill="#F5A623" fontSize="9" fontFamily="system-ui" fontWeight="600">VAHMĀFUSHI</text>
                <text x="340" y="82" textAnchor="middle" fill="#fbbf24" fontSize="7" fontFamily="system-ui" opacity="0.7">Land here</text>

                {/* Zipline cable — animated */}
                <line
                  x1="103" y1="158" x2="300" y2="82"
                  stroke="#F5A623"
                  strokeWidth="2"
                  strokeDasharray={vis ? "0" : "400"}
                  strokeDashoffset={vis ? "0" : "400"}
                  style={{ transition: "stroke-dasharray 1.5s ease-in-out 0.5s, stroke-dashoffset 1.5s ease-in-out 0.5s" }}
                  opacity="0.7"
                />

                {/* Zipline glow */}
                <line x1="103" y1="158" x2="300" y2="82" stroke="#F5A623" strokeWidth="6" opacity="0.08" />

                {/* Distance label */}
                <text x="200" y="108" textAnchor="middle" fill="#F5A623" fontSize="10" fontFamily="system-ui" fontWeight="700" opacity={vis ? 1 : 0} style={{ transition: "opacity 0.5s ease 1.8s" }}>
                  428m
                </text>

                {/* Rider dot */}
                {vis && (
                  <circle r="5" fill="#F5A623">
                    <animateMotion dur="2.5s" repeatCount="indefinite" begin="1.5s">
                      <mpath xlinkHref="#zipline-path" />
                    </animateMotion>
                  </circle>
                )}
                <path id="zipline-path" d="M 103 158 L 300 82" fill="none" />

                {/* Ocean label */}
                <text x="200" y="190" textAnchor="middle" fill="#06B6D4" fontSize="9" fontFamily="system-ui" opacity="0.5" fontStyle="italic">South Malé Atoll</text>

                {/* Speed boat return arrow */}
                <path d="M 290 90 Q 200 200 110 165" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
                <text x="195" y="178" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="system-ui" opacity="0.5">← speedboat return</text>
              </svg>

              <p className="text-center text-white/30 text-xs mt-4 relative z-10">
                Maafushi → Vahmāfushi · 428m · ~45–60 seconds
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
