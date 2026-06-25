export const COMMON_DOMAINS = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
  "icloud.com", "live.com", "proton.me", "me.com",
];

// Common typos → correct domain
const TYPO_MAP: Record<string, string> = {
  "gamil.com":    "gmail.com",
  "gmial.com":    "gmail.com",
  "gmai.com":     "gmail.com",
  "gmail.co":     "gmail.com",
  "gmailcom":     "gmail.com",
  "yaahoo.com":   "yahoo.com",
  "yaho.com":     "yahoo.com",
  "yhoo.com":     "yahoo.com",
  "yahoo.co":     "yahoo.com",
  "hotmial.com":  "hotmail.com",
  "hotmal.com":   "hotmail.com",
  "hotmai.com":   "hotmail.com",
  "outlok.com":   "outlook.com",
  "outllok.com":  "outlook.com",
  "outook.com":   "outlook.com",
  "icloud.co":    "icloud.com",
  "icoud.com":    "icloud.com",
};

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email address is required.";
  const trimmed = email.trim();
  if (!trimmed.includes("@")) return "Please enter a valid email address.";
  const [local, domain] = trimmed.split("@");
  if (!local || !domain) return "Please enter a valid email address.";
  if (!domain.includes(".")) return "Please enter a valid email address.";
  const domainParts = domain.split(".");
  if (domainParts.some((p) => p.length === 0)) return "Please enter a valid email address.";
  // Regex check
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(trimmed)) return "Please enter a valid email address.";
  return null;
}

/** Returns domain suggestions for a partial email like "ahmed@" or "ahmed@g" */
export function getEmailSuggestions(email: string): string[] {
  const atIndex = email.indexOf("@");
  if (atIndex === -1) return [];
  const local        = email.slice(0, atIndex);
  const domainQuery  = email.slice(atIndex + 1).toLowerCase();
  const matching     = COMMON_DOMAINS.filter((d) => d.startsWith(domainQuery));
  return matching.map((d) => `${local}@${d}`);
}

/** Returns a corrected email if the domain looks like a typo */
export function getTypoSuggestion(email: string): string | null {
  const atIndex = email.indexOf("@");
  if (atIndex === -1) return null;
  const local  = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1).toLowerCase();
  const correct = TYPO_MAP[domain];
  if (!correct) return null;
  return `${local}@${correct}`;
}

export function normalizeEmail(email: string): string {
  const trimmed  = email.trim();
  const atIndex  = trimmed.indexOf("@");
  if (atIndex === -1) return trimmed.toLowerCase();
  const local    = trimmed.slice(0, atIndex);
  const domain   = trimmed.slice(atIndex + 1).toLowerCase();
  return `${local}@${domain}`;
}
