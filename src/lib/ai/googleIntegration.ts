/**
 * Google (Search Console) OAuth integration client.
 *
 * Endpoint Laravel (routes/api.php):
 *   GET  /api/ai/integrations/google/authorize-url
 *   GET  /api/ai/integrations/google/status
 *   POST /api/ai/integrations/google/disconnect
 */
import { api } from "@/lib/api";

export type GoogleConnectionStatus = {
  connected: boolean;
  email: string | null;
  scope: string | null;
  connectedAt: string | null;
};

export const googleIntegration = {
  status: (): Promise<GoogleConnectionStatus> =>
    api.get("/ai/integrations/google/status").then((r) => r.data),

  authorizeUrl: (): Promise<string> =>
    api.get("/ai/integrations/google/authorize-url").then((r) => r.data?.url as string),

  disconnect: (): Promise<{ connected: boolean }> =>
    api.post("/ai/integrations/google/disconnect").then((r) => r.data),
};

/** Ambil authorize URL lalu lempar browser ke consent screen Google. */
export async function startGoogleOAuth() {
  const url = await googleIntegration.authorizeUrl();
  if (!url) throw new Error("Backend tidak mengembalikan authorize URL.");
  window.location.href = url;
}
