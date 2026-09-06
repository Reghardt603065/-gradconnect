import { prisma } from "@/lib/prisma";
import {
  jsonError,
  jsonSuccess,
  readJson,
  requireApiUser,
} from "@/lib/api";
import { profileSchema } from "@/lib/validation";
import { recordActivity } from "@/lib/activity";

export async function GET() {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: {
      id: sessionUser.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      headline: true,
      bio: true,
      image: true,
      location: true,
      skills: true,
      githubUsername: true,
      linkedinUrl: true,
      createdAt: true,
      role: true,
    },
  });

  return jsonSuccess(user);
}

export async function PATCH(request: Request) {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  const body = await readJson(request);
  const parsed = profileSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      "Invalid profile data",
      422,
      parsed.error.flatten(),
    );
  }

  const usernameOwner = await prisma.user.findUnique({
    where: {
      username: parsed.data.username,
    },
  });

  if (usernameOwner && usernameOwner.id !== sessionUser.id) {
    return jsonError("That username is already taken", 409);
  }

  const user = await prisma.user.update({
    where: {
      id: sessionUser.id,
    },
    data: {
      name: parsed.data.name,
      username: parsed.data.username,
      headline: parsed.data.headline || null,
      bio: parsed.data.bio || null,
      location: parsed.data.location || null,
      skills: parsed.data.skills,
      githubUsername: parsed.data.githubUsername || null,
      linkedinUrl: parsed.data.linkedinUrl || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      headline: true,
      bio: true,
      location: true,
      skills: true,
      githubUsername: true,
      linkedinUrl: true,
      image: true,
    },
  });

  await recordActivity(
    sessionUser.id,
    "PROFILE_UPDATED",
    "Updated profile information",
  );

  return jsonSuccess(user);
}

export async function DELETE() {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  await prisma.user.delete({
    where: {
      id: sessionUser.id,
    },
  });

  return jsonSuccess({
    deleted: true,
  });
}
