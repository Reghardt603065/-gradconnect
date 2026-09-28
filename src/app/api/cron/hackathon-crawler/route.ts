import { jsonError, jsonSuccess } from "@/lib/api";
import { scheduleHackathonCrawler } from "@/lib/hackathon-scrapyd";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return jsonError("Unauthorized", 401);
  }

  const result = await scheduleHackathonCrawler();

  if (!result.ok) {
    // If no active targets exist, return success so the scheduled job does not
    // look broken just because there is nothing to crawl yet.
    if (result.status === 422) {
      return jsonSuccess({
        scheduled: false,
        reason: result.error,
      });
    }

    return jsonError(result.error, result.status, result.details);
  }

  return jsonSuccess({
    scheduled: true,
    ...result.data,
  });
}
