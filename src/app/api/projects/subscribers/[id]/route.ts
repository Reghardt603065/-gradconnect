import { jsonError, jsonSuccess, requireApiUser } from "@/lib/api";
import { getProjectSubscribers } from "@/services/subscription-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== "COMPANY") return jsonError("Only company accounts can view project subscribers.", 403);
  const { id } = await context.params;
  try {
    return jsonSuccess(await getProjectSubscribers(id, user.id));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Project not found.", 404);
  }
}
