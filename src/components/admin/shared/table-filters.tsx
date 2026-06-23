"use client";

import { Search, X, Filter, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
}

interface TableFiltersProps {
  search:        string;
  onSearch:      (v: string) => void;
  searchPlaceholder?: string;
  filters?:      Array<{
    key:     string;
    label:   string;
    value:   string;
    options: FilterOption[];
    onChange:(v: string) => void;
  }>;
  dateFrom?:    string;
  dateTo?:      string;
  onDateFrom?:  (v: string) => void;
  onDateTo?:    (v: string) => void;
  onExport?:    () => void;
  onReset?:     () => void;
  totalShowing?: number;
  actions?:     React.ReactNode;
}

export function TableFilters({
  search, onSearch, searchPlaceholder = "Search…",
  filters = [], dateFrom, dateTo, onDateFrom, onDateTo,
  onExport, onReset, totalShowing, actions,
}: TableFiltersProps) {
  const hasActiveFilters = search || filters.some((f) => f.value) || dateFrom || dateTo;

  return (
    <div className="flex flex-col gap-3 p-4 border-b border-border bg-muted/20">
      {/* Top row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className={cn(
              "w-full pl-9 pr-4 py-2 text-sm rounded-lg",
              "bg-background border border-border",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              "placeholder:text-muted-foreground"
            )}
          />
          {search && (
            <button
              onClick={() => onSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date range */}
        {onDateFrom && onDateTo && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFrom(e.target.value)}
              className="text-sm rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateTo(e.target.value)}
              className="text-sm rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto">
          {hasActiveFilters && onReset && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 text-xs font-medium border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          )}
          {actions}
        </div>
      </div>

      {/* Filter selects */}
      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          {filters.map((f) => (
            <select
              key={f.key}
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              className={cn(
                "text-xs rounded-lg border bg-background px-3 py-1.5",
                "focus:outline-none focus:ring-2 focus:ring-ring",
                f.value ? "border-primary text-foreground" : "border-border text-muted-foreground"
              )}
            >
              <option value="">{f.label}: All</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ))}
          {totalShowing != null && (
            <span className="text-xs text-muted-foreground ml-1">{totalShowing} results</span>
          )}
        </div>
      )}
    </div>
  );
}
