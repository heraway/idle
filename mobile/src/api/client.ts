import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Points at your local backend. On a physical device, "localhost" means the
// PHONE, not your PC, so we auto-detect your dev machine's LAN IP from the
// same host Metro is already using to talk to the device. Override by
// setting a real value (not "http://localhost:4000") in app.json's
// extra.apiUrl — e.g. once you deploy the backend somewhere (Render/Railway/
// Fly.io all have free tiers), or just want to pin a specific IP.
function resolveApiUrl(): string {
  const configured = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (configured && configured !== "http://localhost:4000") return configured;

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const host = String(hostUri).split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:4000`;
    }
  }
  return "http://localhost:4000";
}

const API_URL = resolveApiUrl();

const TOKEN_KEY = "idle:authToken";

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean; // attach bearer token, default true
}

export async function api<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data as T;
}

// For multipart uploads (photos) — a separate helper since fetch's FormData
// handling differs from JSON requests.
export async function apiUpload<T = any>(path: string, formData: FormData): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData as any,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed with status ${res.status}`);
  return data as T;
}

// Newer Expo SDKs (53+) ship a stricter, spec-compliant global FormData that
// no longer accepts the classic React Native shorthand —
// `form.append("photo", { uri, name, type })` — as a valid part, and throws
// "Unsupported FormDataPart implementation" instead. A real Blob is always
// accepted, so this converts a local picker/camera uri into one; use it
// everywhere a photo gets appended to a FormData before uploading.
export async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return await response.blob();
}

export { API_URL };
