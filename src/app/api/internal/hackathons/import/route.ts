import type { Prisma } from "@/generated/prisma/client";
import { jsonError, jsonSuccess, readJson } from "@/lib/api";
import { hasValidHackathonCrawlerAuth } from "@/lib/hackathon-crawler";
import { prisma } from "@/lib/prisma";
import { hackathonCrawlImportSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!(await hasValidHackathonCrawlerAuth(request))) {
    return jsonError("Unauthorized", 401);
  }

  const parsed = hackathonCrawlImportSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return jsonError("Invalid crawler result", 422, parsed.error.flatten());
  }

  const data = parsed.data;
  const targetUrl = data.target_url || data.source_url;

  const target = await prisma.hackathonCrawlTarget.findUnique({
    where: {
      url: targetUrl,
    },
    select: {
      id: true,
    },
  });

  const rawData = JSON.parse(
    JSON.stringify({
      name: data.name,
      description: data.description ?? null,
      start_date: data.start_date ?? null,
      end_date: data.end_date ?? null,
      location: data.location ?? null,
      mode: data.mode ?? null,
      source_url: data.source_url,
      target_url: data.target_url ?? null,
    }),
  ) as Prisma.InputJsonValue;

  const result = await prisma.hackathonCrawlResult.upsert({
    where: {
      sourceUrl_name: {
        sourceUrl: data.source_url,
        name: data.name,
      },
    },
    create: {
      targetId: target?.id ?? null,
      name: data.name,
      description: data.description || null,
      startDate: data.start_date || null,
      endDate: data.end_date || null,
      location: data.location || null,
      mode: data.mode || null,
      sourceUrl: data.source_url,
      rawData,
    },
    update: {
      targetId: target?.id ?? undefined,
      description: data.description || null,
      startDate: data.start_date || null,
      endDate: data.end_date || null,
      location: data.location || null,
      mode: data.mode || null,
      rawData,
      status: "NEW",
      reviewedAt: null,
      discoveredAt: new Date(),
    },
  });

  return jsonSuccess(
    {
      id: result.id,
      status: result.status,
    },
    201,
  );
}
