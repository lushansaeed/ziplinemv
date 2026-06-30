"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createTestBooking } from "@/lib/admin/booking-actions";

export function TestBookingButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await createTestBooking();
          if (!result.success) {
            toast.error(result.error ?? "Could not create test booking.");
            return;
          }
          toast.success(`Test booking created: ${result.reference}`);
          router.refresh();
        });
      }}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
      Create test booking
    </button>
  );
}
