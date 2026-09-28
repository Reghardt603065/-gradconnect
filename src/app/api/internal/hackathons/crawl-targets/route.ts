import { jsonError, jsonSuccess } from "@/lib/api";
import { hasValidHackathonImportToken } from "@/lib/hackathon-crawler";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!hasValidHackathonImportToken(request)) {
    return jsonError("Unauthorized", 401);
  }

  const targets = await prisma.hackathonCrawlTarget.findMany({
    where: {
      active: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      url: true,
    },
  });

  return jsonSuccess(targets.map((target) => target.url));
}
