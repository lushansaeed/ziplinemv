import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export const metadata: Metadata = { title: "Access Denied | Admin" };

export default function AccessDeniedPage({
  searchParams,
}: {
  searchParams: { module?: string; action?: string };
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="admin-card max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-bold">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to perform this action.
        </p>
        {searchParams.module && (
          <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            Requested: {searchParams.module}.{searchParams.action ?? "view"}
          </p>
        )}
        <Link
          href="/admin/dashboard"
          className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
