export default function PublicLoading() {
  return (
    <div className="theme-contrast min-h-screen flex items-center justify-center bg-brand-deep relative overflow-hidden">
      <div className="absolute inset-0 bg-ocean-gradient opacity-75" />
      <div className="absolute inset-0 hero-video-overlay" />
      <div className="flex flex-col items-center gap-4">
        <img
          src="/images/zipline-logo-black.png"
          alt="Zipline Maldives"
          className="relative h-14 w-auto animate-float brightness-0 invert"
        />
        <div className="relative flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ backgroundColor: "var(--theme-primary, #FF7B2E)", opacity: 0.75, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
