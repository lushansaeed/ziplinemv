import { XMLParser } from "fast-xml-parser";

const ODOO_URL = process.env.ODOO_URL?.replace(/\/+$/, "");
const ODOO_DB = process.env.ODOO_DB;
const ODOO_USERNAME = process.env.ODOO_USERNAME;
const ODOO_API_KEY = process.env.ODOO_API_KEY;

let cachedUid: number | null = null;

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: false,
});

export function isOdooSyncEnabled() {
  return process.env.ODOO_SYNC_ENABLED === "true";
}

function assertOdooConfig() {
  if (!ODOO_URL || !ODOO_DB || !ODOO_USERNAME || !ODOO_API_KEY) {
    throw new Error("Odoo sync is enabled, but ODOO_URL, ODOO_DB, ODOO_USERNAME, or ODOO_API_KEY is missing.");
  }
}

function endpoint(service: "common" | "object") {
  assertOdooConfig();
  return `${ODOO_URL}/xmlrpc/2/${service}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xmlValue(value: unknown): string {
  if (value === null || value === undefined) return "<value><nil/></value>";
  if (typeof value === "boolean") return `<value><boolean>${value ? 1 : 0}</boolean></value>`;
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? `<value><int>${value}</int></value>`
      : `<value><double>${value}</double></value>`;
  }
  if (typeof value === "string") return `<value><string>${escapeXml(value)}</string></value>`;
  if (value instanceof Date) return `<value><dateTime.iso8601>${value.toISOString()}</dateTime.iso8601></value>`;
  if (Array.isArray(value)) {
    return `<value><array><data>${value.map(xmlValue).join("")}</data></array></value>`;
  }
  if (typeof value === "object") {
    const members = Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `<member><name>${escapeXml(key)}</name>${xmlValue(entry)}</member>`)
      .join("");
    return `<value><struct>${members}</struct></value>`;
  }
  return `<value><string>${escapeXml(String(value))}</string></value>`;
}

function methodCall(methodName: string, params: unknown[]) {
  return `<?xml version="1.0"?>
<methodCall>
  <methodName>${escapeXml(methodName)}</methodName>
  <params>${params.map((param) => `<param>${xmlValue(param)}</param>`).join("")}</params>
</methodCall>`;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function parseScalar(value: any) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if ("string" in value) return value.string ?? "";
  if ("int" in value) return Number(value.int);
  if ("i4" in value) return Number(value.i4);
  if ("double" in value) return Number(value.double);
  if ("boolean" in value) return value.boolean === "1" || value.boolean === 1 || value.boolean === true;
  if ("nil" in value) return null;
  if ("dateTime.iso8601" in value) return String(value["dateTime.iso8601"]);
  return value;
}

function parseValue(value: any): any {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object") return value;

  if ("array" in value) {
    const data = value.array?.data;
    return asArray(data?.value).map(parseValue);
  }

  if ("struct" in value) {
    const result: Record<string, unknown> = {};
    for (const member of asArray<any>(value.struct?.member)) {
      result[String(member.name)] = parseValue(member.value);
    }
    return result;
  }

  return parseScalar(value);
}

function parseMethodResponse(xml: string) {
  const parsed = parser.parse(xml);
  const response = parsed.methodResponse;
  if (!response) throw new Error("Odoo returned an invalid XML-RPC response.");

  if (response.fault) {
    const fault = parseValue(response.fault.value) as { faultCode?: unknown; faultString?: unknown };
    throw new Error(cleanOdooFault(String(fault?.faultString ?? "Odoo XML-RPC fault.")));
  }

  const param = asArray<any>(response.params?.param)[0];
  return parseValue(param?.value);
}

function cleanOdooFault(message: string) {
  const missingDb = message.match(/database "([^"]+)" does not exist/i);
  if (missingDb) {
    return `Odoo database "${missingDb[1]}" was not found at "${ODOO_URL}". This is an Odoo Online database-name/authentication issue; check ODOO_DB in Vercel.`;
  }

  const lines = message.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.at(-1) ?? message;
}

async function xmlRpc<T>(
  service: "common" | "object",
  methodName: string,
  params: unknown[],
): Promise<T> {
  const url = endpoint(service);
  console.info("[odoo] xml-rpc request", {
    url,
    database: ODOO_DB,
    service,
    method: methodName,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml",
      "User-Agent": "zipline-booking-system",
    },
    body: methodCall(methodName, params),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Odoo ${service}/${methodName} failed over HTTPS: HTTP ${response.status} ${text.slice(0, 500)}`);
  }

  return parseMethodResponse(text) as T;
}

export async function odooAuthenticate() {
  if (cachedUid) return cachedUid;

  const uid = await xmlRpc<number | false>("common", "authenticate", [
    ODOO_DB,
    ODOO_USERNAME,
    ODOO_API_KEY,
    {},
  ]);

  if (!uid) {
    throw new Error(`Odoo authentication failed for database "${ODOO_DB}" at "${ODOO_URL}". Check ODOO_DB, ODOO_USERNAME, and the API key.`);
  }

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

  return xmlRpc<T>("object", "execute_kw", [
    ODOO_DB,
    uid,
    ODOO_API_KEY,
    model,
    method,
    args,
    kwargs,
  ]);
}
