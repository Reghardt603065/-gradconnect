export async function fetchJson<T>(url: string, timeoutMs = 8_000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "GradConnect-Academic-Project/1.0",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchText(
  url: string,
  timeoutMs = 8_000,
  headers: Record<string, string> = {},
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,text/plain;q=0.9,*/*;q=0.8",
        "User-Agent": "GradConnect-Academic-Project/1.0",
        ...headers,
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export function cleanText(value: string | null | undefined) {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function guessExperience(title: string, description: string) {
  const value = `${title} ${description}`.toLowerCase();
  if (/intern|graduate|junior|entry[ -]level/.test(value)) return "ENTRY_LEVEL";
  if (/senior|lead|principal|staff/.test(value)) return "SENIOR";
  if (/mid|intermediate/.test(value)) return "MID_LEVEL";
  return "UNSPECIFIED";
}
