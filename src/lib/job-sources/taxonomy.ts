export const IT_JOB_CATEGORIES = [
  "Software Development",
  "Data & AI",
  "Cybersecurity",
  "Cloud & DevOps",
  "IT Support & Infrastructure",
  "QA & Testing",
  "Business & Systems Analysis",
  "Product & UX",
  "Graduate & Internship",
] as const;

export type ItJobCategory = (typeof IT_JOB_CATEGORIES)[number];

export const EXPERIENCE_FILTERS = [
  "Graduate / Entry level",
  "Junior",
  "Mid level",
  "Senior",
] as const;

type ClassifiableJob = {
  title?: string | null;
  description?: string | null;
  category?: string | null;
  experienceLevel?: string | null;
  postedAt?: Date | null;
  createdAt?: Date | null;
};

type Classification = {
  isIt: boolean;
  category: ItJobCategory;
  confidence: number;
};

function clean(value?: string | null) {
  return (value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&amp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const HARD_FALSE_POSITIVES = /\b(?:civil engineer|mechanical engineer|electrical engineer|electronic engineer|chemical engineer|mining engineer|industrial engineer|process engineer|manufacturing engineer|field engineer|field service engineer|quantity surveyor|surveyor|accountant|bookkeeper|payroll|buyer|merchandiser|warehouse|driver|sales representative|sales consultant|account manager|business development|marketing|recruiter|talent acquisition|human resources|hr business partner|legal counsel|attorney|nurse|doctor|pharmacist|customer success|customer service|call centre|contact centre)\b/i;

const SOFTWARE_TITLE = /\b(?:software (?:engineer|developer|architect)|(?:front[ -]?end|back[ -]?end|full[ -]?stack|web|mobile|android|ios|flutter|application) (?:engineer|developer)|(?:react|angular|vue|node(?:\.js)?|javascript|typescript|java|python|\.net|c#|php|golang|go|scala|ruby) (?:engineer|developer)|programmer|software development engineer|application developer|integration developer|salesforce developer|sap developer|erp developer)\b/i;
const DATA_TITLE = /\b(?:data (?:engineer|scientist|analyst|architect|specialist)|analytics engineer|machine learning engineer|ml engineer|ai engineer|artificial intelligence engineer|business intelligence (?:developer|engineer|analyst)|bi (?:developer|engineer|analyst)|database administrator|database engineer|dba|data platform engineer)\b/i;
const CYBER_TITLE = /\b(?:cyber(?:security)? (?:engineer|analyst|specialist|consultant)|information security (?:engineer|analyst|specialist|consultant)|security engineer|security analyst|security architect|soc analyst|penetration tester|ethical hacker|infosec|application security|cloud security)\b/i;
const DEVOPS_TITLE = /\b(?:devops(?: engineer)?|site reliability engineer|sre|cloud engineer|cloud architect|platform engineer|platform developer|kubernetes engineer|infrastructure as code engineer)\b/i;
const SUPPORT_TITLE = /\b(?:it support|ict support|service desk|help ?desk|desktop support|network engineer|network administrator|network specialist|systems? administrator|sysadmin|it technician|ict technician|technical support engineer|infrastructure engineer|infrastructure specialist|endpoint engineer|workplace technology)\b/i;
const QA_TITLE = /\b(?:qa (?:engineer|analyst|tester|specialist)|quality assurance (?:engineer|analyst|tester)|test automation (?:engineer|specialist)|automation tester|software tester|sdet|test engineer)\b/i;
const ANALYSIS_TITLE = /\b(?:technical business analyst|it business analyst|technology business analyst|business systems? analyst|systems? analyst|solution analyst|functional analyst|erp (?:consultant|analyst)|sap (?:consultant|analyst)|salesforce administrator|salesforce admin|solution architect|solutions architect|enterprise architect)\b/i;
const PRODUCT_UX_TITLE = /\b(?:technical product manager|software product manager|digital product manager|technical product owner|ux designer|ui designer|ui\/ux designer|product designer|user experience designer)\b/i;
const GRADUATE_TITLE = /\b(?:(?:it|ict|technology|software|developer|data|cybersecurity|information technology) (?:graduate|intern|internship|learnership|trainee)|graduate (?:developer|software engineer|data analyst|data engineer|technology analyst)|junior (?:software developer|software engineer|developer|data analyst|data engineer|qa engineer|devops engineer|cybersecurity analyst|it support technician))\b/i;

// Roles such as "Business Analyst", "Systems Engineer" and "Product Manager"
// can be technology jobs, but the title alone is not enough. They need strong
// evidence from the department/category or description.
const AMBIGUOUS_TECH_TITLE = /\b(?:business analyst|systems? engineer|product manager|product owner|project manager|support specialist|technical consultant|solutions? consultant|implementation consultant|integration specialist|automation engineer|qa manager|quality assurance manager)\b/i;
const STRONG_TECH_CONTEXT = /\b(?:software development|software engineering|engineering & product|product & tech|technology|information technology|\bit\b|\bict\b|data & ai|data science|data engineering|cybersecurity|information security|devops|cloud|platform engineering|infrastructure|networking|quality assurance|test automation|api|microservices|javascript|typescript|react|angular|node\.js|python|java|\.net|c#|sql|aws|azure|gcp|kubernetes|docker|linux|git|ci\/cd|database|saas|software platform)\b/i;

function categoryForStrongTitle(title: string): ItJobCategory | null {
  if (GRADUATE_TITLE.test(title)) return "Graduate & Internship";
  if (CYBER_TITLE.test(title)) return "Cybersecurity";
  if (DATA_TITLE.test(title)) return "Data & AI";
  if (DEVOPS_TITLE.test(title)) return "Cloud & DevOps";
  if (QA_TITLE.test(title)) return "QA & Testing";
  if (SUPPORT_TITLE.test(title)) return "IT Support & Infrastructure";
  if (ANALYSIS_TITLE.test(title)) return "Business & Systems Analysis";
  if (PRODUCT_UX_TITLE.test(title)) return "Product & UX";
  if (SOFTWARE_TITLE.test(title)) return "Software Development";
  return null;
}

/**
 * Strict IT classifier used both while importing and while rendering old rows.
 * A random mention of "technology" in a sales/finance description is never
 * enough. Strong IT roles pass from the title; ambiguous roles need explicit
 * technical context.
 */
export function classifyItJob(job: ClassifiableJob): Classification {
  const title = clean(job.title);
  const category = clean(job.category);
  const description = clean(job.description);

  if (!title) {
    return { isIt: false, category: "Software Development", confidence: 0 };
  }

  const strongCategory = categoryForStrongTitle(title);
  if (strongCategory) {
    // A specific software/data/etc title wins, even if the employer happens to
    // sit in a finance or retail industry.
    return { isIt: true, category: strongCategory, confidence: 100 };
  }

  if (HARD_FALSE_POSITIVES.test(title)) {
    return { isIt: false, category: "Software Development", confidence: 0 };
  }

  if (AMBIGUOUS_TECH_TITLE.test(title)) {
    const context = `${category} ${description}`;
    if (STRONG_TECH_CONTEXT.test(context)) {
      let inferred: ItJobCategory = "Business & Systems Analysis";
      if (/product manager|product owner/.test(title)) inferred = "Product & UX";
      else if (/systems? engineer|automation engineer/.test(title)) inferred = "IT Support & Infrastructure";
      else if (/project manager|implementation|integration|technical consultant|solutions? consultant/.test(title)) inferred = "Business & Systems Analysis";
      return { isIt: true, category: inferred, confidence: 78 };
    }
  }


  return { isIt: false, category: "Software Development", confidence: 0 };
}

export function isItJob(job: ClassifiableJob) {
  return classifyItJob(job).isIt;
}

export function inferItCategory(job: ClassifiableJob): ItJobCategory {
  return classifyItJob(job).category;
}

export function inferExperienceFilter(job: ClassifiableJob) {
  const text = `${clean(job.title)} ${clean(job.experienceLevel)} ${clean(job.description)}`;

  if (/\bgraduate|intern(?:ship)?|learnership|trainee|entry[ -]?level|no experience\b/.test(text)) {
    return "Graduate / Entry level" as const;
  }
  if (/\bjunior|\bjr\.?\b|associate\b/.test(text)) return "Junior" as const;
  if (/\bsenior|\bsr\.?\b|\blead\b|principal|staff engineer|head of|manager\b/.test(text)) {
    return "Senior" as const;
  }
  return "Mid level" as const;
}

export function normalizeEmploymentType(value?: string | null) {
  const text = clean(value);
  if (/intern|learnership|graduate programme|graduate program/.test(text)) return "Internship";
  if (/part[ -]?time/.test(text)) return "Part time";
  if (/contract|fixed|temporary|temp\b/.test(text)) return "Contract";
  if (/full[ -]?time|permanent/.test(text)) return "Full time";
  return "Other";
}

/**
 * Feed quality score: strict IT confidence first, then a small boost for
 * graduate/junior roles and freshness. It is used only for ordering; it does
 * not change whether a job is accepted.
 */
export function jobQualityScore(job: ClassifiableJob) {
  const classification = classifyItJob(job);
  if (!classification.isIt) return 0;

  let score = classification.confidence;
  const experience = inferExperienceFilter(job);
  if (experience === "Graduate / Entry level") score += 12;
  else if (experience === "Junior") score += 8;

  const date = job.postedAt || job.createdAt;
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    const ageDays = Math.max(0, (Date.now() - date.getTime()) / 86_400_000);
    if (ageDays <= 3) score += 6;
    else if (ageDays <= 14) score += 3;
  }

  return score;
}

/** Treat brand aliases as one employer family for feed rotation. */
export function companyFamilyKey(company: string) {
  const value = company
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (/takealot|mr d/.test(value)) return "takealot group";
  if (/standard bank/.test(value)) return "standard bank group";
  if (/impact com|impact radius/.test(value)) return "impact.com";
  if (/live ?score/.test(value)) return "livescore group";
  if (/2u|edx/.test(value)) return "2u";
  if (/wpp|vml/.test(value)) return value.includes("vml") ? "vml" : "wpp";

  return value
    .replace(/\b(?:pty|ltd|limited|inc|holdings)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stableCompanyScore(company: string) {
  let hash = 2166136261;
  for (let index = 0; index < company.length; index += 1) {
    hash ^= company.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Strict round-robin rotation. Jobs inside each employer are quality-ranked,
 * and every employer gets one turn before that employer can appear again.
 */
export function diversifyByCompany<T extends ClassifiableJob & { company: string; }>(
  jobs: T[],
  limit = 300,
  maxPerCompany = 8,
): T[] {
  const groups = new Map<string, T[]>();

  for (const job of jobs) {
    const key = companyFamilyKey(job.company);
    const group = groups.get(key) || [];
    if (group.length < maxPerCompany) group.push(job);
    groups.set(key, group);
  }

  const orderedGroups = [...groups.entries()]
    .map(([key, group]) => ({
      key,
      group: [...group].sort((a, b) => jobQualityScore(b) - jobQualityScore(a)),
      best: Math.max(...group.map(jobQualityScore)),
    }))
    .sort((a, b) => b.best - a.best || stableCompanyScore(a.key) - stableCompanyScore(b.key))
    .map((item) => item.group);

  const result: T[] = [];
  let round = 0;

  while (result.length < limit) {
    let added = false;
    for (const group of orderedGroups) {
      const job = group[round];
      if (!job) continue;
      result.push(job);
      added = true;
      if (result.length >= limit) break;
    }
    if (!added) break;
    round += 1;
  }

  return result;
}
