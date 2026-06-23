import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Packages | Admin" };

export default async function PackagesPage() {
  await requireRole(ADMIN_AND_ABOVE as any);

  const packages = await prisma.package.findMany({
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { bookingsList: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Packages"
        description={`${packages.length} packages`}
        actions={
          <Link href="/admin/pricing" className="btn-brand text-sm px-4 py-2">
            Manage pricing →
          </Link>
        }
      />
      <div className="p-6 space-y-4">
        <div className="admin-card p-0 overflow-hidden">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Package</th>
                <th>Tourist price</th>
                <th>Local price</th>
                <th>Bookings</th>
                <th>Featured</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id} className="table-row-hover">
                  <td>
                    <p className="font-medium text-sm">{pkg.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{pkg.description}</p>
                  </td>
                  <td className="font-semibold text-sm">{formatCurrency(Number(pkg.touristPrice))}</td>
                  <td className="text-sm text-muted-foreground">
                    {pkg.localPrice ? formatCurrency(Number(pkg.localPrice)) : "—"}
                  </td>
                  <td className="text-sm">{pkg._count.bookingsList}</td>
                  <td>
                    {pkg.featured && (
                      <span className="status-badge bg-brand-citrus/10 text-brand-citrus text-xs">Featured</span>
                    )}
                  </td>
                  <td>
                    <span className={cn("status-badge text-xs",
                      pkg.active
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {pkg.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          To edit package prices go to{" "}
          <Link href="/admin/pricing" className="text-primary hover:underline">Price Engine</Link>.
        </p>
      </div>
    </div>
  );
}
