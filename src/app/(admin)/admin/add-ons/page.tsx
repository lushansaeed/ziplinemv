import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Add-ons | Admin" };

export default async function AddOnsPage() {
  await requireRole(ADMIN_AND_ABOVE as any);

  const addOns = await prisma.addOn.findMany({ orderBy: { displayOrder: "asc" } });

  return (
    <div>
      <PageHeader
        title="Add-ons"
        description={`${addOns.length} add-ons`}
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
                <th>Add-on</th>
                <th>Price</th>
                <th>Best for</th>
                <th>Order</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {addOns.map((addon) => (
                <tr key={addon.id} className="table-row-hover">
                  <td>
                    <p className="font-medium text-sm">{addon.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{addon.description}</p>
                  </td>
                  <td className="font-semibold text-sm">{formatCurrency(Number(addon.price))}</td>
                  <td className="text-sm text-muted-foreground">{addon.bestFor ?? "—"}</td>
                  <td className="text-sm">{addon.displayOrder}</td>
                  <td>
                    <span className={cn("status-badge text-xs",
                      addon.active
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {addon.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          To edit add-on prices go to{" "}
          <Link href="/admin/pricing" className="text-primary hover:underline">Price Engine</Link>.
        </p>
      </div>
    </div>
  );
}
