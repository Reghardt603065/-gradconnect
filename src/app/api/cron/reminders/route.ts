import { jsonError, jsonSuccess } from "@/lib/api";
import { runCareerReminders } from "@/services/reminder-service";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return jsonError("Unauthorized", 401);
  }

  const summary = await runCareerReminders();
  return jsonSuccess(summary);
}

export const POST = GET;
