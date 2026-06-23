"use client";

import { useState } from "react";
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key:        string;
  header:     string;
  cell:       (row: T) => React.ReactNode;
  sortable?:  boolean;
  className?: string;
  hide?:      "sm" | "md" | "lg"; // hide on smaller screens
}

interface DataTableProps<T> {
  columns:    Column<T>[];
  data:       T[];
  keyField:   keyof T;
  total:      number;
  page:       number;
  perPage:    number;
  onPage:     (p: number) => void;
  sortKey?:   string;
  sortDir?:   "asc" | "desc";
  onSort?:    (key: string) => void;
  loading?:   boolean;
  emptyText?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns, data, keyField, total, page, perPage, onPage,
  sortKey, sortDir, onSort, loading, emptyText = "No records found.",
  onRowClick,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(total / perPage);
  const from       = (page - 1) * perPage + 1;
  const to         = Math.min(page * perPage, total);

  function SortIcon({ col }: { col: Column<T> }) {
    if (!col.sortable) return null;
    if (sortKey !== col.key) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-30" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3.5 h-3.5 text-brand-citrus" />
      : <ChevronDown className="w-3.5 h-3.5 text-brand-citrus" />;
  }

  return (
    <div>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="admin-table w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    col.hide === "sm" && "hidden sm:table-cell",
                    col.hide === "md" && "hidden md:table-cell",
                    col.hide === "lg" && "hidden lg:table-cell",
                    col.className
                  )}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => onSort?.(col.key)}
                      className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                    >
                      {col.header}
                      <SortIcon col={col} />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: perPage }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className={cn(
                      col.hide === "sm" && "hidden sm:table-cell",
                      col.hide === "md" && "hidden md:table-cell",
                    )}>
                      <div className="h-4 bg-muted/50 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-14 text-muted-foreground text-sm">
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={String(row[keyField])}
                  onClick={() => onRowClick?.(row)}
                  className={cn("table-row-hover", onRowClick && "cursor-pointer")}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        col.hide === "sm" && "hidden sm:table-cell",
                        col.hide === "md" && "hidden md:table-cell",
                        col.hide === "lg" && "hidden lg:table-cell",
                        col.className
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground">
          <span>
            Showing {from}–{to} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPage(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-medium">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPage(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
