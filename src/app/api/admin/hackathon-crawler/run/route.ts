import { jsonError, jsonSuccess } from "@/lib/api";
import { requireAdminApiUser } from "@/lib/hackathon-crawler";
import { scheduleHackathonCrawler } from "@/lib/hackathon-scrapyd";

export async function POST() {
  const admin = await requireAdminApiUser();

  if (!admin) {
    return jsonError("Admin access required", 403);
  }

  const result = await scheduleHackathonCrawler();

  if (!result.ok) {
    return jsonError(result.error, result.status, result.details);
  }

  return jsonSuccess(result.data);
}
