"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FlaskConical, Gift, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { createComplimentaryTestCustomer, createMediaEmailTestBookings, createTestBooking } from "@/lib/admin/booking-actions";

export function TestBookingButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function runCreate(action: "test" | "complimentary") {
    startTransition(async () => {
      const result = action === "complimentary"
        ? await createComplimentaryTestCustomer()
        : await createTestBooking();
      if (!result.success) {
        toast.error(result.error ?? "Could not create test booking.");
        return;
      }
      toast.success(
        action === "complimentary"
          ? `Complimentary test customer created: ${result.reference}`
          : `Test booking created: ${result.reference}`,
      );
      router.refresh();
    });
  }

  function runMediaEmailTest() {
    startTransition(async () => {
      const result = await createMediaEmailTestBookings();
      if (!result.success) {
        toast.error(result.error ?? "Could not send media email tests.");
        return;
      }
      const sent = result.results.filter((item) => item.success);
      const failed = result.results.filter((item) => !item.success);
      toast.success(`Media test emails sent: ${sent.length}${failed.length ? `, failed: ${failed.length}` : ""}`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => runCreate("test")}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
        Create test booking
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => runCreate("complimentary")}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
        Complimentary test
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={runMediaEmailTest}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
        Media email test
      </button>
    </div>
  );
}
