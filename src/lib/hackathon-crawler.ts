import { requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_OIDC_AUDIENCE = "gradconnect-crawler";
const GITHUB_OIDC_JWKS_URL =
  "https://token.actions.githubusercontent.com/.well-known/jwks";

const DEFAULT_REPOSITORY = "Reghardt603065/-gradconnect";
const DEFAULT_WORKFLOW = "hackathon-crawler.yml";
const DEFAULT_REF = "main";

type GitHubOidcPayload = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  repository?: string;
  ref?: string;
  workflow_ref?: string;
  event_name?: string;
};

type JsonWebKeyWithKid = JsonWebKey & {
  kid?: string;
  alg?: string;
  use?: string;
};

type GitHubJwks = {
  keys?: JsonWebKeyWithKid[];
};

let jwksCache: { expiresAt: number; keys: JsonWebKeyWithKid[] } | null = null;

function getExpectedGitHubWorkflowIdentity() {
  const repository =
    process.env.GITHUB_CRAWLER_REPOSITORY?.trim() || DEFAULT_REPOSITORY;
  const workflow =
    process.env.GITHUB_CRAWLER_WORKFLOW?.trim() || DEFAULT_WORKFLOW;
  const ref = process.env.GITHUB_CRAWLER_REF?.trim() || DEFAULT_REF;

  return {
    repository,
    ref: `refs/heads/${ref}`,
    workflowRef: `${repository}/.github/workflows/${workflow}@refs/heads/${ref}`,
  };
}

function decodeBase64UrlJson<T>(value: string): T | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function decodeBase64UrlBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  return Buffer.from(padded, "base64");
}

async function getGitHubJwks() {
  const now = Date.now();

  if (jwksCache && jwksCache.expiresAt > now) {
    return jwksCache.keys;
  }

  const response = await fetch(GITHUB_OIDC_JWKS_URL, {
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`GitHub OIDC JWKS returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as GitHubJwks;
  const keys = Array.isArray(payload.keys) ? payload.keys : [];

  jwksCache = {
    keys,
    expiresAt: now + 60 * 60 * 1000,
  };

  return keys;
}

async function verifyGitHubActionsOidcToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeBase64UrlJson<{ alg?: string; kid?: string }>(
    encodedHeader,
  );
  const payload = decodeBase64UrlJson<GitHubOidcPayload>(encodedPayload);

  if (!header || !payload || header.alg !== "RS256" || !header.kid) {
    return false;
  }

  const keys = await getGitHubJwks();
  const jwk = keys.find((key) => key.kid === header.kid);

  if (!jwk) {
    // GitHub may have rotated signing keys. Drop the cache so the next request
    // immediately fetches the current key set.
    jwksCache = null;
    return false;
  }

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["verify"],
  );

  const signingInput = new TextEncoder().encode(
    `${encodedHeader}.${encodedPayload}`,
  );
  const signature = Uint8Array.from(decodeBase64UrlBytes(encodedSignature));

  const signatureValid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    signature,
    signingInput,
  );

  if (!signatureValid) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const clockSkewSeconds = 60;

  if (payload.iss !== GITHUB_OIDC_ISSUER) {
    return false;
  }

  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(GITHUB_OIDC_AUDIENCE)) {
    return false;
  }

  if (!payload.exp || payload.exp < now - clockSkewSeconds) {
    return false;
  }

  if (payload.nbf && payload.nbf > now + clockSkewSeconds) {
    return false;
  }

  const expected = getExpectedGitHubWorkflowIdentity();

  if (
    !payload.repository ||
    payload.repository.toLowerCase() !== expected.repository.toLowerCase()
  ) {
    return false;
  }

  if (payload.ref !== expected.ref) {
    return false;
  }

  if (
    !payload.workflow_ref ||
    payload.workflow_ref.toLowerCase() !== expected.workflowRef.toLowerCase()
  ) {
    return false;
  }

  if (payload.event_name !== "workflow_dispatch") {
    return false;
  }

  return true;
}

function hasValidLegacyImportToken(request: Request) {
  const configuredToken = process.env.HACKATHON_IMPORT_TOKEN?.trim() || "";

  if (!configuredToken) {
    return false;
  }

  const crawlerToken =
    request.headers.get("x-gradconnect-crawler-token")?.trim() || "";

  if (crawlerToken && crawlerToken === configuredToken) {
    return true;
  }

  const authorization = request.headers.get("authorization")?.trim() || "";
  return authorization === `Bearer ${configuredToken}`;
}

export async function hasValidHackathonCrawlerAuth(request: Request) {
  // Keep the original token flow for local development and backwards
  // compatibility, but production GitHub Actions no longer depends on it.
  if (hasValidLegacyImportToken(request)) {
    return true;
  }

  const authorization = request.headers.get("authorization")?.trim() || "";

  if (!authorization.startsWith("Bearer ")) {
    return false;
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return false;
  }

  try {
    return await verifyGitHubActionsOidcToken(token);
  } catch (error) {
    console.error("GitHub Actions OIDC verification failed", error);
    return false;
  }
}

export async function requireAdminApiUser() {
  const sessionUser = await requireApiUser();

  if (!sessionUser?.id) {
    return null;
  }

  // Always verify the current role in the database.
  // This prevents a stale JWT role from blocking a user who was
  // promoted to ADMIN after their session was created.
  const user = await prisma.user.findUnique({
    where: {
      id: sessionUser.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return user;
}
