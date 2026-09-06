import { prisma } from "@/lib/prisma";
import { portfolioProjectUpdateSchema } from "@/lib/validation";
import {
  jsonError,
  jsonSuccess,
  readJson,
  requireApiUser,
} from "@/lib/api";
import { slugify } from "@/lib/utils";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await context.params;
  const parsed = portfolioProjectUpdateSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return jsonError(
      "Invalid project update",
      422,
      parsed.error.flatten(),
    );
  }

  const existing = await prisma.portfolioProject.findFirst({
    where: {
      id,
      userId: sessionUser.id,
    },
  });

  if (!existing) {
    return jsonError("Project not found", 404);
  }

  let slug = existing.slug;

  if (parsed.data.title && parsed.data.title !== existing.title) {
    const base = slugify(parsed.data.title) || existing.slug;
    slug = base;
    let suffix = 1;

    while (
      await prisma.portfolioProject.findFirst({
        where: {
          userId: sessionUser.id,
          slug,
          id: {
            not: existing.id,
          },
        },
        select: {
          id: true,
        },
      })
    ) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
  }

  const project = await prisma.portfolioProject.update({
    where: {
      id,
    },
    data: {
      ...parsed.data,
      slug,
      githubUrl:
        parsed.data.githubUrl === undefined
          ? undefined
          : parsed.data.githubUrl || null,
      liveUrl:
        parsed.data.liveUrl === undefined
          ? undefined
          : parsed.data.liveUrl || null,
      imageUrl:
        parsed.data.imageUrl === undefined
          ? undefined
          : parsed.data.imageUrl || null,
    },
  });

  return jsonSuccess(project);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await context.params;
  const result = await prisma.portfolioProject.deleteMany({
    where: {
      id,
      userId: sessionUser.id,
    },
  });

  if (!result.count) {
    return jsonError("Project not found", 404);
  }

  return jsonSuccess({ deleted: true });
}
