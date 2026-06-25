export interface Country {
  name:        string;
  iso:         string;
  dialCode:    string;
  flag:        string;
  nationality: string;
  phoneDigits: [number, number];
}

export const COUNTRIES: Country[] = [
  // ── Priority: Maldives tourists & neighbours ──────────────────────────────
  { name: "Maldives",              iso: "MV", dialCode: "+960",  flag: "🇲🇻", nationality: "Maldivian",           phoneDigits: [7, 7] },
  { name: "India",                 iso: "IN", dialCode: "+91",   flag: "🇮🇳", nationality: "Indian",               phoneDigits: [10, 10] },
  { name: "Sri Lanka",             iso: "LK", dialCode: "+94",   flag: "🇱🇰", nationality: "Sri Lankan",           phoneDigits: [9, 9] },
  { name: "Bangladesh",            iso: "BD", dialCode: "+880",  flag: "🇧🇩", nationality: "Bangladeshi",          phoneDigits: [10, 10] },
  { name: "China",                 iso: "CN", dialCode: "+86",   flag: "🇨🇳", nationality: "Chinese",              phoneDigits: [11, 11] },
  { name: "Pakistan",              iso: "PK", dialCode: "+92",   flag: "🇵🇰", nationality: "Pakistani",            phoneDigits: [10, 10] },
  { name: "Russia",                iso: "RU", dialCode: "+7",    flag: "🇷🇺", nationality: "Russian",              phoneDigits: [10, 10] },
  { name: "United Arab Emirates",  iso: "AE", dialCode: "+971",  flag: "🇦🇪", nationality: "Emirati",              phoneDigits: [9, 9] },
  { name: "Saudi Arabia",          iso: "SA", dialCode: "+966",  flag: "🇸🇦", nationality: "Saudi Arabian",        phoneDigits: [9, 9] },
  // ── Europe ────────────────────────────────────────────────────────────────
  { name: "United Kingdom",        iso: "GB", dialCode: "+44",   flag: "🇬🇧", nationality: "British",              phoneDigits: [10, 10] },
  { name: "Germany",               iso: "DE", dialCode: "+49",   flag: "🇩🇪", nationality: "German",               phoneDigits: [9, 12] },
  { name: "France",                iso: "FR", dialCode: "+33",   flag: "🇫🇷", nationality: "French",               phoneDigits: [9, 9] },
  { name: "Italy",                 iso: "IT", dialCode: "+39",   flag: "🇮🇹", nationality: "Italian",              phoneDigits: [9, 11] },
  { name: "Spain",                 iso: "ES", dialCode: "+34",   flag: "🇪🇸", nationality: "Spanish",              phoneDigits: [9, 9] },
  { name: "Netherlands",           iso: "NL", dialCode: "+31",   flag: "🇳🇱", nationality: "Dutch",                phoneDigits: [9, 9] },
  { name: "Switzerland",           iso: "CH", dialCode: "+41",   flag: "🇨🇭", nationality: "Swiss",                phoneDigits: [9, 9] },
  { name: "Sweden",                iso: "SE", dialCode: "+46",   flag: "🇸🇪", nationality: "Swedish",              phoneDigits: [9, 9] },
  { name: "Norway",                iso: "NO", dialCode: "+47",   flag: "🇳🇴", nationality: "Norwegian",            phoneDigits: [8, 8] },
  { name: "Denmark",               iso: "DK", dialCode: "+45",   flag: "🇩🇰", nationality: "Danish",               phoneDigits: [8, 8] },
  { name: "Finland",               iso: "FI", dialCode: "+358",  flag: "🇫🇮", nationality: "Finnish",              phoneDigits: [9, 10] },
  { name: "Poland",                iso: "PL", dialCode: "+48",   flag: "🇵🇱", nationality: "Polish",               phoneDigits: [9, 9] },
  { name: "Austria",               iso: "AT", dialCode: "+43",   flag: "🇦🇹", nationality: "Austrian",             phoneDigits: [9, 13] },
  { name: "Belgium",               iso: "BE", dialCode: "+32",   flag: "🇧🇪", nationality: "Belgian",              phoneDigits: [8, 9] },
  { name: "Portugal",              iso: "PT", dialCode: "+351",  flag: "🇵🇹", nationality: "Portuguese",           phoneDigits: [9, 9] },
  { name: "Czech Republic",        iso: "CZ", dialCode: "+420",  flag: "🇨🇿", nationality: "Czech",                phoneDigits: [9, 9] },
  { name: "Hungary",               iso: "HU", dialCode: "+36",   flag: "🇭🇺", nationality: "Hungarian",            phoneDigits: [9, 9] },
  { name: "Greece",                iso: "GR", dialCode: "+30",   flag: "🇬🇷", nationality: "Greek",                phoneDigits: [10, 10] },
  { name: "Romania",               iso: "RO", dialCode: "+40",   flag: "🇷🇴", nationality: "Romanian",             phoneDigits: [9, 9] },
  { name: "Ukraine",               iso: "UA", dialCode: "+380",  flag: "🇺🇦", nationality: "Ukrainian",            phoneDigits: [9, 9] },
  { name: "Ireland",               iso: "IE", dialCode: "+353",  flag: "🇮🇪", nationality: "Irish",                phoneDigits: [9, 9] },
  { name: "Slovakia",              iso: "SK", dialCode: "+421",  flag: "🇸🇰", nationality: "Slovak",               phoneDigits: [9, 9] },
  { name: "Bulgaria",              iso: "BG", dialCode: "+359",  flag: "🇧🇬", nationality: "Bulgarian",            phoneDigits: [9, 9] },
  { name: "Croatia",               iso: "HR", dialCode: "+385",  flag: "🇭🇷", nationality: "Croatian",             phoneDigits: [8, 9] },
  { name: "Serbia",                iso: "RS", dialCode: "+381",  flag: "🇷🇸", nationality: "Serbian",              phoneDigits: [8, 9] },
  { name: "Bosnia and Herzegovina",iso: "BA", dialCode: "+387",  flag: "🇧🇦", nationality: "Bosnian",              phoneDigits: [8, 8] },
  { name: "Slovenia",              iso: "SI", dialCode: "+386",  flag: "🇸🇮", nationality: "Slovenian",            phoneDigits: [8, 8] },
  { name: "Lithuania",             iso: "LT", dialCode: "+370",  flag: "🇱🇹", nationality: "Lithuanian",           phoneDigits: [8, 8] },
  { name: "Latvia",                iso: "LV", dialCode: "+371",  flag: "🇱🇻", nationality: "Latvian",              phoneDigits: [8, 8] },
  { name: "Estonia",               iso: "EE", dialCode: "+372",  flag: "🇪🇪", nationality: "Estonian",             phoneDigits: [7, 8] },
  { name: "Belarus",               iso: "BY", dialCode: "+375",  flag: "🇧🇾", nationality: "Belarusian",           phoneDigits: [9, 9] },
  { name: "Moldova",               iso: "MD", dialCode: "+373",  flag: "🇲🇩", nationality: "Moldovan",             phoneDigits: [8, 8] },
  { name: "Albania",               iso: "AL", dialCode: "+355",  flag: "🇦🇱", nationality: "Albanian",             phoneDigits: [9, 9] },
  { name: "North Macedonia",       iso: "MK", dialCode: "+389",  flag: "🇲🇰", nationality: "Macedonian",           phoneDigits: [8, 8] },
  { name: "Montenegro",            iso: "ME", dialCode: "+382",  flag: "🇲🇪", nationality: "Montenegrin",          phoneDigits: [8, 8] },
  { name: "Kosovo",                iso: "XK", dialCode: "+383",  flag: "🇽🇰", nationality: "Kosovar",              phoneDigits: [8, 8] },
  { name: "Luxembourg",            iso: "LU", dialCode: "+352",  flag: "🇱🇺", nationality: "Luxembourgish",        phoneDigits: [9, 9] },
  { name: "Iceland",               iso: "IS", dialCode: "+354",  flag: "🇮🇸", nationality: "Icelandic",            phoneDigits: [7, 7] },
  { name: "Malta",                 iso: "MT", dialCode: "+356",  flag: "🇲🇹", nationality: "Maltese",              phoneDigits: [8, 8] },
  { name: "Cyprus",                iso: "CY", dialCode: "+357",  flag: "🇨🇾", nationality: "Cypriot",              phoneDigits: [8, 8] },
  { name: "Georgia",               iso: "GE", dialCode: "+995",  flag: "🇬🇪", nationality: "Georgian",             phoneDigits: [9, 9] },
  { name: "Armenia",               iso: "AM", dialCode: "+374",  flag: "🇦🇲", nationality: "Armenian",             phoneDigits: [8, 8] },
  { name: "Azerbaijan",            iso: "AZ", dialCode: "+994",  flag: "🇦🇿", nationality: "Azerbaijani",          phoneDigits: [9, 9] },
  // ── Americas ──────────────────────────────────────────────────────────────
  { name: "United States",         iso: "US", dialCode: "+1",    flag: "🇺🇸", nationality: "American",             phoneDigits: [10, 10] },
  { name: "Canada",                iso: "CA", dialCode: "+1",    flag: "🇨🇦", nationality: "Canadian",             phoneDigits: [10, 10] },
  { name: "Brazil",                iso: "BR", dialCode: "+55",   flag: "🇧🇷", nationality: "Brazilian",            phoneDigits: [10, 11] },
  { name: "Mexico",                iso: "MX", dialCode: "+52",   flag: "🇲🇽", nationality: "Mexican",              phoneDigits: [10, 10] },
  { name: "Argentina",             iso: "AR", dialCode: "+54",   flag: "🇦🇷", nationality: "Argentine",            phoneDigits: [10, 10] },
  { name: "Colombia",              iso: "CO", dialCode: "+57",   flag: "🇨🇴", nationality: "Colombian",            phoneDigits: [10, 10] },
  { name: "Chile",                 iso: "CL", dialCode: "+56",   flag: "🇨🇱", nationality: "Chilean",              phoneDigits: [9, 9] },
  { name: "Peru",                  iso: "PE", dialCode: "+51",   flag: "🇵🇪", nationality: "Peruvian",             phoneDigits: [9, 9] },
  { name: "Venezuela",             iso: "VE", dialCode: "+58",   flag: "🇻🇪", nationality: "Venezuelan",           phoneDigits: [10, 10] },
  { name: "Ecuador",               iso: "EC", dialCode: "+593",  flag: "🇪🇨", nationality: "Ecuadorian",           phoneDigits: [9, 9] },
  { name: "Bolivia",               iso: "BO", dialCode: "+591",  flag: "🇧🇴", nationality: "Bolivian",             phoneDigits: [8, 8] },
  { name: "Uruguay",               iso: "UY", dialCode: "+598",  flag: "🇺🇾", nationality: "Uruguayan",            phoneDigits: [8, 9] },
  { name: "Paraguay",              iso: "PY", dialCode: "+595",  flag: "🇵🇾", nationality: "Paraguayan",           phoneDigits: [9, 9] },
  { name: "Cuba",                  iso: "CU", dialCode: "+53",   flag: "🇨🇺", nationality: "Cuban",                phoneDigits: [8, 8] },
  { name: "Guatemala",             iso: "GT", dialCode: "+502",  flag: "🇬🇹", nationality: "Guatemalan",           phoneDigits: [8, 8] },
  { name: "Costa Rica",            iso: "CR", dialCode: "+506",  flag: "🇨🇷", nationality: "Costa Rican",          phoneDigits: [8, 8] },
  { name: "Panama",                iso: "PA", dialCode: "+507",  flag: "🇵🇦", nationality: "Panamanian",           phoneDigits: [8, 8] },
  { name: "Dominican Republic",    iso: "DO", dialCode: "+1809", flag: "🇩🇴", nationality: "Dominican",            phoneDigits: [10, 10] },
  { name: "Jamaica",               iso: "JM", dialCode: "+1876", flag: "🇯🇲", nationality: "Jamaican",             phoneDigits: [10, 10] },
  // ── Middle East ───────────────────────────────────────────────────────────
  { name: "Qatar",                 iso: "QA", dialCode: "+974",  flag: "🇶🇦", nationality: "Qatari",               phoneDigits: [8, 8] },
  { name: "Kuwait",                iso: "KW", dialCode: "+965",  flag: "🇰🇼", nationality: "Kuwaiti",              phoneDigits: [8, 8] },
  { name: "Bahrain",               iso: "BH", dialCode: "+973",  flag: "🇧🇭", nationality: "Bahraini",             phoneDigits: [8, 8] },
  { name: "Oman",                  iso: "OM", dialCode: "+968",  flag: "🇴🇲", nationality: "Omani",                phoneDigits: [8, 8] },
  { name: "Jordan",                iso: "JO", dialCode: "+962",  flag: "🇯🇴", nationality: "Jordanian",            phoneDigits: [9, 9] },
  { name: "Lebanon",               iso: "LB", dialCode: "+961",  flag: "🇱🇧", nationality: "Lebanese",             phoneDigits: [7, 8] },
  { name: "Israel",                iso: "IL", dialCode: "+972",  flag: "🇮🇱", nationality: "Israeli",              phoneDigits: [9, 9] },
  { name: "Palestine",             iso: "PS", dialCode: "+970",  flag: "🇵🇸", nationality: "Palestinian",          phoneDigits: [9, 9] },
  { name: "Iraq",                  iso: "IQ", dialCode: "+964",  flag: "🇮🇶", nationality: "Iraqi",                phoneDigits: [10, 10] },
  { name: "Syria",                 iso: "SY", dialCode: "+963",  flag: "🇸🇾", nationality: "Syrian",               phoneDigits: [9, 9] },
  { name: "Yemen",                 iso: "YE", dialCode: "+967",  flag: "🇾🇪", nationality: "Yemeni",               phoneDigits: [9, 9] },
  { name: "Iran",                  iso: "IR", dialCode: "+98",   flag: "🇮🇷", nationality: "Iranian",              phoneDigits: [10, 10] },
  { name: "Turkey",                iso: "TR", dialCode: "+90",   flag: "🇹🇷", nationality: "Turkish",              phoneDigits: [10, 10] },
  { name: "Afghanistan",           iso: "AF", dialCode: "+93",   flag: "🇦🇫", nationality: "Afghan",               phoneDigits: [9, 9] },
  // ── Asia-Pacific ──────────────────────────────────────────────────────────
  { name: "Japan",                 iso: "JP", dialCode: "+81",   flag: "🇯🇵", nationality: "Japanese",             phoneDigits: [10, 11] },
  { name: "South Korea",           iso: "KR", dialCode: "+82",   flag: "🇰🇷", nationality: "South Korean",         phoneDigits: [9, 10] },
  { name: "Australia",             iso: "AU", dialCode: "+61",   flag: "🇦🇺", nationality: "Australian",           phoneDigits: [9, 9] },
  { name: "New Zealand",           iso: "NZ", dialCode: "+64",   flag: "🇳🇿", nationality: "New Zealander",        phoneDigits: [8, 9] },
  { name: "Singapore",             iso: "SG", dialCode: "+65",   flag: "🇸🇬", nationality: "Singaporean",          phoneDigits: [8, 8] },
  { name: "Malaysia",              iso: "MY", dialCode: "+60",   flag: "🇲🇾", nationality: "Malaysian",            phoneDigits: [9, 10] },
  { name: "Thailand",              iso: "TH", dialCode: "+66",   flag: "🇹🇭", nationality: "Thai",                 phoneDigits: [9, 9] },
  { name: "Indonesia",             iso: "ID", dialCode: "+62",   flag: "🇮🇩", nationality: "Indonesian",           phoneDigits: [9, 12] },
  { name: "Philippines",           iso: "PH", dialCode: "+63",   flag: "🇵🇭", nationality: "Filipino",             phoneDigits: [10, 10] },
  { name: "Vietnam",               iso: "VN", dialCode: "+84",   flag: "🇻🇳", nationality: "Vietnamese",           phoneDigits: [9, 10] },
  { name: "Nepal",                 iso: "NP", dialCode: "+977",  flag: "🇳🇵", nationality: "Nepali",               phoneDigits: [10, 10] },
  { name: "Myanmar",               iso: "MM", dialCode: "+95",   flag: "🇲🇲", nationality: "Burmese",              phoneDigits: [9, 10] },
  { name: "Cambodia",              iso: "KH", dialCode: "+855",  flag: "🇰🇭", nationality: "Cambodian",            phoneDigits: [9, 9] },
  { name: "Laos",                  iso: "LA", dialCode: "+856",  flag: "🇱🇦", nationality: "Lao",                  phoneDigits: [9, 10] },
  { name: "Brunei",                iso: "BN", dialCode: "+673",  flag: "🇧🇳", nationality: "Bruneian",             phoneDigits: [7, 7] },
  { name: "Mongolia",              iso: "MN", dialCode: "+976",  flag: "🇲🇳", nationality: "Mongolian",            phoneDigits: [8, 8] },
  { name: "Kazakhstan",            iso: "KZ", dialCode: "+7",    flag: "🇰🇿", nationality: "Kazakhstani",          phoneDigits: [10, 10] },
  { name: "Uzbekistan",            iso: "UZ", dialCode: "+998",  flag: "🇺🇿", nationality: "Uzbek",                phoneDigits: [9, 9] },
  { name: "Kyrgyzstan",            iso: "KG", dialCode: "+996",  flag: "🇰🇬", nationality: "Kyrgyz",               phoneDigits: [9, 9] },
  { name: "Tajikistan",            iso: "TJ", dialCode: "+992",  flag: "🇹🇯", nationality: "Tajik",                phoneDigits: [9, 9] },
  { name: "Turkmenistan",          iso: "TM", dialCode: "+993",  flag: "🇹🇲", nationality: "Turkmen",              phoneDigits: [8, 8] },
  { name: "North Korea",           iso: "KP", dialCode: "+850",  flag: "🇰🇵", nationality: "North Korean",         phoneDigits: [9, 10] },
  { name: "Taiwan",                iso: "TW", dialCode: "+886",  flag: "🇹🇼", nationality: "Taiwanese",            phoneDigits: [9, 9] },
  { name: "Hong Kong",             iso: "HK", dialCode: "+852",  flag: "🇭🇰", nationality: "Hong Konger",          phoneDigits: [8, 8] },
  { name: "Macau",                 iso: "MO", dialCode: "+853",  flag: "🇲🇴", nationality: "Macanese",             phoneDigits: [8, 8] },
  { name: "Timor-Leste",           iso: "TL", dialCode: "+670",  flag: "🇹🇱", nationality: "Timorese",             phoneDigits: [7, 8] },
  { name: "Papua New Guinea",      iso: "PG", dialCode: "+675",  flag: "🇵🇬", nationality: "Papua New Guinean",    phoneDigits: [8, 8] },
  { name: "Fiji",                  iso: "FJ", dialCode: "+679",  flag: "🇫🇯", nationality: "Fijian",               phoneDigits: [7, 7] },
  // ── Africa ────────────────────────────────────────────────────────────────
  { name: "South Africa",          iso: "ZA", dialCode: "+27",   flag: "🇿🇦", nationality: "South African",        phoneDigits: [9, 9] },
  { name: "Nigeria",               iso: "NG", dialCode: "+234",  flag: "🇳🇬", nationality: "Nigerian",             phoneDigits: [10, 10] },
  { name: "Kenya",                 iso: "KE", dialCode: "+254",  flag: "🇰🇪", nationality: "Kenyan",               phoneDigits: [9, 9] },
  { name: "Egypt",                 iso: "EG", dialCode: "+20",   flag: "🇪🇬", nationality: "Egyptian",             phoneDigits: [10, 10] },
  { name: "Morocco",               iso: "MA", dialCode: "+212",  flag: "🇲🇦", nationality: "Moroccan",             phoneDigits: [9, 9] },
  { name: "Ethiopia",              iso: "ET", dialCode: "+251",  flag: "🇪🇹", nationality: "Ethiopian",            phoneDigits: [9, 9] },
  { name: "Tanzania",              iso: "TZ", dialCode: "+255",  flag: "🇹🇿", nationality: "Tanzanian",            phoneDigits: [9, 9] },
  { name: "Uganda",                iso: "UG", dialCode: "+256",  flag: "🇺🇬", nationality: "Ugandan",              phoneDigits: [9, 9] },
  { name: "Ghana",                 iso: "GH", dialCode: "+233",  flag: "🇬🇭", nationality: "Ghanaian",             phoneDigits: [9, 9] },
  { name: "Algeria",               iso: "DZ", dialCode: "+213",  flag: "🇩🇿", nationality: "Algerian",             phoneDigits: [9, 9] },
  { name: "Tunisia",               iso: "TN", dialCode: "+216",  flag: "🇹🇳", nationality: "Tunisian",             phoneDigits: [8, 8] },
  { name: "Libya",                 iso: "LY", dialCode: "+218",  flag: "🇱🇾", nationality: "Libyan",               phoneDigits: [9, 9] },
  { name: "Sudan",                 iso: "SD", dialCode: "+249",  flag: "🇸🇩", nationality: "Sudanese",             phoneDigits: [9, 9] },
  { name: "Cameroon",              iso: "CM", dialCode: "+237",  flag: "🇨🇲", nationality: "Cameroonian",          phoneDigits: [8, 9] },
  { name: "Ivory Coast",           iso: "CI", dialCode: "+225",  flag: "🇨🇮", nationality: "Ivorian",              phoneDigits: [10, 10] },
  { name: "Senegal",               iso: "SN", dialCode: "+221",  flag: "🇸🇳", nationality: "Senegalese",           phoneDigits: [9, 9] },
  { name: "Angola",                iso: "AO", dialCode: "+244",  flag: "🇦🇴", nationality: "Angolan",              phoneDigits: [9, 9] },
  { name: "Mozambique",            iso: "MZ", dialCode: "+258",  flag: "🇲🇿", nationality: "Mozambican",           phoneDigits: [9, 9] },
  { name: "Zimbabwe",              iso: "ZW", dialCode: "+263",  flag: "🇿🇼", nationality: "Zimbabwean",           phoneDigits: [9, 9] },
  { name: "Zambia",                iso: "ZM", dialCode: "+260",  flag: "🇿🇲", nationality: "Zambian",              phoneDigits: [9, 9] },
  { name: "Rwanda",                iso: "RW", dialCode: "+250",  flag: "🇷🇼", nationality: "Rwandan",              phoneDigits: [9, 9] },
  { name: "Madagascar",            iso: "MG", dialCode: "+261",  flag: "🇲🇬", nationality: "Malagasy",             phoneDigits: [9, 9] },
  { name: "Mauritius",             iso: "MU", dialCode: "+230",  flag: "🇲🇺", nationality: "Mauritian",            phoneDigits: [8, 8] },
  { name: "Seychelles",            iso: "SC", dialCode: "+248",  flag: "🇸🇨", nationality: "Seychellois",          phoneDigits: [7, 7] },
  { name: "Somalia",               iso: "SO", dialCode: "+252",  flag: "🇸🇴", nationality: "Somali",               phoneDigits: [8, 8] },
  { name: "Eritrea",               iso: "ER", dialCode: "+291",  flag: "🇪🇷", nationality: "Eritrean",             phoneDigits: [7, 7] },
  { name: "Djibouti",              iso: "DJ", dialCode: "+253",  flag: "🇩🇯", nationality: "Djiboutian",           phoneDigits: [8, 8] },
  { name: "Libya",                 iso: "LY", dialCode: "+218",  flag: "🇱🇾", nationality: "Libyan",               phoneDigits: [9, 9] },
];

export const COUNTRY_BY_ISO = Object.fromEntries(COUNTRIES.map((c) => [c.iso, c]));
export const DEFAULT_COUNTRY = COUNTRIES.find((c) => c.iso === "MV") ?? COUNTRIES[0];

export function searchCountries(query: string): Country[] {
  if (!query.trim()) return COUNTRIES;
  const q = query.toLowerCase().trim().replace(/^\+/, "");
  return COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.nationality.toLowerCase().includes(q) ||
      c.dialCode.replace("+", "").startsWith(q) ||
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
