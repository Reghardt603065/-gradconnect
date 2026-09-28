import { prisma } from "@/lib/prisma";

type GitHubWorkflow = {
  id: number;
  name: string;
  path: string;
  state: string;
  html_url: string;
};

type GitHubWorkflowRun = {
  id: number;
  name?: string;
  display_title?: string;
  status: string;
  conclusion: string | null;
  event: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at?: string | null;
};

type GitHubWorkflowRunsResponse = {
  total_count: number;
  workflow_runs: GitHubWorkflowRun[];
};

type GitHubApiError = {
  message?: string;
  documentation_url?: string;
  status?: string;
  [key: string]: unknown;
};

const DEFAULT_REPOSITORY = "Reghardt603065/-gradconnect";
const DEFAULT_WORKFLOW = "hackathon-crawler.yml";
const DEFAULT_REF = "main";

function getGitHubCrawlerConfig() {
  const repository =
    process.env.GITHUB_CRAWLER_REPOSITORY?.trim() || DEFAULT_REPOSITORY;
  const [owner, repo] = repository.split("/", 2);

  return {
    token: process.env.GITHUB_CRAWLER_TOKEN?.trim() || "",
    repository,
    owner,
    repo,
    workflow:
      process.env.GITHUB_CRAWLER_WORKFLOW?.trim() || DEFAULT_WORKFLOW,
    ref: process.env.GITHUB_CRAWLER_REF?.trim() || DEFAULT_REF,
  };
}

function githubHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "GradConnect-Hackathon-Crawler",
  };
}

async function readGitHubPayload(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as GitHubApiError | Record<string, unknown>;
  } catch {
    return text;
  }
}

export async function dispatchHackathonCrawler() {
  const activeTargetCount = await prisma.hackathonCrawlTarget.count({
    where: {
      active: true,
    },
  });

  if (activeTargetCount === 0) {
    return {
      ok: false as const,
      status: 422,
      error: "Add and enable at least one crawler URL before starting the crawler.",
      details: null,
    };
  }

  const config = getGitHubCrawlerConfig();

  if (!config.owner || !config.repo) {
    return {
      ok: false as const,
      status: 500,
      error: "GITHUB_CRAWLER_REPOSITORY must use the format owner/repository.",
      details: config.repository,
    };
  }

  if (!config.token) {
    return {
      ok: false as const,
      status: 503,
      error: "GitHub Actions is not configured yet.",
      details:
        "Add GITHUB_CRAWLER_TOKEN to the Vercel Production environment variables.",
    };
  }

  const workflowPath = encodeURIComponent(config.workflow);
  const workflowUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/actions/workflows/${workflowPath}`;
  const dispatchUrl = `${workflowUrl}/dispatches`;

  try {
    // Re-enable the workflow before dispatching it. This makes the automation
    // resilient if the workflow was manually disabled in GitHub.
    const enableResponse = await fetch(`${workflowUrl}/enable`, {
      method: "PUT",
      headers: githubHeaders(config.token),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!enableResponse.ok) {
      return {
        ok: false as const,
        status: 502,
        error: "The GitHub Actions crawler workflow could not be enabled.",
        details: await readGitHubPayload(enableResponse),
      };
    }

    const response = await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        ...githubHeaders(config.token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: config.ref,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return {
        ok: false as const,
        status: 502,
        error: "GitHub received the request but could not start the crawler workflow.",
        details: await readGitHubPayload(response),
      };
    }

    return {
      ok: true as const,
      data: {
        provider: "github-actions" as const,
        status: "queued" as const,
        repository: config.repository,
        workflow: config.workflow,
        ref: config.ref,
        activeTargetCount,
      },
    };
  } catch (error) {
    return {
      ok: false as const,
      status: 503,
      error: "GitHub Actions could not be reached.",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getHackathonCrawlerAutomationStatus() {
  const config = getGitHubCrawlerConfig();

  if (!config.owner || !config.repo) {
    return {
      configured: false,
      reachable: false,
      provider: "github-actions" as const,
      repository: config.repository,
      workflow: config.workflow,
      ref: config.ref,
      error: "GITHUB_CRAWLER_REPOSITORY must use the format owner/repository.",
    };
  }

  if (!config.token) {
    return {
      configured: false,
      reachable: false,
      provider: "github-actions" as const,
      repository: config.repository,
      workflow: config.workflow,
      ref: config.ref,
      error: "GITHUB_CRAWLER_TOKEN is not configured in Vercel.",
    };
  }

  const workflowPath = encodeURIComponent(config.workflow);
  const baseUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/actions/workflows/${workflowPath}`;

  try {
    const [workflowResponse, runsResponse] = await Promise.all([
      fetch(baseUrl, {
        headers: githubHeaders(config.token),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      }),
      fetch(`${baseUrl}/runs?per_page=1`, {
        headers: githubHeaders(config.token),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      }),
    ]);

    if (!workflowResponse.ok) {
      return {
        configured: true,
        reachable: false,
        provider: "github-actions" as const,
        repository: config.repository,
        workflow: config.workflow,
        ref: config.ref,
        error: "The GitHub Actions workflow could not be found or read.",
        details: await readGitHubPayload(workflowResponse),
      };
    }

    const workflow = (await workflowResponse.json()) as GitHubWorkflow;
    let latestRun: GitHubWorkflowRun | null = null;

    if (runsResponse.ok) {
      const runs = (await runsResponse.json()) as GitHubWorkflowRunsResponse;
      latestRun = runs.workflow_runs?.[0] || null;
    }

    return {
      configured: true,
      reachable: true,
      provider: "github-actions" as const,
      repository: config.repository,
      workflow: config.workflow,
      ref: config.ref,
      workflowState: workflow.state,
      workflowUrl: workflow.html_url,
      latestRun: latestRun
        ? {
            id: latestRun.id,
            status: latestRun.status,
            conclusion: latestRun.conclusion,
            event: latestRun.event,
            htmlUrl: latestRun.html_url,
            createdAt: latestRun.created_at,
            updatedAt: latestRun.updated_at,
            startedAt: latestRun.run_started_at || null,
          }
        : null,
    };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      provider: "github-actions" as const,
      repository: config.repository,
      workflow: config.workflow,
      ref: config.ref,
      error: "GitHub Actions status could not be checked.",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
