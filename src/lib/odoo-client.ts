const ODOO_URL = process.env.ODOO_URL?.replace(/\/+$/, "");
const ODOO_DB = process.env.ODOO_DB;
const ODOO_API_KEY = process.env.ODOO_API_KEY;

export function isOdooSyncEnabled() {
  return process.env.ODOO_SYNC_ENABLED === "true";
}

function assertOdooConfig() {
  if (!ODOO_URL || !ODOO_DB || !ODOO_API_KEY) {
    throw new Error("Odoo sync is enabled, but ODOO_URL, ODOO_DB, or ODOO_API_KEY is missing.");
  }
}

function safeErrorText(text: string) {
  return text.replaceAll(ODOO_API_KEY ?? "__never_match__", "[redacted]");
}

function normalizeOdooError(status: number, body: unknown, raw: string) {
  if (body && typeof body === "object") {
    const data = body as any;
    const message =
      data.message ??
      data.error?.message ??
      data.error?.data?.message ??
      data.error?.data?.debug ??
      data.error ??
      raw;
    return `Odoo JSON-2 request failed (${status}): ${typeof message === "string" ? safeErrorText(message) : JSON.stringify(message)}`;
  }
  return `Odoo JSON-2 request failed (${status}): ${safeErrorText(raw)}`;
}

export async function callOdoo<T = unknown>(
  model: string,
  method: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  assertOdooConfig();

  const url = `${ODOO_URL}/json/2/${model}/${method}`;
  console.info("[odoo] json-2 request", {
    url,
    database: ODOO_DB,
    model,
    method,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `bearer ${ODOO_API_KEY}`,
      "X-Odoo-Database": ODOO_DB!,
      "Content-Type": "application/json",
      "User-Agent": "zipline-booking-system",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = normalizeOdooError(response.status, data, text);
    console.error("[odoo] json-2 error", {
      url,
      database: ODOO_DB,
      model,
      method,
      status: response.status,
      error,
    });
    throw new Error(error);
  }

  return data as T;
}

export async function searchRead<T = unknown>(
  model: string,
  domain: unknown[] = [],
  fields: string[] = ["id"],
  limit = 1,
) {
  return callOdoo<T[]>(model, "search_read", { domain, fields, limit });
}

export async function create<T = unknown>(model: string, values: Record<string, unknown>) {
  return callOdoo<T>(model, "create", { vals_list: values });
}

export async function update<T = unknown>(model: string, ids: number[], values: Record<string, unknown>) {
  return callOdoo<T>(model, "write", { ids, vals: values });
}

export async function action<T = unknown>(
  model: string,
  method: string,
  ids: number[],
  extraBody: Record<string, unknown> = {},
) {
  return callOdoo<T>(model, method, { ids, ...extraBody });
}

export async function testOdooConnection() {
  return searchRead("res.partner", [], ["id", "name"], 1);
}
