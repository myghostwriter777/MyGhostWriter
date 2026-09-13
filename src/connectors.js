// Browser side of the connector features.
//
// Both directions are managed from Settings and both are authenticated the
// same way: the browser asks Google for a fresh access token and sends it with
// the request, so the server can prove who is calling. An email address alone
// is never enough — a connector token can read the account's whole History.

const GOOGLE_SCOPE = "openid email profile";

export const CONNECTOR_PATH = "/api/mcp";

// The URL a user pastes into Claude, ChatGPT or Cursor.
export function connectorUrl(origin) {
  const base = String(origin || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  return `${base}${CONNECTOR_PATH}`;
}

// Ready-to-paste client configuration. The header form is offered first
// because a token in a URL ends up in browser history and server logs.
export function connectorSnippets(url, token) {
  const shown = token || "YOUR_CONNECTOR_TOKEN";
  return {
    header: `Authorization: Bearer ${shown}`,
    claudeCode: `claude mcp add --transport http ghostwriterme ${url} --header "Authorization: Bearer ${shown}"`,
    json: JSON.stringify(
      { mcpServers: { ghostwriterme: { type: "http", url, headers: { Authorization: `Bearer ${shown}` } } } },
      null,
      2
    ),
    urlWithToken: `${url}?token=${encodeURIComponent(shown)}`,
  };
}

// Google Identity Services, same client and scope the sign-in screen uses.
// Resolves with a short-lived access token the server verifies against
// Google's userinfo endpoint.
export function requestGoogleAccessToken() {
  return new Promise((resolve, reject) => {
    const google = typeof window !== "undefined" ? window.google : null;
    if (!google?.accounts?.oauth2?.initTokenClient) {
      reject(new Error("Google sign-in has not loaded yet. Refresh the page and try again."));
      return;
    }
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) {
      reject(new Error("Google sign-in is not configured on this deployment."));
      return;
    }
    let settled = false;
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_SCOPE,
        callback: response => {
          if (settled) return;
          settled = true;
          if (response?.error || !response?.access_token) {
            reject(new Error("Google sign-in was cancelled or failed. Try again."));
            return;
          }
          resolve(response.access_token);
        },
        error_callback: () => {
          if (settled) return;
          settled = true;
          reject(new Error("Google sign-in was cancelled or failed. Try again."));
        },
      });
      client.requestAccessToken();
    } catch {
      if (!settled) reject(new Error("Google sign-in could not be started. Try again."));
    }
  });
}

async function post(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "That connector request failed.");
    error.code = data.code || "";
    error.status = response.status;
    throw error;
  }
  return data;
}

// Each call takes a fresh Google token: they are short-lived, and reusing a
// stale one would fail in a way that looks like the feature is broken.
const withGoogle = async (path, payload) =>
  post(path, { ...payload, googleAccessToken: await requestGoogleAccessToken() });

export const listConnectorTokens = () => withGoogle("/api/connector-tokens", { action: "list" });
export const createConnectorToken = label => withGoogle("/api/connector-tokens", { action: "create", label });
export const revokeConnectorToken = id => withGoogle("/api/connector-tokens", { action: "revoke", id });

export const listConnectedApps = () => withGoogle("/api/mcp-servers", { action: "list" });
export const addConnectedApp = ({ name, url, authToken }) =>
  withGoogle("/api/mcp-servers", { action: "add", name, url, authToken });
export const removeConnectedApp = id => withGoogle("/api/mcp-servers", { action: "remove", id });
export const toggleConnectedApp = (id, enabled) => withGoogle("/api/mcp-servers", { action: "toggle", id, enabled });

// Copy helper that still works on the older mobile browsers this app targets,
// where navigator.clipboard is missing outside a secure context.
export async function copyText(value) {
  const text = String(value || "");
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to the textarea path */ }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
