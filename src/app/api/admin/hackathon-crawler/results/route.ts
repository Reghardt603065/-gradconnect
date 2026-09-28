import { jsonError, jsonSuccess, readJson } from "@/lib/api";
import { requireAdminApiUser } from "@/lib/hackathon-crawler";
import { prisma } from "@/lib/prisma";

const LIVE_MODES = new Set(["ONLINE", "IN_PERSON", "HYBRID"]);

function parseCrawlerDate(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function withPublishedState<
  T extends {
    name: string;
    sourceUrl: string;
  },
>(results: T[]) {
  if (!results.length) return [];

  const sourceUrls = [...new Set(results.map((result) => result.sourceUrl))];

  const liveHackathons = await prisma.hackathon.findMany({
    where: {
      websiteUrl: {
        in: sourceUrls,
      },
    },
    select: {
      id: true,
      name: true,
      websiteUrl: true,
    },
  });

  const liveByKey = new Map(
    liveHackathons.map((hackathon) => [
      `${hackathon.websiteUrl || ""}\u0000${hackathon.name.toLowerCase()}`,
      hackathon.id,
    ]),
  );

  return results.map((result) => {
    const publishedHackathonId =
      liveByKey.get(`${result.sourceUrl}\u0000${result.name.toLowerCase()}`) || null;

    return {
      ...result,
      published: Boolean(publishedHackathonId),
      publishedHackathonId,
    };
  });
}

export async function GET(request: Request) {
  const admin = await requireAdminApiUser();

  if (!admin) {
    return jsonError("Admin access required", 403);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const results = await prisma.hackathonCrawlResult.findMany({
    where:
      status === "NEW" || status === "REVIEWED" || status === "DISMISSED"
        ? { status }
        : undefined,
    include: {
      target: {
        select: {
          label: true,
          url: true,
        },
      },
    },
    orderBy: {
      discoveredAt: "desc",
    },
    take: 250,
  });

  return jsonSuccess(await withPublishedState(results));
}

export async function PATCH(request: Request) {
  const admin = await requireAdminApiUser();

  if (!admin) {
    return jsonError("Admin access required", 403);
  }

  const body = await readJson(request);
  const id = typeof body?.id === "string" ? body.id : "";
  const status = body?.status;

  if (!id || !["NEW", "REVIEWED", "DISMISSED"].includes(status)) {
    return jsonError("A valid result id and status are required", 422);
  }

  const crawlResult = await prisma.hackathonCrawlResult.findUnique({
    where: {
      id,
    },
    include: {
      target: {
        select: {
          label: true,
          url: true,
        },
      },
    },
  });

  if (!crawlResult) {
    return jsonError("Crawler result was not found", 404);
  }

  if (status === "REVIEWED") {
    const startDate = parseCrawlerDate(crawlResult.startDate);

    if (!startDate) {
      return jsonError(
        `Cannot publish '${crawlResult.name}' because the crawler did not find a valid start date. Verify the source and create this event manually if needed.`,
        422,
      );
    }

    const endDate = parseCrawlerDate(crawlResult.endDate) || startDate;

    if (endDate < startDate) {
      return jsonError(
        `Cannot publish '${crawlResult.name}' because its end date is before its start date.`,
        422,
      );
    }

    const mode =
      crawlResult.mode && LIVE_MODES.has(crawlResult.mode)
        ? crawlResult.mode
        : "UNKNOWN";

    const description =
      crawlResult.description?.trim() ||
      "No description was extracted by the crawler. See the source website for full event details.";

    const updated = await prisma.$transaction(async (tx) => {
      const existingHackathon = await tx.hackathon.findFirst({
        where: {
          name: crawlResult.name,
          websiteUrl: crawlResult.sourceUrl,
        },
        select: {
          id: true,
        },
      });

      if (!existingHackathon) {
        await tx.hackathon.create({
          data: {
            createdById: admin.id,
            name: crawlResult.name,
            description,
            location: crawlResult.location || null,
            mode,
            startDate,
            endDate,
            registrationDeadline: null,
            websiteUrl: crawlResult.sourceUrl,
            technologies: [],
            source: "GradConnect Crawler",
          },
        });
      }

      return tx.hackathonCrawlResult.update({
        where: {
          id,
        },
        data: {
          status: "REVIEWED",
          reviewedAt: new Date(),
        },
        include: {
          target: {
            select: {
              label: true,
              url: true,
            },
          },
        },
      });
    });

    const [publishedResult] = await withPublishedState([updated]);
    return jsonSuccess(publishedResult);
  }

  const result = await prisma.hackathonCrawlResult.update({
    where: {
      id,
    },
    data: {
      status,
      reviewedAt: status === "NEW" ? null : new Date(),
    },
    include: {
      target: {
        select: {
          label: true,
          url: true,
        },
      },
    },
  });

  const [resultWithPublishedState] = await withPublishedState([result]);
  return jsonSuccess(resultWithPublishedState);
}

export async function DELETE(request: Request) {
  const admin = await requireAdminApiUser();

  if (!admin) {
    return jsonError("Admin access required", 403);
  }

  const body = await readJson(request);
  const id = typeof body?.id === "string" ? body.id : "";

  if (!id) {
    return jsonError("Result id is required", 422);
  }

  await prisma.hackathonCrawlResult.delete({
    where: {
      id,
    },
  });

  return jsonSuccess({ id });
}
