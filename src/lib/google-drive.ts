import crypto from "crypto";

type DriveFile = {
  id: string;
  name: string;
  webViewLink?: string;
};

type DriveFolderPathInput = {
  bookingReference: string;
  customerPhone: string;
  bookingDate: Date;
};

const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";

let tokenCache: { accessToken: string; expiresAt: number } | null = null;

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function normalizePrivateKey(raw: string) {
  return raw
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n");
}

function driveConfig() {
  const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID?.trim();
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.trim();

  if (!parentFolderId || !clientEmail || !privateKey) {
    throw new Error("Google Drive is not configured. Set GOOGLE_DRIVE_PARENT_FOLDER_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY.");
  }

  return { parentFolderId, clientEmail, privateKey: normalizePrivateKey(privateKey) };
}

async function getDriveAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.expiresAt - 60 > now) return tokenCache.accessToken;

  const { clientEmail, privateKey } = driveConfig();
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: DRIVE_SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  }));
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(`${header}.${claim}`)
    .sign(privateKey);
  const assertion = `${header}.${claim}.${base64Url(signature)}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[google-drive] token request failed", { status: res.status, error: data.error, description: data.error_description });
    throw new Error(`Google Drive authentication failed (${res.status}): ${data.error_description ?? data.error ?? "Unknown error"}`);
  }

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + Number(data.expires_in ?? 3600),
  };
  return tokenCache.accessToken;
}

function escapeDriveQuery(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function driveRequest<T>(path: string, init: RequestInit = {}) {
  const accessToken = await getDriveAccessToken();
  const res = await fetch(`${DRIVE_FILES_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[google-drive] request failed", {
      path,
      status: res.status,
      error: data.error?.message ?? data.error,
    });
    throw new Error(`Google Drive request failed (${res.status}): ${data.error?.message ?? "Unknown error"}`);
  }
  return data as T;
}

async function findFolder(parentId: string, name: string) {
  const q = [
    `'${escapeDriveQuery(parentId)}' in parents`,
    `name = '${escapeDriveQuery(name)}'`,
    `mimeType = '${DRIVE_FOLDER_MIME_TYPE}'`,
    "trashed = false",
  ].join(" and ");
  const params = new URLSearchParams({
    q,
    fields: "files(id,name,webViewLink)",
    spaces: "drive",
    pageSize: "1",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const result = await driveRequest<{ files: DriveFile[] }>(`?${params}`);
  return result.files[0] ?? null;
}

async function createFolder(parentId: string, name: string) {
  return driveRequest<DriveFile>("?fields=id,name,webViewLink&supportsAllDrives=true", {
    method: "POST",
    body: JSON.stringify({
      name,
      mimeType: DRIVE_FOLDER_MIME_TYPE,
      parents: [parentId],
    }),
  });
}

async function findOrCreateFolder(parentId: string, name: string) {
  const existing = await findFolder(parentId, name);
  if (existing) return existing;
  return createFolder(parentId, name);
}

function dateParts(date: Date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return { year, month, day, date: `${year}-${month}-${day}` };
}

function safeFolderName(value: string) {
  return value.replace(/[\\/:*?"<>|#%{}~&]/g, "-").replace(/\s+/g, " ").trim();
}

export function buildBookingMediaFolderName(input: DriveFolderPathInput) {
  const contact = input.customerPhone.replace(/\s+/g, "");
  return safeFolderName(`${input.bookingReference} - ${contact}`);
}

export async function ensureBookingDriveFolder(input: DriveFolderPathInput) {
  const { parentFolderId } = driveConfig();
  const parts = dateParts(input.bookingDate);
  const folderName = buildBookingMediaFolderName(input);

  console.info("[google-drive] ensuring booking media folder", {
    parentFolderId,
    bookingReference: input.bookingReference,
    path: `${parts.year}/${parts.month}/${parts.date}/${folderName}`,
  });

  const yearFolder = await findOrCreateFolder(parentFolderId, parts.year);
  const monthFolder = await findOrCreateFolder(yearFolder.id, parts.month);
  const dateFolder = await findOrCreateFolder(monthFolder.id, parts.date);
  const bookingFolder = await findOrCreateFolder(dateFolder.id, folderName);

  return {
    id: bookingFolder.id,
    url: bookingFolder.webViewLink ?? `https://drive.google.com/drive/folders/${bookingFolder.id}`,
    name: bookingFolder.name,
    path: `${parts.year}/${parts.month}/${parts.date}/${bookingFolder.name}`,
  };
}
