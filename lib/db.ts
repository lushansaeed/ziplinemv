import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function getDb() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      datasourceUrl: withServerlessConnectionLimit(process.env.DATABASE_URL)
    });
  }

  return globalForPrisma.prisma;
}

function withServerlessConnectionLimit(url: string | undefined) {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set("connection_limit", parsed.searchParams.get("connection_limit") ?? "1");
    parsed.searchParams.set("pool_timeout", parsed.searchParams.get("pool_timeout") ?? "20");
    return parsed.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}connection_limit=1&pool_timeout=20`;
  }
}
