"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

// Fires on page load when ?ref= or ?coupon= is in the URL.
// Persists attribution in sessionStorage for the booking flow.
export function AffiliateTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref    = searchParams.get("ref");
    const coupon = searchParams.get("coupon");

    if (!ref && !coupon) return;

    // Store in session for booking flow
    if (ref)    sessionStorage.setItem("aff_ref",    ref);
    if (coupon) sessionStorage.setItem("aff_coupon", coupon);

    // Record the click
    const sessionId = sessionStorage.getItem("aff_session") ?? (() => {
      const id = Math.random().toString(36).slice(2);
      sessionStorage.setItem("aff_session", id);
      return id;
    })();

    fetch("/api/affiliate/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: ref, coupon, sessionId }),
    }).catch(() => {/* silent */});
  }, [searchParams]);

  return null;
}
