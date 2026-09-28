import { jsonError, jsonSuccess } from "@/lib/api";
import { requireAdminApiUser } from "@/lib/hackathon-crawler";
import { dispatchHackathonCrawler } from "@/lib/hackathon-github-actions";

export async function POST() {
  const admin = await requireAdminApiUser();

  if (!admin) {
    return jsonError("Admin access required", 403);
  }

  const result = await dispatchHackathonCrawler();

  if (!result.ok) {
    return jsonError(result.error, result.status, result.details);
  }

  return jsonSuccess(result.data);
}
