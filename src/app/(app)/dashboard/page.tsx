import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
  Flame,
  FolderKanban,
  Lightbulb,
  Medal,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { buildCareerInsights } from "@/lib/career-insights";
import { prisma } from "@/lib/prisma";
import {
  getChallengeCompletionCount,
  getUserBadges,
  syncUserBadges,
} from "@/services/badge-service";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role === "COMPANY") {
    redirect("/dashboard/company");
  }

  const userId = session.user.id;

  await syncUserBadges(userId);

  const [
    user,
    applicationCount,
    certifications,
    hackathonCount,
    projectCount,
    activities,
    goals,
    challengeCompletionCount,
    badges,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        name: true,
        bio: true,
        skills: true,
        githubUsername: true,
      },
    }),
    prisma.jobApplication.count({
      where: {
        userId,
      },
    }),
    prisma.certification.findMany({
      where: {
        userId,
      },
      select: {
        progress: true,
        status: true,
      },
    }),
    prisma.hackathonParticipant.count({
      where: {
        userId,
      },
    }),
    prisma.portfolioProject.count({
      where: {
        userId,
      },
    }),
    prisma.activity.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
    }),
    prisma.goal.findMany({
      where: {
        OR: [
          {
            ownerId: userId,
          },
          {
            partnerId: userId,
          },
        ],
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        partner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    getChallengeCompletionCount(userId),
    getUserBadges(userId, 4),
  ]);

  const completedCertificationCount = certifications.filter(
    (certification) => certification.status === "COMPLETED",
  ).length;

  const averageLearningProgress = certifications.length
    ? Math.round(
        certifications.reduce(
          (total, certification) => total + certification.progress,
          0,
        ) / certifications.length,
      )
    : 0;

  const activeGoalCount = goals.filter(
    (goal) => goal.status === "ACTIVE",
  ).length;

  const momentum = Math.min(
    100,
    projectCount * 10 +
      hackathonCount * 8 +
      completedCertificationCount * 8 +
      Math.min(applicationCount, 10) * 3 +
      Math.min(challengeCompletionCount, 10) * 2 +
      Math.min(activities.length, 6) * 2,
  );

  const insights = buildCareerInsights({
    skills: user?.skills ?? [],
    hasBio: Boolean(user?.bio?.trim()),
    githubUsername: user?.githubUsername ?? null,
    applicationCount,
    certificationCount: certifications.length,
    completedCertificationCount,
    portfolioProjectCount: projectCount,
    hackathonCount,
    activeGoalCount,
    challengeCompletionCount,
  });

  const stats = [
    ["Applications", applicationCount, BriefcaseBusiness, "/applications"],
    ["Certifications", certifications.length, Award, "/certifications"],
    ["Hackathons joined", hackathonCount, Trophy, "/hackathons"],
    ["Portfolio projects", projectCount, FolderKanban, "/portfolio"],
  ] as const;

  const firstName = (user?.name || "Graduate").split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here is a quick overview of your career-building activity."
      />

      <section className="banner">
        <h2>Keep learning. Keep building.</h2>
        <p>
          Your technical momentum score is <strong>{momentum}%</strong>. One
          small, consistent action today keeps your portfolio moving forward.
        </p>
      </section>

      <section className="grid grid-4">
        {stats.map(([label, value, Icon, href]) => (
          <Link href={href} className="card stat-card" key={label}>
            <div>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>

            <span className="icon-box">
              <Icon size={21} />
            </span>
          </Link>
        ))}
      </section>

      <section className="grid grid-3 dashboard-metrics">
        <article className="card">
          <h3>
            <TrendingUp size={19} /> Technical momentum
          </h3>
          <div className="stat-value">{momentum}%</div>
          <div className="progress">
            <span style={{ width: `${momentum}%` }} />
          </div>
          <p className="muted">
            Based on projects, completed learning, applications, hackathons,
            coding challenges and recent activity.
          </p>
        </article>

        <article className="card">
          <h3>
            <Award size={19} /> Learning progress
          </h3>
          <div className="stat-value">{averageLearningProgress}%</div>
          <div className="progress">
            <span style={{ width: `${averageLearningProgress}%` }} />
          </div>
          <p className="muted">
            Average progress across all certifications in your skills ledger.
          </p>
        </article>

        <article className="card">
          <h3>
            <Target size={19} /> Active goals
          </h3>
          <div className="stat-value">{activeGoalCount}</div>
          <p className="muted">
            Use personal or shared goals to turn your next step into visible
            progress.
          </p>
          <Link href="/peers" className="link">
            Open goals <ArrowRight size={14} />
          </Link>
        </article>
      </section>

      <section className="grid grid-2 dashboard-sections">
        <article className="card">
          <h2>
            <Lightbulb size={20} /> Recommended next steps
          </h2>

          <div className="list">
            {insights.map((insight) => (
              <Link
                key={`${insight.title}-${insight.href}`}
                href={insight.href}
                className="list-item dashboard-insight"
              >
                <div>
                  <strong>{insight.title}</strong>
                  <div className="helper">{insight.message}</div>
                </div>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>
            <Medal size={20} /> Achievements
          </h2>

          {badges.length ? (
            <div className="list">
              {badges.map((badge) => (
                <div className="list-item" key={badge.id}>
                  <div>
                    <strong>{badge.name}</strong>
                    <div className="helper">{badge.description}</div>
                  </div>
                  <span className="badge gold">Earned</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty compact-empty">
              Complete profile, learning, project and collaboration milestones
              to unlock achievements.
            </div>
          )}

          <Link href="/growth" className="link dashboard-card-link">
            <Flame size={15} /> Open growth centre
          </Link>
        </article>
      </section>

      <section className="grid grid-2 dashboard-sections">
        <article className="card">
          <h2>Recent activity</h2>

          {activities.length ? (
            <div className="list">
              {activities.map((activity) => (
                <div className="list-item" key={activity.id}>
                  <div>
                    <strong>{activity.message}</strong>
                    <div className="helper">
                      {activity.createdAt.toLocaleDateString("en-ZA")}
                    </div>
                  </div>
                  <span className="badge gold">
                    {activity.type.replaceAll("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty compact-empty">
              Your activity will appear here after you save jobs, add projects
              and update goals.
            </div>
          )}
        </article>

        <article className="card">
          <h2>Accountability goals</h2>

          {goals.length ? (
            <div className="list">
              {goals.map((goal) => {
                const otherPerson =
                  goal.ownerId === userId ? goal.partner : goal.owner;

                return (
                  <div key={goal.id}>
                    <div className="list-item">
                      <div>
                        <strong>{goal.title}</strong>
                        <div className="helper">
                          {otherPerson
                            ? `With ${otherPerson.name}`
                            : "Personal goal"}
                        </div>
                      </div>
                      <span className="badge blue">{goal.progress}%</span>
                    </div>
                    <div className="progress">
                      <span style={{ width: `${goal.progress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty compact-empty">
              Create a personal or shared goal with a peer.
            </div>
          )}
        </article>
      </section>
    </>
  );
}
