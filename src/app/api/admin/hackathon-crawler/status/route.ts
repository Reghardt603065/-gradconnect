import { jsonError, jsonSuccess } from "@/lib/api";
import { requireAdminApiUser } from "@/lib/hackathon-crawler";
import { getHackathonCrawlerStatus } from "@/lib/hackathon-scrapyd";

export async function GET() {
  const admin = await requireAdminApiUser();

  if (!admin) {
    return jsonError("Admin access required", 403);
  }

  return jsonSuccess(await getHackathonCrawlerStatus());
}
