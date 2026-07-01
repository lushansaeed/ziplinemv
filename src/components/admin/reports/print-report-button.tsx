"use client";

import { FileDown } from "lucide-react";

export function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-secondary px-4 py-2 text-sm"
    >
      <FileDown className="h-4 w-4" />
      Download PDF
    </button>
  );
}
