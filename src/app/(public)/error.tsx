"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PublicError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="min-h-screen bg-brand-deep flex flex-col items-center justify-center px-6 text-center pt-24 pb-20">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
        <span className="text-2xl">⚠️</span>
      </div>
      <h2 className="font-display font-bold text-2xl text-white mb-3">Something went wrong</h2>
      <p className="text-white/50 mb-8 max-w-sm">
        We hit an unexpected error on this page. Please try again.
      </p>
      <div className="flex gap-3">
        <button onClick={reset} className="btn-brand text-sm px-6 py-3">Try again</button>
        <Link href="/" className="btn-ghost-white text-sm px-6 py-3">Go home</Link>
      </div>
    </div>
  );
}
