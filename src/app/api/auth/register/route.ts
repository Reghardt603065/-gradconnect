import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonSuccess, readJson } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

function requestKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function POST(request: Request) {
  const limit = rateLimit(`register:${requestKey(request)}`, 5, 15 * 60_000);
  if (!limit.allowed) return jsonError("Too many registration attempts. Try again later.", 429);

  const body = await readJson(request);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return jsonError("Please correct the registration details", 422, parsed.error.flatten());

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return jsonError("An account with this email already exists", 409);

  const base = slugify(parsed.data.name) || `graduate-${Date.now()}`;
  let username = base;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${base}-${suffix++}`;
  }

  const passwordHash = await hash(parsed.data.password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        username,
        role: parsed.data.accountType,
        skills: parsed.data.accountType === "GRADUATE" ? parsed.data.skills : [],
        consentAcceptedAt: new Date(),
        notificationPreference: { create: {} },
        notifications: {
          create: {
            type: "SYSTEM",
            title: "Welcome to GradConnect",
            message: parsed.data.accountType === "COMPANY"
              ? "Complete your company profile and publish your first project opportunity."
              : "Complete your profile, add a certification, and explore graduate opportunities.",
            link: parsed.data.accountType === "COMPANY" ? "/companies/register" : "/profile",
          },
        },
      },
      select: { id: true, name: true, email: true, username: true, role: true },
    });

    if (parsed.data.accountType === "COMPANY") {
      await tx.company.create({
        data: {
          ownerId: createdUser.id,
          name: parsed.data.companyName,
          email: parsed.data.companyEmail || parsed.data.email,
          contactPerson: parsed.data.name,
        },
      });
    }
    return createdUser;
  });

  return jsonSuccess(user, 201);
}
