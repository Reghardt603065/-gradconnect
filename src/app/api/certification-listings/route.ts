import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function normaliseSkill(value: string) {
  return value.trim().toLowerCase();
}

function calculateMatch(
  userSkills: string[],
  listing: {
    title: string;
    category: string | null;
    skills: string[];
  },
) {
  const userSkillSet = new Set(userSkills.map(normaliseSkill));
  const matchedSkills = listing.skills.filter((skill) =>
    userSkillSet.has(normaliseSkill(skill)),
  );

  let score = matchedSkills.length * 25;
  const searchable = `${listing.title} ${listing.category || ""}`.toLowerCase();

  for (const skill of userSkills) {
    if (searchable.includes(normaliseSkill(skill))) {
      score += 10;
    }
  }

  return {
    matchScore: Math.min(100, score),
    matchedSkills,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const skill = searchParams.get("skill")?.trim();
    const free = searchParams.get("free");
    const session = await auth();

    const [certifications, user] = await Promise.all([
      prisma.certificationListing.findMany({
        where: {
          ...(search
            ? {
                OR: [
                  {
                    title: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    provider: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    description: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              }
            : {}),
          ...(skill
            ? {
                skills: {
                  has: skill,
                },
              }
            : {}),
          ...(free === "true"
            ? {
                isFree: true,
              }
            : {}),
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      session?.user?.id
        ? prisma.user.findUnique({
            where: {
              id: session.user.id,
            },
            select: {
              skills: true,
            },
          })
        : Promise.resolve(null),
    ]);

    const items = certifications
      .map((listing) => ({
        ...listing,
        ...calculateMatch(user?.skills || [], listing),
      }))
      .sort((left, right) => {
        if (right.matchScore !== left.matchScore) {
          return right.matchScore - left.matchScore;
        }

        if (right.isFree !== left.isFree) {
          return Number(right.isFree) - Number(left.isFree);
        }

        return right.createdAt.getTime() - left.createdAt.getTime();
      });

    return NextResponse.json({
      items,
      total: items.length,
    });
  } catch (error) {
    console.error("Failed to load certification listings:", error);

    return NextResponse.json(
      {
        error: "Failed to load certification listings.",
      },
      {
        status: 500,
      },
    );
  }
}
