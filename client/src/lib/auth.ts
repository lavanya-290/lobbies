const SERVER_HTTP_URL =
  process.env.NEXT_PUBLIC_SERVER_HTTP_URL ?? "http://localhost:2567";

const TOKEN_KEY = "habbo_token";
const USERNAME_KEY = "habbo_username";

export interface AuthedUser {
  id: string;
  username: string;
}

interface AuthResponse {
  token: string;
  user: AuthedUser;
}

async function callAuthEndpoint(path: "register" | "login", username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${SERVER_HTTP_URL}/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error ?? "Something went wrong.");
  }
  return data as AuthResponse;
}

export async function register(username: string, password: string): Promise<AuthedUser> {
  const { token, user } = await callAuthEndpoint("register", username, password);
  saveSession(token, user.username);
  return user;
}

export async function login(username: string, password: string): Promise<AuthedUser> {
  const { token, user } = await callAuthEndpoint("login", username, password);
  saveSession(token, user.username);
  return user;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USERNAME_KEY);
}

function saveSession(token: string, username: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
}
