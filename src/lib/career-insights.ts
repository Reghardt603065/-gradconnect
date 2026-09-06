export type CareerInsight = {
  title: string;
  message: string;
  href: string;
};

type InsightInput = {
  skills: string[];
  hasBio: boolean;
  githubUsername: string | null;
  applicationCount: number;
  certificationCount: number;
  completedCertificationCount: number;
  portfolioProjectCount: number;
  hackathonCount: number;
  activeGoalCount: number;
  challengeCompletionCount: number;
};

export function buildCareerInsights(input: InsightInput): CareerInsight[] {
  const insights: CareerInsight[] = [];

  if (!input.hasBio || input.skills.length < 3) {
    insights.push({
      title: "Strengthen your profile",
      message: "Add a short bio and at least three technical skills so employers and peers can understand your focus quickly.",
      href: "/profile",
    });
  }

  if (!input.githubUsername) {
    insights.push({
      title: "Connect GitHub",
      message: "Add your GitHub username and sync repositories so your portfolio contains practical coding evidence.",
      href: "/portfolio",
    });
  }

  if (input.portfolioProjectCount === 0) {
    insights.push({
      title: "Add your first project",
      message: "A practical project gives recruiters something concrete to review alongside your qualification.",
      href: "/portfolio",
    });
  }

  if (input.certificationCount === 0) {
    insights.push({
      title: "Choose a certification",
      message: "Use the personalised certification recommendations to start a learning target that matches your skills.",
      href: "/certifications",
    });
  } else if (input.completedCertificationCount === 0) {
    insights.push({
      title: "Finish a learning target",
      message: "You already have certifications in progress. Completing one will strengthen your skills ledger and portfolio.",
      href: "/certifications",
    });
  }

  if (input.applicationCount === 0) {
    insights.push({
      title: "Track an application",
      message: "Save a suitable role and start tracking your application status, deadline and notes.",
      href: "/jobs",
    });
  }

  if (input.hackathonCount === 0) {
    insights.push({
      title: "Join a hackathon",
      message: "Hackathons add teamwork and real-world project evidence to your profile.",
      href: "/hackathons",
    });
  }

  if (input.activeGoalCount === 0) {
    insights.push({
      title: "Create an accountability goal",
      message: "A personal or shared goal can turn your next career step into visible progress.",
      href: "/peers",
    });
  }

  if (input.challengeCompletionCount === 0) {
    insights.push({
      title: "Complete today's coding challenge",
      message: "A short daily problem is an easy way to keep technical problem-solving active between larger projects.",
      href: "/growth",
    });
  }

  if (!insights.length) {
    insights.push({
      title: "Keep your momentum",
      message: "Your core career-building areas are active. Keep applying, learning, building and collaborating consistently.",
      href: "/dashboard",
    });
  }

  return insights.slice(0, 5);
}
