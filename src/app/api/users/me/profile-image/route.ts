import { prisma } from "@/lib/prisma";
import {
  jsonError,
  jsonSuccess,
  requireApiUser,
} from "@/lib/api";

const MAX_PROFILE_IMAGE_BYTES = 1_000_000;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(request: Request) {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  const formData = await request.formData();
  const value = formData.get("image");

  if (!(value instanceof File) || value.size === 0) {
    return jsonError("Choose a profile image", 422);
  }

  if (!ALLOWED_IMAGE_TYPES.has(value.type)) {
    return jsonError("Use a JPG, PNG or WebP profile image", 422);
  }

  if (value.size > MAX_PROFILE_IMAGE_BYTES) {
    return jsonError("Profile images must be 1 MB or smaller", 422);
  }

  const bytes = new Uint8Array(await value.arrayBuffer());

  const image = await prisma.profileImage.upsert({
    where: {
      userId: sessionUser.id,
    },
    create: {
      userId: sessionUser.id,
      mimeType: value.type,
      size: value.size,
      data: bytes,
    },
    update: {
      mimeType: value.type,
      size: value.size,
      data: bytes,
    },
    select: {
      id: true,
      updatedAt: true,
    },
  });

  return jsonSuccess({
    imageUrl: `/api/profile-images/${sessionUser.id}?v=${image.updatedAt.getTime()}`,
  });
}

export async function DELETE() {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  await prisma.profileImage.deleteMany({
    where: {
      userId: sessionUser.id,
    },
  });

  return jsonSuccess({
    deleted: true,
  });
}
