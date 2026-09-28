import { jsonError, jsonSuccess } from "@/lib/api";
import { requireAdminApiUser } from "@/lib/hackathon-crawler";
import { getHackathonCrawlerAutomationStatus } from "@/lib/hackathon-github-actions";

export async function GET() {
  const admin = await requireAdminApiUser();

  if (!admin) {
    return jsonError("Admin access required", 403);
  }

  return jsonSuccess(await getHackathonCrawlerAutomationStatus());
}
