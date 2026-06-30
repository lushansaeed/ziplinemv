const ODOO_URL = process.env.ODOO_URL?.replace(/\/+$/, "");
const ODOO_DB = process.env.ODOO_DB;
const ODOO_USERNAME = process.env.ODOO_USERNAME;
const ODOO_API_KEY = process.env.ODOO_API_KEY;

let cachedUid: number | null = null;

export function isOdooSyncEnabled() {
  return process.env.ODOO_SYNC_ENABLED === "true";
}

function assertOdooConfig() {
  if (!ODOO_URL || !ODOO_DB || !ODOO_USERNAME || !ODOO_API_KEY) {
    throw new Error("Odoo sync is enabled, but ODOO_URL, ODOO_DB, ODOO_USERNAME, or ODOO_API_KEY is missing.");
  }
}

async function jsonRpc<T>(
  service: "common" | "object",
  method: string,
  args: unknown[],
): Promise<T> {
  assertOdooConfig();

  const response = await fetch(`${ODOO_URL}/jsonrpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "zipline-booking-system",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: { service, method, args },
      id: Date.now(),
    }),
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok || data?.error) {
    const message = data?.error?.data?.message ?? data?.error?.message ?? text;
    throw new Error(`Odoo ${service}/${method} failed: ${message}`);
  }

  return data.result as T;
}

export async function odooAuthenticate() {
  if (cachedUid) return cachedUid;

  const uid = await jsonRpc<number | false>("common", "login", [
    ODOO_DB,
    ODOO_USERNAME,
    ODOO_API_KEY,
  ]);

  if (!uid) throw new Error("Odoo authentication failed.");
  cachedUid = uid;
  return uid;
}

export async function odooExecuteKw<T = unknown>(
  model: string,
  method: string,
  args: unknown[] = [],
  kwargs: Record<string, unknown> = {},
): Promise<T> {
  const uid = await odooAuthenticate();

  return jsonRpc<T>("object", "execute_kw", [
    ODOO_DB,
    uid,
    ODOO_API_KEY,
    model,
    method,
    args,
    kwargs,
  ]);
}
