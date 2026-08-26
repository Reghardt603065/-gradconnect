import { jsonError, jsonSuccess, requireApiUser } from "@/lib/api";
import { getStudentProjects } from "@/services/subscription-service";

export async function GET() {
  const user = await requireApiUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== "GRADUATE") return jsonError("Only graduate accounts have subscribed projects.", 403);
  return jsonSuccess(await getStudentProjects(user.id));
}
