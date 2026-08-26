import { jsonError, jsonSuccess, requireApiUser } from "@/lib/api";
import { subscribeToProject, withdrawFromProject } from "@/services/subscription-service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== "GRADUATE") return jsonError("Only graduate accounts can subscribe to projects.", 403);
  const { id } = await context.params;
  try {
    return jsonSuccess(await subscribeToProject(id, user.id), 201);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not subscribe to project.", 400);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== "GRADUATE") return jsonError("Only graduate accounts can subscribe to projects.", 403);
  const { id } = await context.params;
  try {
    return jsonSuccess(await withdrawFromProject(id, user.id));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not withdraw from project.", 400);
  }
}
