type DevpostTheme = string | { name?: string | null; };

type DevpostHackathon = {
  id?: number | string;
  title?: string | null;
  url?: string | null;
  organization_name?: string | null;
  displayed_location?: string | { location?: string | null; } | null;
  open_state?: string | null;
  submission_period_dates?: string | null;
  time_left_to_submission?: string | null;
  prize_amount?: string | null;
  registrations_count?: number | null;
  invite_only?: boolean | null;
  themes?: DevpostTheme[] | null;
};

type DevpostResponse = {
  hackathons?: DevpostHackathon[];
};

export type DiscoveredHackathon = {
  id: string;
  name: string;
  description: string;
  location: string | null;
  mode: string;
  startDate: null;
  endDate: null;
  registrationDeadline: null;
  websiteUrl: string;
  technologies: string[];
  source: string;
  joined: false;
  participants: number;
  teams: 0;
  external: true;
  dateLabel: string | null;
  availabilityLabel: string;
};

const CURATED_SOUTH_AFRICA_2026: Array<DiscoveredHackathon & { validUntil: string; }> = [];

const SOUTH_AFRICA_MARKERS = [
  "south africa",
  "johannesburg",
  "cape town",
  "pretoria",
  "centurion",
  "durban",
  "gauteng",
  "western cape",
  "kwazulu",
  "sandton",
  "stellenbosch",
  "bloemfontein",
  "gqeberha",
  "port elizabeth",
];

function text(value: unknown) {
  return typeof value === "string" ? value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
}

function locationText(value: DevpostHackathon["displayed_location"]) {
  if (typeof value === "string") return text(value);
  return text(value?.location);
}

function themeNames(value: DevpostTheme[] | null | undefined) {
  if (!Array.isArray(value)) return [];
  return value
    .map((theme) => (typeof theme === "string" ? text(theme) : text(theme?.name)))
    .filter(Boolean)
    .slice(0, 6);
}

function isSouthAfrican(value: string) {
  const normalized = value.toLowerCase();
  return SOUTH_AFRICA_MARKERS.some((marker) => normalized.includes(marker));
}

function modeFromLocation(location: string) {
  if (/\bonline\b|\bremote\b|\bvirtual\b/i.test(location)) return "HYBRID";
  return "IN_PERSON";
}

type FrankfurterRateResponse = {
  rate?: number;
};

async function fetchUsdZarRate() {
  try {
    const response = await fetch(
      "https://api.frankfurter.dev/v2/rate/USD/ZAR?providers=SARB",
      { next: { revalidate: 3600 } },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as FrankfurterRateResponse;
    return typeof body.rate === "number" && Number.isFinite(body.rate) ? body.rate : null;
  } catch {
    return null;
  }
}

function prizeInZar(value: string, usdZarRate: number | null) {
  const raw = text(value);
  if (!raw) return "";

  // Keep prizes that are already quoted in South African rand.
  if (/\bZAR\b/i.test(raw) || /(^|\s)R\s?\d/i.test(raw)) {
    return raw.replace(/\bZAR\s*/gi, "R");
  }

  // Devpost commonly returns USD prize strings such as "$10,000 in prizes".
  // Convert those to rand using the latest SARB-backed USD/ZAR rate.
  const usd = raw.match(/(?:US\$|USD\s*|\$)\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
  if (usd && usdZarRate) {
    const amount = Number(usd[1].replace(/,/g, ""));
    if (Number.isFinite(amount)) {
      const zar = Math.round(amount * usdZarRate);
      return `≈ ${new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(zar)} in prizes`;
    }
  }

  // Never leak another currency onto the South Africa-only page.
  return "";
}

function mapHackathon(
  hackathon: DevpostHackathon,
  availabilityLabel: string,
  usdZarRate: number | null,
): DiscoveredHackathon | null {
  const name = text(hackathon.title);
  const websiteUrl = text(hackathon.url);
  if (!name || !websiteUrl) return null;

  const organization = text(hackathon.organization_name) || "Devpost organiser";
  const location = locationText(hackathon.displayed_location) || "Online";
  const dates = text(hackathon.submission_period_dates);
  const timeLeft = text(hackathon.time_left_to_submission);
  const prize = prizeInZar(text(hackathon.prize_amount), usdZarRate);
  const details = [
    `${organization} hackathon.`,
    dates ? `Submission period: ${dates}.` : "",
    prize ? `Prize pool: ${prize}.` : "",
    timeLeft ? `${timeLeft}.` : "",
  ].filter(Boolean);

  const stableId = hackathon.id ?? websiteUrl;

  return {
    id: `devpost:${stableId}`,
    name,
    description: details.join(" "),
    location,
    mode: modeFromLocation(location),
    startDate: null,
    endDate: null,
    registrationDeadline: null,
    websiteUrl,
    technologies: themeNames(hackathon.themes),
    source: "Devpost Live",
    joined: false,
    participants: Math.max(0, hackathon.registrations_count || 0),
    teams: 0,
    external: true,
    dateLabel: dates || timeLeft || "Open / upcoming",
    availabilityLabel,
  };
}

async function fetchDevpost(status: "open" | "upcoming") {
  const params = new URLSearchParams();
  params.append("status[]", status);
  params.set("per_page", "48");
  params.set("page", "1");

  try {
    const response = await fetch(`https://devpost.com/api/hackathons?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "GradConnect/1.0 hackathon discovery",
      },
      next: { revalidate: 1800 },
    });

    if (!response.ok) return [];
    const body = (await response.json()) as DevpostResponse;
    return Array.isArray(body.hackathons) ? body.hackathons : [];
  } catch {
    return [];
  }
}

/**
 * Pulls current public Devpost listings and keeps ONLY hackathons that are
 * explicitly located in South Africa (or a recognised South African city).
 * Worldwide, Africa-wide and generic online events are intentionally excluded.
 * Failures return the curated South African list, so the page still works if
 * Devpost or the exchange-rate service is temporarily unavailable.
 */
export async function discoverSouthAfricaHackathons(): Promise<DiscoveredHackathon[]> {
  const [open, upcoming, usdZarRate] = await Promise.all([
    fetchDevpost("open"),
    fetchDevpost("upcoming"),
    fetchUsdZarRate(),
  ]);

  const seen = new Set<string>();
  const local: DiscoveredHackathon[] = [];

  for (const hackathon of [...open, ...upcoming]) {
    if (hackathon.invite_only) continue;

    const url = text(hackathon.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const location = locationText(hackathon.displayed_location);
    if (!isSouthAfrican(location)) continue;

    const mapped = mapHackathon(hackathon, "South Africa", usdZarRate);
    if (mapped) local.push(mapped);
  }

  const now = Date.now();
  const curated = CURATED_SOUTH_AFRICA_2026
    .filter((hackathon) => new Date(hackathon.validUntil).getTime() >= now)
    .map(({ validUntil: _validUntil, ...hackathon }) => hackathon);

  // Verified South African opportunities from multiple organisers first, then
  // current South African Devpost listings. Keep one card per event/URL.
  const combined = [...curated, ...local.slice(0, 20)];
  const deduped: DiscoveredHackathon[] = [];
  const keys = new Set<string>();

  for (const item of combined) {
    const key = `${item.name.toLowerCase().replace(/[^a-z0-9]/g, "")}:${item.websiteUrl.toLowerCase().replace(/\/$/, "")}`;
    if (keys.has(key)) continue;
    keys.add(key);
    deduped.push(item);
  }

  return deduped;
}
