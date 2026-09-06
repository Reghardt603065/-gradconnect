import { prisma } from "@/lib/prisma";
import { jsonError, jsonSuccess, requireApiUser } from "@/lib/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await context.params;
  const attachment = await prisma.portfolioAttachment.findUnique({
    where: {
      id: attachmentId,
    },
  });

  if (!attachment) {
    return jsonError("File not found", 404);
  }

  const safeName = attachment.fileName.replace(/["\r\n]/g, "");

  return new Response(new Uint8Array(attachment.data), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(attachment.size),
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ attachmentId: string }> },
) {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  const { attachmentId } = await context.params;
  const attachment = await prisma.portfolioAttachment.findFirst({
    where: {
      id: attachmentId,
      project: {
        userId: sessionUser.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (!attachment) {
    return jsonError("File not found", 404);
  }

  await prisma.portfolioAttachment.delete({
    where: {
      id: attachment.id,
    },
  });

  return jsonSuccess({ deleted: true });
}
