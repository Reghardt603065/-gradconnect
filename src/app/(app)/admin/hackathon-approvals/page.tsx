import { redirect } from "next/navigation";

import { HackathonSubmissionAdmin } from "@/components/hackathon-submission-admin";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export default async function HackathonApprovalsPage() {
  const user = await requireUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const submissions = await prisma.hackathonSubmission.findMany({
    include: {
      submittedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      reviewedBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
    take: 250,
  });

  return (
    <>
      <PageHeader
        title="Hackathon approvals"
        description="Review hackathons submitted by GradConnect users. Nothing becomes public until an admin approves it."
      />
      <HackathonSubmissionAdmin
        initial={submissions.map((submission) => ({
          id: submission.id,
          name: submission.name,
          description: submission.description,
          location: submission.location,
          mode: submission.mode,
          startDate: submission.startDate.toISOString(),
          endDate: submission.endDate.toISOString(),
          registrationDeadline:
            submission.registrationDeadline?.toISOString() || null,
          websiteUrl: submission.websiteUrl,
          technologies: submission.technologies,
          status: submission.status,
          submittedAt: submission.submittedAt.toISOString(),
          reviewedAt: submission.reviewedAt?.toISOString() || null,
          publishedHackathonId: submission.publishedHackathonId,
          submittedBy: submission.submittedBy,
          reviewedBy: submission.reviewedBy,
        }))}
      />
    </>
  );
}
