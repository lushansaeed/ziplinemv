export default function PublicLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--public-bg, #F8FAF9)" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-gradient flex items-center justify-center animate-float">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3 17L12 3L21 17" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ backgroundColor: "var(--site-primary, #00A6B4)", opacity: 0.5, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
