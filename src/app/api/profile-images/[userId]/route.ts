import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;

  const image = await prisma.profileImage.findUnique({
    where: {
      userId,
    },
    select: {
      mimeType: true,
      size: true,
      data: true,
      updatedAt: true,
    },
  });

  if (!image) {
    return new Response(null, {
      status: 404,
    });
  }

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Content-Length": String(image.size),
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Last-Modified": image.updatedAt.toUTCString(),
    },
  });
}
