const SERVER_HTTP_URL =
  process.env.NEXT_PUBLIC_SERVER_HTTP_URL ?? "http://localhost:2567";

const TOKEN_KEY = "habbo_token";
const USERNAME_KEY = "habbo_username";
const CHARACTER_KEY = "habbo_character";
const GENDER_KEY = "habbo_gender";

export type CharacterType = "MALE" | "FEMALE";
export type GenderType = "MALE" | "FEMALE";

export interface AuthedUser {
  id: string;
  username: string;
  character: CharacterType;
  gender: GenderType;
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

async function callRegisterEndpoint(username: string, password: string, gender: GenderType): Promise<AuthResponse> {
  const res = await fetch(`${SERVER_HTTP_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, gender, character: gender }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");
  return data as AuthResponse;
}

export async function register(username: string, password: string, gender: GenderType = "FEMALE"): Promise<AuthedUser> {
  const { token, user } = await callRegisterEndpoint(username, password, gender);
  const resolvedGender = user.gender ?? user.character ?? gender;
  saveSession(token, user.username, resolvedGender);
  return user;
}

export async function login(username: string, password: string): Promise<AuthedUser> {
  const { token, user } = await callAuthEndpoint("login", username, password);
  const resolvedGender = user.gender ?? user.character ?? "FEMALE";
  saveSession(token, user.username, resolvedGender);
  return user;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(CHARACTER_KEY);
  localStorage.removeItem(GENDER_KEY);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USERNAME_KEY);
}

export function getGender(): GenderType | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(GENDER_KEY) ?? localStorage.getItem(CHARACTER_KEY);
  return val === "MALE" || val === "FEMALE" ? val : null;
}

export function getCharacter(): CharacterType | null {
  return getGender();
}

function saveSession(token: string, username: string, genderOrChar: GenderType) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
  localStorage.setItem(CHARACTER_KEY, genderOrChar);
  localStorage.setItem(GENDER_KEY, genderOrChar);
}

export async function getEquippedOutfitApi(): Promise<Record<string, string>> {
  const token = getToken();
  if (!token) return {};
  try {
    const res = await fetch(`${SERVER_HTTP_URL}/me/outfit`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.outfit ?? {};
  } catch {
    return {};
  }
}

export async function updateEquippedOutfitApi(outfit: Record<string, string>): Promise<Record<string, string>> {
  const token = getToken();
  if (!token) return outfit;
  try {
    const res = await fetch(`${SERVER_HTTP_URL}/me/outfit`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ outfit }),
    });
    if (!res.ok) return outfit;
    const data = await res.json();
    return data.outfit ?? outfit;
  } catch {
    return outfit;
  }
}
