export function corsHeaders(origin: string): Record<string, string> {
  const allowed = [
    "https://nosignups.net",
    "https://fcksignups.com",
    "https://www.fcksignups.com",
    "http://localhost:5173",
    "http://localhost:4173",
  ];
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin)
      ? origin
      : allowed[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export function jsonResponse(
  body: unknown,
  status: number,
  origin: string,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

export interface Env {
  GITHUB_TOKEN: string;
  GITHUB_REPO_OWNER: string;
  GITHUB_REPO_NAME: string;
}
