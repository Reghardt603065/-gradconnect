import { prisma } from "@/lib/prisma";
import { companySchema } from "@/lib/validation";
import { jsonError, jsonSuccess, readJson, requireApiUser } from "@/lib/api";

export async function GET() {
  const user = await requireApiUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== "COMPANY") return jsonError("Only company accounts can manage a company profile.", 403);
  const company = await prisma.company.findUnique({ where: { ownerId: user.id } });
  return jsonSuccess(company);
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== "COMPANY") return jsonError("Only company accounts can manage a company profile.", 403);

  const parsed = companySchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Invalid company details", 422, parsed.error.flatten());

  const company = await prisma.company.upsert({
    where: { ownerId: user.id },
    update: parsed.data,
    create: { ownerId: user.id, ...parsed.data },
  });
  return jsonSuccess(company);
}
