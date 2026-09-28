import { requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export function hasValidHackathonImportToken(request: Request) {
  const configuredToken = process.env.HACKATHON_IMPORT_TOKEN?.trim() || "";

  if (!configuredToken) {
    return false;
  }

  const crawlerToken =
    request.headers.get("x-gradconnect-crawler-token")?.trim() || "";

  if (crawlerToken && crawlerToken === configuredToken) {
    return true;
  }

  const authorization = request.headers.get("authorization")?.trim() || "";
  return authorization === `Bearer ${configuredToken}`;
}

export async function requireAdminApiUser() {
  const sessionUser = await requireApiUser();

  if (!sessionUser?.id) {
    return null;
  }

  // Always verify the current role in the database.
  // This prevents a stale JWT role from blocking a user who was
  // promoted to ADMIN after their session was created.
  const user = await prisma.user.findUnique({
    where: {
      id: sessionUser.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return user;
}
