import { jsonError, jsonSuccess, readJson } from "@/lib/api";
import { requireAdminApiUser } from "@/lib/hackathon-crawler";
import { prisma } from "@/lib/prisma";
import { hackathonCrawlTargetSchema } from "@/lib/validation";

export async function GET() {
  const admin = await requireAdminApiUser();

  if (!admin) {
    return jsonError("Admin access required", 403);
  }

  const targets = await prisma.hackathonCrawlTarget.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return jsonSuccess(targets);
}

export async function POST(request: Request) {
  const admin = await requireAdminApiUser();

  if (!admin) {
    return jsonError("Admin access required", 403);
  }

  const parsed = hackathonCrawlTargetSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return jsonError("Invalid crawl target", 422, parsed.error.flatten());
  }

  const data = parsed.data;

  const target = await prisma.hackathonCrawlTarget.upsert({
    where: {
      url: data.url,
    },
    create: {
      url: data.url,
      label: data.label || null,
      active: true,
    },
    update: {
      label: data.label || null,
      active: true,
    },
  });

  return jsonSuccess(target, 201);
}

export async function PATCH(request: Request) {
  const admin = await requireAdminApiUser();

  if (!admin) {
    return jsonError("Admin access required", 403);
  }

  const body = await readJson(request);
  const id = typeof body?.id === "string" ? body.id : "";
  const active = typeof body?.active === "boolean" ? body.active : null;

  if (!id || active === null) {
    return jsonError("Target id and active state are required", 422);
  }

  const target = await prisma.hackathonCrawlTarget.update({
    where: {
      id,
    },
    data: {
      active,
    },
  });

  return jsonSuccess(target);
}

export async function DELETE(request: Request) {
  const admin = await requireAdminApiUser();

  if (!admin) {
    return jsonError("Admin access required", 403);
  }

  const body = await readJson(request);
  const id = typeof body?.id === "string" ? body.id : "";

  if (!id) {
    return jsonError("Target id is required", 422);
  }

  await prisma.hackathonCrawlTarget.delete({
    where: {
      id,
    },
  });

  return jsonSuccess({ id });
}
