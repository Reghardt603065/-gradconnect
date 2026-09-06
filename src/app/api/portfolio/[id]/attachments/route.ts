import { prisma } from "@/lib/prisma";
import { jsonError, jsonSuccess, requireApiUser } from "@/lib/api";

const MAX_FILE_BYTES = 2_000_000;
const MAX_FILES_PER_PROJECT = 10;
const MAX_FILES_PER_REQUEST = 5;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
]);

function attachmentMetadata(attachment: {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}) {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    createdAt: attachment.createdAt.toISOString(),
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await context.params;
  const project = await prisma.portfolioProject.findFirst({
    where: {
      id,
      userId: sessionUser.id,
    },
    include: {
      _count: {
        select: {
          attachments: true,
        },
      },
    },
  });

  if (!project) {
    return jsonError("Project not found", 404);
  }

  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!files.length) {
    return jsonError("Choose at least one file", 422);
  }

  if (files.length > MAX_FILES_PER_REQUEST) {
    return jsonError(`Upload at most ${MAX_FILES_PER_REQUEST} files at a time`, 422);
  }

  if (project._count.attachments + files.length > MAX_FILES_PER_PROJECT) {
    return jsonError(`A project can have at most ${MAX_FILES_PER_PROJECT} files`, 422);
  }

  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return jsonError(`Unsupported file type: ${file.name}`, 422);
    }

    if (file.size > MAX_FILE_BYTES) {
      return jsonError(`${file.name} is larger than 2 MB`, 422);
    }
  }

  const payloads = await Promise.all(
    files.map(async (file) => ({
      fileName: file.name.slice(0, 180),
      mimeType: file.type,
      size: file.size,
      data: new Uint8Array(await file.arrayBuffer()),
    })),
  );

  const created = await prisma.$transaction(
    payloads.map((payload) =>
      prisma.portfolioAttachment.create({
        data: {
          projectId: project.id,
          ...payload,
        },
      }),
    ),
  );

  return jsonSuccess(
    created.map(attachmentMetadata),
    201,
  );
}
