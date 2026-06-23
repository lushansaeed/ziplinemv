export default function AdminLoading() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted rounded-lg" />
          <div className="h-4 w-64 bg-muted/60 rounded" />
        </div>
        <div className="h-9 w-28 bg-muted rounded-lg" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="admin-card space-y-3">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-8 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
      {/* Table skeleton */}
      <div className="admin-card p-0 overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="h-9 w-64 bg-muted rounded-lg" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/50 last:border-0">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted/70 rounded" />
            <div className="h-4 w-20 bg-muted/60 rounded" />
            <div className="h-6 w-16 bg-muted/50 rounded-full ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
