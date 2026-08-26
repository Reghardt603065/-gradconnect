import { jsonError, jsonSuccess, requireApiUser } from "@/lib/api";
import { ingestJobs, JOB_REFRESH_MARKER } from "@/lib/job-sources";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REFRESH_AFTER_MS = 6 * 60 * 60 * 1000;
let activeRefresh: Promise<unknown> | null = null;

async function refreshJobsOnce() {
  if (!activeRefresh) {
    activeRefresh = ingestJobs().finally(() => {
      activeRefresh = null;
    });
  }
  return activeRefresh;
}

export async function POST() {
  const sessionUser = await requireApiUser();
  if (!sessionUser) return jsonError("Unauthorized", 401);

  const latest = await prisma.jobFetchLog.findFirst({
    where: {
      source: JOB_REFRESH_MARKER,
      completedAt: { not: null },
    },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });

  const lastRefresh = latest?.completedAt?.getTime() || 0;
  const stale = Date.now() - lastRefresh > REFRESH_AFTER_MS;

  if (!stale) {
    return jsonSuccess({ refreshed: false, reason: "fresh" });
  }

  const summary = await refreshJobsOnce();
  return jsonSuccess({ refreshed: true, summary });
}
