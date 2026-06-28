export default function PublicLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--public-bg, #F8FAF9)" }}>
      <div className="flex flex-col items-center gap-4">
        <img
          src="/images/zipline-logo-black.png"
          alt="Zipline Maldives"
          className="h-14 w-auto animate-float"
        />
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
