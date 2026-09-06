import { getProjectForUser, updateProjectForUser } from "@/services/project-service";
import { projectUpdateSchema } from "@/lib/validation";
import { jsonError, jsonSuccess, readJson, requireApiUser } from "@/lib/api";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await context.params;
  try {
    return jsonSuccess(await getProjectForUser(id, user.id));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Project not found.", 404);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== "COMPANY") return jsonError("Only company accounts can manage projects.", 403);
  const { id } = await context.params;
  const parsed = projectUpdateSchema.safeParse(
    await readJson(request),
  );

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const field = firstIssue?.path.join(".");
    const message = firstIssue?.message || "Invalid project update";

    return jsonError(
      field ? `${field}: ${message}` : message,
      422,
      parsed.error.flatten(),
    );
  }

  try {
    return jsonSuccess(await updateProjectForUser(user.id, id, parsed.data));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not update project.", 400);
  }
}
