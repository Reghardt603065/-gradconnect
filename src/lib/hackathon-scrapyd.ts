import { prisma } from "@/lib/prisma";

type ScrapydResponse = {
  status?: string;
  jobid?: string;
  message?: string;
  [key: string]: unknown;
};

export function getScrapydUrl() {
  return (
    process.env.HACKATHON_SCRAPYD_URL || "http://localhost:6800"
  ).replace(/\/$/, "");
}

export function getScrapydProject() {
  return process.env.HACKATHON_SCRAPYD_PROJECT || "hackathon_crawler";
}

export function getScrapydHeaders(): Record<string, string> {
  const username = process.env.HACKATHON_SCRAPYD_USERNAME;
  const password = process.env.HACKATHON_SCRAPYD_PASSWORD;

  if (!username || !password) {
    return {};
  }

  const encoded = Buffer.from(`${username}:${password}`).toString("base64");

  return {
    Authorization: `Basic ${encoded}`,
  };
}

export async function scheduleHackathonCrawler() {
  const activeTargetCount = await prisma.hackathonCrawlTarget.count({
    where: {
      active: true,
    },
  });

  if (activeTargetCount === 0) {
    return {
      ok: false as const,
      status: 422,
      error: "Add and enable at least one crawler URL before starting the crawler.",
      details: null,
    };
  }

  const scrapydUrl = getScrapydUrl();
  const body = new URLSearchParams({
    project: getScrapydProject(),
    spider: "hackathon_spider",
  });

  try {
    const response = await fetch(`${scrapydUrl}/schedule.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...getScrapydHeaders(),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    const text = await response.text();
    let payload: ScrapydResponse | string = text;

    try {
      payload = JSON.parse(text) as ScrapydResponse;
    } catch {
      // Keep raw text when Scrapyd returns a non-JSON error.
    }

    const scrapydReportedError =
      typeof payload === "object" &&
      payload !== null &&
      typeof payload.status === "string" &&
      payload.status.toLowerCase() !== "ok";

    if (!response.ok || scrapydReportedError) {
      const detail =
        typeof payload === "object" && payload !== null && payload.message
          ? payload.message
          : payload;

      return {
        ok: false as const,
        status: 502,
        error: "Scrapyd received the request but could not start the crawler.",
        details: detail,
      };
    }

    return {
      ok: true as const,
      data: {
        ...((typeof payload === "object" && payload !== null)
          ? payload
          : { response: payload }),
        activeTargetCount,
      },
    };
  } catch (error) {
    return {
      ok: false as const,
      status: 503,
      error: "Crawler service is not reachable.",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getHackathonCrawlerStatus() {
  const scrapydUrl = getScrapydUrl();

  try {
    const response = await fetch(`${scrapydUrl}/daemonstatus.json`, {
      headers: {
        ...getScrapydHeaders(),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    const text = await response.text();
    let payload: unknown = text;

    try {
      payload = JSON.parse(text);
    } catch {
      // Keep raw text if Scrapyd does not return JSON.
    }

    if (!response.ok) {
      return {
        reachable: false,
        scrapydUrl,
        details: payload,
      };
    }

    return {
      reachable: true,
      scrapydUrl,
      daemon: payload,
    };
  } catch (error) {
    return {
      reachable: false,
      scrapydUrl,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
