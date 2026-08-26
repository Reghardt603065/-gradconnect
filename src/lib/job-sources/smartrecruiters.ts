import { cleanText, fetchJson, guessExperience } from "./http";
import { isSouthAfricanLocation } from "./south-africa";
import type { JobSourceResult, NormalizedJob } from "./types";
import { isItJob } from "./taxonomy";

type SmartRecruitersPosting = {
  id: string;
  uuid?: string;
  name: string;
  releasedDate?: string;
  company?: { identifier?: string; name?: string };
  location?: {
    city?: string;
    region?: string;
    country?: string;
    remote?: boolean;
  };
  department?: { label?: string };
  function?: { label?: string };
  typeOfEmployment?: { label?: string };
  experienceLevel?: { label?: string };
};

type SmartRecruitersList = {
  totalFound: number;
  content: SmartRecruitersPosting[];
};

type SmartRecruitersDetails = SmartRecruitersPosting & {
  postingUrl?: string;
  applyUrl?: string;
  active?: boolean;
  jobAd?: {
    sections?: {
      companyDescription?: { text?: string };
      jobDescription?: { text?: string };
      qualifications?: { text?: string };
      additionalInformation?: { text?: string };
    };
  };
};

type Board = {
  identifier: string;
  source: string;
  company: string;
};

const BOARDS: Board[] = [
  { identifier: "StandardBankGroup", source: "Standard Bank", company: "Standard Bank Group" },
  { identifier: "IKhokha", source: "iKhokha", company: "iKhokha" },
  { identifier: "AECOM2", source: "AECOM", company: "AECOM" },
  { identifier: "Evolution", source: "Evolution", company: "Evolution" },
  { identifier: "Sutherland", source: "Sutherland", company: "Sutherland" },
  { identifier: "HelloKindred", source: "HelloKindred", company: "HelloKindred" },
  { identifier: "IndSAfri", source: "IndSAfri", company: "IndSAfri" },
  { identifier: "Versant3", source: "Versant Media", company: "Versant Media" },
  { identifier: "AccorHotel", source: "Accor", company: "Accor" },
  { identifier: "Visa", source: "Visa", company: "Visa" },
  { identifier: "BoschGroup", source: "Bosch", company: "Bosch" },
];


function locationText(posting: SmartRecruitersPosting) {
  const parts = [
    posting.location?.city,
    posting.location?.region,
    posting.location?.country?.toLowerCase() === "za" ? "South Africa" : posting.location?.country,
  ].filter(Boolean);
  return parts.join(", ") || "South Africa";
}

function isRelevant(posting: SmartRecruitersPosting) {
  return isItJob({
    title: posting.name,
    category: `${posting.department?.label || ""} ${posting.function?.label || ""}`,
  });
}

function detailsDescription(details: SmartRecruitersDetails) {
  const sections = details.jobAd?.sections;
  return cleanText(
    [
      sections?.jobDescription?.text,
      sections?.qualifications?.text,
      sections?.additionalInformation?.text,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

async function fetchBoard(board: Board): Promise<JobSourceResult> {
  try {
    const listUrl = new URL(
      `https://api.smartrecruiters.com/v1/companies/${board.identifier}/postings`,
    );
    listUrl.searchParams.set("country", "za");
    listUrl.searchParams.set("destination", "PUBLIC");
    listUrl.searchParams.set("limit", "100");

    const payload = await fetchJson<SmartRecruitersList>(listUrl.toString(), 8_000);

    // The public list endpoint already has enough data for the GradConnect card.
    // Avoid one extra HTTP request per vacancy; this makes multi-company refreshes
    // dramatically faster and less likely to hit a company's rate limits.
    const jobs: NormalizedJob[] = payload.content
      .filter((posting) => {
        const location = locationText(posting);
        return (
          posting.location?.country?.toLowerCase() === "za" ||
          isSouthAfricanLocation(location)
        );
      })
      .filter(isRelevant)
      .slice(0, 20)
      .map((posting) => {
        const location = locationText(posting);
        const postingUrl = `https://jobs.smartrecruiters.com/${board.identifier}/${posting.id}`;

        return {
          source: board.source,
          externalId: posting.id,
          title: cleanText(posting.name),
          company: board.company,
          description: `${posting.name} opportunity at ${board.company}. Open the listing for the full role description and requirements.`,
          location,
          jobType: posting.typeOfEmployment?.label,
          experienceLevel:
            posting.experienceLevel?.label || guessExperience(posting.name, ""),
          category:
            posting.department?.label ||
            posting.function?.label ||
            "Technology",
          currency: "ZAR",
          applyUrl: postingUrl,
          sourceUrl: postingUrl,
          remote: Boolean(posting.location?.remote),
          postedAt: posting.releasedDate ? new Date(posting.releasedDate) : undefined,
          rawData: posting as unknown as Record<string, unknown>,
        };
      });

    return { source: board.source, jobs };
  } catch (error) {
    return {
      source: board.source,
      jobs: [],
      error:
        error instanceof Error ? error.message : "Unknown SmartRecruiters error",
    };
  }
}

export async function fetchSouthAfricanSmartRecruitersJobs(): Promise<JobSourceResult[]> {
  return Promise.all(BOARDS.map(fetchBoard));
}
