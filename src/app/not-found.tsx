import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-deep flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-8">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M3 17L12 3L21 17" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h1 className="font-display font-bold text-6xl text-white/20 mb-4">404</h1>
      <h2 className="font-display font-bold text-2xl text-white mb-3">Page not found</h2>
      <p className="text-white/50 text-lg mb-8 max-w-sm">
        Looks like this page flew away. Let's get you back on track.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/" className="btn-brand text-sm px-6 py-3">
          Back to home
        </Link>
        <Link href="/book" className="btn-ghost-white text-sm px-6 py-3">
          Book a ride
        </Link>
      </div>
    </div>
  );
}
