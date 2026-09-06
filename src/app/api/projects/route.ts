import { companyProjectSchema } from "@/lib/validation";
import { jsonError, jsonSuccess, readJson, requireApiUser } from "@/lib/api";
import { createProjectForUser, getAvailableProjects } from "@/services/project-service";

export async function GET() {
  const user = await requireApiUser();
  if (!user) return jsonError("Unauthorized", 401);
  return jsonSuccess(await getAvailableProjects());
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== "COMPANY") return jsonError("Only company accounts can post projects.", 403);

  const parsed = companyProjectSchema.safeParse(
    await readJson(request),
  );

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const field = firstIssue?.path.join(".");
    const message = firstIssue?.message || "Invalid project details";

    return jsonError(
      field ? `${field}: ${message}` : message,
      422,
      parsed.error.flatten(),
    );
  }

  try {
    return jsonSuccess(await createProjectForUser(user.id, parsed.data), 201);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not create project.", 400);
  }
}
