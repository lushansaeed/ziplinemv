export interface Country {
  name:        string;   // "Maldives"
  iso:         string;   // "MV"
  dialCode:    string;   // "+960"
  flag:        string;   // "🇲🇻"
  nationality: string;   // "Maldivian"
  phoneDigits: [number, number]; // [min, max] local digits
}

export const COUNTRIES: Country[] = [
  // ── Most relevant for Zipline Maldives ─────────────────────────────────────
  { name: "Maldives",          iso: "MV", dialCode: "+960",  flag: "🇲🇻", nationality: "Maldivian",       phoneDigits: [7, 7] },
  { name: "India",             iso: "IN", dialCode: "+91",   flag: "🇮🇳", nationality: "Indian",           phoneDigits: [10, 10] },
  { name: "Sri Lanka",         iso: "LK", dialCode: "+94",   flag: "🇱🇰", nationality: "Sri Lankan",       phoneDigits: [9, 9] },
  { name: "Bangladesh",        iso: "BD", dialCode: "+880",  flag: "🇧🇩", nationality: "Bangladeshi",      phoneDigits: [10, 10] },
  { name: "China",             iso: "CN", dialCode: "+86",   flag: "🇨🇳", nationality: "Chinese",          phoneDigits: [11, 11] },
  { name: "Russia",            iso: "RU", dialCode: "+7",    flag: "🇷🇺", nationality: "Russian",          phoneDigits: [10, 10] },
  // ── Europe ──────────────────────────────────────────────────────────────────
  { name: "United Kingdom",    iso: "GB", dialCode: "+44",   flag: "🇬🇧", nationality: "British",          phoneDigits: [10, 10] },
  { name: "Germany",           iso: "DE", dialCode: "+49",   flag: "🇩🇪", nationality: "German",           phoneDigits: [9, 12] },
  { name: "France",            iso: "FR", dialCode: "+33",   flag: "🇫🇷", nationality: "French",           phoneDigits: [9, 9] },
  { name: "Italy",             iso: "IT", dialCode: "+39",   flag: "🇮🇹", nationality: "Italian",          phoneDigits: [9, 11] },
  { name: "Spain",             iso: "ES", dialCode: "+34",   flag: "🇪🇸", nationality: "Spanish",          phoneDigits: [9, 9] },
  { name: "Netherlands",       iso: "NL", dialCode: "+31",   flag: "🇳🇱", nationality: "Dutch",            phoneDigits: [9, 9] },
  { name: "Switzerland",       iso: "CH", dialCode: "+41",   flag: "🇨🇭", nationality: "Swiss",            phoneDigits: [9, 9] },
  { name: "Sweden",            iso: "SE", dialCode: "+46",   flag: "🇸🇪", nationality: "Swedish",          phoneDigits: [9, 9] },
  { name: "Norway",            iso: "NO", dialCode: "+47",   flag: "🇳🇴", nationality: "Norwegian",        phoneDigits: [8, 8] },
  { name: "Denmark",           iso: "DK", dialCode: "+45",   flag: "🇩🇰", nationality: "Danish",           phoneDigits: [8, 8] },
  { name: "Finland",           iso: "FI", dialCode: "+358",  flag: "🇫🇮", nationality: "Finnish",          phoneDigits: [9, 10] },
  { name: "Poland",            iso: "PL", dialCode: "+48",   flag: "🇵🇱", nationality: "Polish",           phoneDigits: [9, 9] },
  { name: "Austria",           iso: "AT", dialCode: "+43",   flag: "🇦🇹", nationality: "Austrian",         phoneDigits: [9, 13] },
  { name: "Belgium",           iso: "BE", dialCode: "+32",   flag: "🇧🇪", nationality: "Belgian",          phoneDigits: [8, 9] },
  { name: "Portugal",          iso: "PT", dialCode: "+351",  flag: "🇵🇹", nationality: "Portuguese",       phoneDigits: [9, 9] },
  { name: "Czech Republic",    iso: "CZ", dialCode: "+420",  flag: "🇨🇿", nationality: "Czech",            phoneDigits: [9, 9] },
  { name: "Hungary",           iso: "HU", dialCode: "+36",   flag: "🇭🇺", nationality: "Hungarian",        phoneDigits: [9, 9] },
  { name: "Greece",            iso: "GR", dialCode: "+30",   flag: "🇬🇷", nationality: "Greek",            phoneDigits: [10, 10] },
  { name: "Romania",           iso: "RO", dialCode: "+40",   flag: "🇷🇴", nationality: "Romanian",         phoneDigits: [9, 9] },
  { name: "Ukraine",           iso: "UA", dialCode: "+380",  flag: "🇺🇦", nationality: "Ukrainian",        phoneDigits: [9, 9] },
  { name: "Ireland",           iso: "IE", dialCode: "+353",  flag: "🇮🇪", nationality: "Irish",            phoneDigits: [9, 9] },
  // ── Americas ────────────────────────────────────────────────────────────────
  { name: "United States",     iso: "US", dialCode: "+1",    flag: "🇺🇸", nationality: "American",         phoneDigits: [10, 10] },
  { name: "Canada",            iso: "CA", dialCode: "+1",    flag: "🇨🇦", nationality: "Canadian",         phoneDigits: [10, 10] },
  { name: "Brazil",            iso: "BR", dialCode: "+55",   flag: "🇧🇷", nationality: "Brazilian",        phoneDigits: [10, 11] },
  { name: "Mexico",            iso: "MX", dialCode: "+52",   flag: "🇲🇽", nationality: "Mexican",          phoneDigits: [10, 10] },
  { name: "Argentina",         iso: "AR", dialCode: "+54",   flag: "🇦🇷", nationality: "Argentine",        phoneDigits: [10, 10] },
  { name: "Colombia",          iso: "CO", dialCode: "+57",   flag: "🇨🇴", nationality: "Colombian",        phoneDigits: [10, 10] },
  // ── Middle East ─────────────────────────────────────────────────────────────
  { name: "United Arab Emirates", iso: "AE", dialCode: "+971", flag: "🇦🇪", nationality: "Emirati",       phoneDigits: [9, 9] },
  { name: "Saudi Arabia",      iso: "SA", dialCode: "+966",  flag: "🇸🇦", nationality: "Saudi",           phoneDigits: [9, 9] },
  { name: "Qatar",             iso: "QA", dialCode: "+974",  flag: "🇶🇦", nationality: "Qatari",          phoneDigits: [8, 8] },
  { name: "Kuwait",            iso: "KW", dialCode: "+965",  flag: "🇰🇼", nationality: "Kuwaiti",         phoneDigits: [8, 8] },
  { name: "Bahrain",           iso: "BH", dialCode: "+973",  flag: "🇧🇭", nationality: "Bahraini",        phoneDigits: [8, 8] },
  { name: "Oman",              iso: "OM", dialCode: "+968",  flag: "🇴🇲", nationality: "Omani",           phoneDigits: [8, 8] },
  { name: "Jordan",            iso: "JO", dialCode: "+962",  flag: "🇯🇴", nationality: "Jordanian",       phoneDigits: [9, 9] },
  { name: "Lebanon",           iso: "LB", dialCode: "+961",  flag: "🇱🇧", nationality: "Lebanese",        phoneDigits: [7, 8] },
  { name: "Israel",            iso: "IL", dialCode: "+972",  flag: "🇮🇱", nationality: "Israeli",         phoneDigits: [9, 9] },
  { name: "Turkey",            iso: "TR", dialCode: "+90",   flag: "🇹🇷", nationality: "Turkish",         phoneDigits: [10, 10] },
  { name: "Iran",              iso: "IR", dialCode: "+98",   flag: "🇮🇷", nationality: "Iranian",         phoneDigits: [10, 10] },
  { name: "Pakistan",          iso: "PK", dialCode: "+92",   flag: "🇵🇰", nationality: "Pakistani",       phoneDigits: [10, 10] },
  // ── Asia-Pacific ────────────────────────────────────────────────────────────
  { name: "Japan",             iso: "JP", dialCode: "+81",   flag: "🇯🇵", nationality: "Japanese",        phoneDigits: [10, 11] },
  { name: "South Korea",       iso: "KR", dialCode: "+82",   flag: "🇰🇷", nationality: "South Korean",    phoneDigits: [9, 10] },
  { name: "Australia",         iso: "AU", dialCode: "+61",   flag: "🇦🇺", nationality: "Australian",      phoneDigits: [9, 9] },
  { name: "New Zealand",       iso: "NZ", dialCode: "+64",   flag: "🇳🇿", nationality: "New Zealander",   phoneDigits: [8, 9] },
  { name: "Singapore",         iso: "SG", dialCode: "+65",   flag: "🇸🇬", nationality: "Singaporean",     phoneDigits: [8, 8] },
  { name: "Malaysia",          iso: "MY", dialCode: "+60",   flag: "🇲🇾", nationality: "Malaysian",       phoneDigits: [9, 10] },
  { name: "Thailand",          iso: "TH", dialCode: "+66",   flag: "🇹🇭", nationality: "Thai",            phoneDigits: [9, 9] },
  { name: "Indonesia",         iso: "ID", dialCode: "+62",   flag: "🇮🇩", nationality: "Indonesian",      phoneDigits: [9, 12] },
  { name: "Philippines",       iso: "PH", dialCode: "+63",   flag: "🇵🇭", nationality: "Filipino",        phoneDigits: [10, 10] },
  { name: "Vietnam",           iso: "VN", dialCode: "+84",   flag: "🇻🇳", nationality: "Vietnamese",      phoneDigits: [9, 10] },
  { name: "Nepal",             iso: "NP", dialCode: "+977",  flag: "🇳🇵", nationality: "Nepali",          phoneDigits: [10, 10] },
  { name: "Afghanistan",       iso: "AF", dialCode: "+93",   flag: "🇦🇫", nationality: "Afghan",          phoneDigits: [9, 9] },
  // ── Africa ──────────────────────────────────────────────────────────────────
  { name: "South Africa",      iso: "ZA", dialCode: "+27",   flag: "🇿🇦", nationality: "South African",   phoneDigits: [9, 9] },
  { name: "Nigeria",           iso: "NG", dialCode: "+234",  flag: "🇳🇬", nationality: "Nigerian",        phoneDigits: [10, 10] },
  { name: "Kenya",             iso: "KE", dialCode: "+254",  flag: "🇰🇪", nationality: "Kenyan",          phoneDigits: [9, 9] },
  { name: "Egypt",             iso: "EG", dialCode: "+20",   flag: "🇪🇬", nationality: "Egyptian",        phoneDigits: [10, 10] },
  { name: "Morocco",           iso: "MA", dialCode: "+212",  flag: "🇲🇦", nationality: "Moroccan",        phoneDigits: [9, 9] },
  { name: "Ethiopia",          iso: "ET", dialCode: "+251",  flag: "🇪🇹", nationality: "Ethiopian",       phoneDigits: [9, 9] },
  { name: "Tanzania",          iso: "TZ", dialCode: "+255",  flag: "🇹🇿", nationality: "Tanzanian",       phoneDigits: [9, 9] },
];

// Fast lookup by ISO code
export const COUNTRY_BY_ISO = Object.fromEntries(COUNTRIES.map((c) => [c.iso, c]));

// Default: Maldives
export const DEFAULT_COUNTRY = COUNTRIES.find((c) => c.iso === "MV")!;

export function searchCountries(query: string): Country[] {
  if (!query.trim()) return COUNTRIES;
  const q = query.toLowerCase().trim();
  return COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.nationality.toLowerCase().includes(q) ||
      c.dialCode.includes(q) ||
      c.iso.toLowerCase() === q
  );
}

export function searchNationalities(query: string): Country[] {
  if (!query.trim()) return COUNTRIES;
  const q = query.toLowerCase().trim();
  return COUNTRIES.filter(
    (c) =>
      c.nationality.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.iso.toLowerCase() === q
  );
}
