type JobIdentity = {
  title: string;
  company: string;
  location?: string | null;
  applyUrl?: string | null;
};

function normalize(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/\b(?:pty|ltd|limited|inc|group|holdings|company|co)\b/g, " ")
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(value: string) {
  return normalize(value)
    // Advert IDs, reference codes and obvious location suffixes often make the
    // same vacancy look different across a direct board and an aggregator.
    .replace(/\b(?:ref|reference|job id|vacancy id)\s*[:#-]?\s*[a-z0-9-]+\b/g, " ")
    .replace(/\b(?:cape town|johannesburg|pretoria|centurion|sandton|midrand|durban|gauteng|western cape|south africa|remote|hybrid)\b/g, " ")
    .replace(/\b(?:6|12|18|24)\s*months?\s*contract\b/g, "contract")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompany(value: string) {
  const company = normalize(value);
  if (/takealot|mr d/.test(company)) return "takealot";
  if (/standard bank/.test(company)) return "standard bank";
  if (/impact com|impact radius/.test(company)) return "impact.com";
  if (/wpp|vml/.test(company)) return company.includes("vml") ? "vml" : "wpp";
  return company;
}

function normalizeLocation(value?: string | null) {
  return normalize(value || "south africa")
    .replace(/\b(?:south africa|gauteng|western cape|eastern cape|northern cape|free state|kwazulu natal|limpopo|mpumalanga|north west|remote|hybrid)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "south africa";
}

/**
 * Cross-source identity used to stop the same vacancy appearing multiple times
 * when a company board and a marketplace/aggregator both publish it.
 */
export function jobCanonicalKey(job: JobIdentity) {
  return `${normalizeCompany(job.company)}::${normalizeTitle(job.title)}::${normalizeLocation(job.location)}`;
}

export function sourceExternalKey(source: string, externalId: string) {
  return `${source.trim().toLowerCase()}::${externalId.trim()}`;
}

export function dedupeJobs<T extends JobIdentity>(jobs: T[]): T[] {
  const seenCanonical = new Set<string>();
  const seenCompanyTitle = new Set<string>();
  const seenApplyUrls = new Set<string>();
  const unique: T[] = [];

  for (const job of jobs) {
    const canonical = jobCanonicalKey(job);
    const companyTitle = `${normalizeCompany(job.company)}::${normalizeTitle(job.title)}`;
    const applyUrl = (job.applyUrl || "").trim().toLowerCase().replace(/[?#].*$/, "");

    if (
      seenCanonical.has(canonical) ||
      seenCompanyTitle.has(companyTitle) ||
      (applyUrl && seenApplyUrls.has(applyUrl))
    ) {
      continue;
    }

    seenCanonical.add(canonical);
    seenCompanyTitle.add(companyTitle);
    if (applyUrl) seenApplyUrls.add(applyUrl);
    unique.push(job);
  }

  return unique;
}
