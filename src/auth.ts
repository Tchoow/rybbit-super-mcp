/**
 * Authentication for Rybbit API.
 * Supports API key (Bearer token) or email+password (better-auth session cookie).
 *
 * Priority: API key > email+password.
 * API key is preferred — it's stateless and works for all middleware layers.
 * Some older Rybbit versions have handler-level session checks on CRUD
 * endpoints (funnels/goals). When both API key and email/password are
 * configured, the client will automatically retry with session auth on 403.
 */

export interface AuthConfig {
  baseUrl: string;
  apiKey?: string;
  email?: string;
  password?: string;
}

let sessionCookie: string | null = null;

export function getAuthConfig(): AuthConfig {
  const baseUrl = process.env.RYBBIT_URL?.replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error(
      "RYBBIT_URL environment variable is required. Set it to your Rybbit instance URL (e.g., https://analytics.example.com)"
    );
  }

  return {
    baseUrl,
    apiKey: process.env.RYBBIT_API_KEY,
    email: process.env.RYBBIT_EMAIL,
    password: process.env.RYBBIT_PASSWORD,
  };
}

export async function getAuthHeaders(
  config: AuthConfig
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // Prefer API key — stateless, works for ALL endpoints including CRUD.
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
    return headers;
  }

  // Fallback to session auth (email/password) if no API key provided.
  if (config.email && config.password) {
    if (!sessionCookie) {
      await loginWithCredentials(config);
    }
    if (sessionCookie) {
      headers["Cookie"] = sessionCookie;
    }
    return headers;
  }

  return headers;
}

async function loginWithCredentials(config: AuthConfig): Promise<void> {
  const url = `${config.baseUrl}/api/auth/sign-in/email`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: config.baseUrl,
    },
    body: JSON.stringify({ email: config.email, password: config.password }),
    redirect: "manual",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Login failed (${res.status}): ${body}`);
  }

  const setCookie = res.headers.getSetCookie?.() ?? [];
  const sessionToken = setCookie.find((c) =>
    c.includes("better-auth.session_token")
  );

  if (sessionToken) {
    sessionCookie = sessionToken.split(";")[0];
  } else {
    const allCookies = setCookie.map((c) => c.split(";")[0]).join("; ");
    if (allCookies) {
      sessionCookie = allCookies;
    }
  }
}

export function clearSession(): void {
  sessionCookie = null;
}

/**
 * Returns true if the config has session auth credentials available
 * (email/password) that can be used as a 403 fallback.
 */
export function hasSessionFallback(config: AuthConfig): boolean {
  return !!(config.apiKey && config.email && config.password);
}

/**
 * Get session-based auth headers (email/password login).
 * Used as a fallback when API key auth returns 403 on CRUD endpoints.
 */
export async function getSessionAuthHeaders(
  config: AuthConfig
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (config.email && config.password) {
    if (!sessionCookie) {
      await loginWithCredentials(config);
    }
    if (sessionCookie) {
      headers["Cookie"] = sessionCookie;
    }
  }

  return headers;
}
