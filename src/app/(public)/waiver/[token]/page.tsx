import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WaiverStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { formatDate } from "@/lib/utils";
import { WaiverForm } from "@/components/waiver/waiver-form";

export const metadata: Metadata = { title: "Zipline Waiver" };

async function getWeightLimits() {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ["min_rider_weight_kg", "max_rider_weight_kg"] } },
    select: { key: true, value: true },
  });
  const value = (key: string, fallback: number) => {
    const parsed = Number(settings.find((setting) => setting.key === key)?.value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return { min: value("min_rider_weight_kg", 35), max: value("max_rider_weight_kg", 110) };
}

export default async function PublicWaiverPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: Record<string, string | undefined>;
}) {
  const [link, limits] = await Promise.all([
    prisma.bookingWaiverLink.findUnique({
      where: { token: params.token },
      include: {
        booking: {
          include: {
            agent: { select: { businessName: true } },
            slot: { select: { startTime: true, endTime: true } },
            waivers: { select: { status: true } },
          },
        },
      },
    }),
    getWeightLimits(),
  ]);

  if (!link) notFound();

  const completed = link.booking.waivers.filter((waiver) => waiver.status === WaiverStatus.SIGNED).length;
  const inactive = !link.isActive || Boolean(link.expiresAt && link.expiresAt < new Date());
  const full = completed >= link.maxSubmissions || completed >= link.booking.numRiders;

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12" style={{ backgroundColor: "var(--site-bg, #F8FAF9)", color: "var(--body, #263238)" }}>
      <div className="mx-auto max-w-2xl">
        <div className="site-card mb-5 rounded-2xl p-5">
          <p className="font-mono text-sm font-bold text-primary">{link.booking.reference}</p>
          <h1 className="mt-2 font-display text-3xl font-bold site-heading">Zipline waiver form</h1>
          <div className="mt-4 grid gap-2 text-sm site-text-muted sm:grid-cols-2">
            <p><span className="font-semibold site-heading">Agent:</span> {link.booking.agent?.businessName ?? "Zipline Maldives"}</p>
            <p><span className="font-semibold site-heading">Ride:</span> {formatDate(link.booking.bookingDate)} at {link.booking.slot.startTime}</p>
            <p><span className="font-semibold site-heading">Waivers:</span> {completed} of {link.maxSubmissions} completed</p>
            <p><span className="font-semibold site-heading">Riders:</span> {link.booking.numRiders}</p>
          </div>
          <p className="mt-4 text-xs site-text-muted">
            One phone or device may be used for multiple riders. Submit one waiver per rider; the link closes when all riders are complete.
          </p>
        </div>

        {inactive ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
            This waiver link is invalid, expired, or no longer active.
          </div>
        ) : full ? (
          <div className="site-card rounded-2xl p-5 text-sm">
            Waiver limit reached. All riders for this booking have already submitted the waiver form.
          </div>
        ) : (
          <div className="site-card rounded-2xl p-5">
            <WaiverForm token={params.token} minWeight={limits.min} maxWeight={limits.max} staffAssisted={searchParams.mode === "staff"} />
          </div>
        )}
      </div>
    </main>
  );
}
