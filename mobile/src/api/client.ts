import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Points at your local backend by default. For a real device (not simulator),
// swap this to your machine's LAN IP, e.g. "http://192.168.1.42:4000",
// or your deployed backend URL once you host it (Render/Railway/Fly.io all
// have free tiers).
const API_URL = (Constants.expoConfig?.extra?.apiUrl as string) || "http://localhost:4000";

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

export { API_URL };
