export type RecognitionHistoryItem = {
  id: string;
  songId: number;
  title: string;
  artist: string;
  album?: string;
  lyrics?: string;
  durationSeconds?: number;
  confidence?: number;
  source: "record" | "upload";
  createdAt: string;
};

export type RecognitionResult = {
  confidence?: number;
  song?: {
    id: number;
    title: string;
    artist: string;
    album?: string;
    lyrics?: string;
    duration_seconds?: number;
  };
};

export const HISTORY_STORAGE_KEY = "soundtrace-recognition-history";
export const MUSIC_INTERACTIONS_STORAGE_KEY = "soundtrace-music-interactions";
export const AUTH_TOKEN_STORAGE_KEY = "soundtrace-auth-token";
const MAX_HISTORY_ITEMS = 50;
const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000/api";

export type AuthUser = {
  id: number;
  username: string;
  email: string;
};

export type MusicInteraction = {
  songId: number;
  title: string;
  artist: string;
  album?: string;
  lyrics?: string;
  durationSeconds?: number;
  favorite: boolean;
  rating: number;
  note: string;
  playlist: string;
  updatedAt: string;
};

export type MusicInteractionInput = {
  songId: number;
  title: string;
  artist: string;
  album?: string;
  lyrics?: string;
  durationSeconds?: number;
};

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}

function setAuthToken(token: string) {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  window.dispatchEvent(new Event("auth-updated"));
}

function clearAuthToken() {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.dispatchEvent(new Event("auth-updated"));
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Token ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (res.status === 401 || res.status === 403) {
    clearAuthToken();
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Request failed.");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export async function loginUser(username: string, password: string) {
  const response = await apiRequest<{ token: string; user: AuthUser }>(
    "/auth/login/",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    },
  );
  setAuthToken(response.token);
  return response.user;
}

export async function registerUser(
  username: string,
  email: string,
  password: string,
) {
  const response = await apiRequest<{ token: string; user: AuthUser }>(
    "/auth/register/",
    {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    },
  );
  setAuthToken(response.token);
  return response.user;
}

export async function getCurrentUser() {
  if (!getAuthToken()) return null;

  try {
    const response = await apiRequest<{ user: AuthUser }>("/auth/me/");
    return response.user;
  } catch {
    return null;
  }
}

export async function logoutUser() {
  if (getAuthToken()) {
    await apiRequest<void>("/auth/logout/", { method: "POST" }).catch(() => {});
  }
  clearAuthToken();
}

export function getRecognitionHistory(): RecognitionHistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const rawHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!rawHistory) return [];

    const parsedHistory = JSON.parse(rawHistory);
    return Array.isArray(parsedHistory) ? parsedHistory : [];
  } catch {
    return [];
  }
}

export function getMusicInteractions(): MusicInteraction[] {
  if (typeof window === "undefined") return [];

  try {
    const rawInteractions = window.localStorage.getItem(
      MUSIC_INTERACTIONS_STORAGE_KEY,
    );
    if (!rawInteractions) return [];

    const parsedInteractions = JSON.parse(rawInteractions);
    return Array.isArray(parsedInteractions) ? parsedInteractions : [];
  } catch {
    return [];
  }
}

function saveMusicInteractions(interactions: MusicInteraction[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    MUSIC_INTERACTIONS_STORAGE_KEY,
    JSON.stringify(interactions),
  );
  window.dispatchEvent(new Event("music-interactions-updated"));
}

export function getSongInteraction(
  songId: number,
): MusicInteraction | undefined {
  return getMusicInteractions().find((interaction) => interaction.songId === songId);
}

export function upsertMusicInteraction(
  song: MusicInteractionInput,
  patch: Partial<
    Pick<MusicInteraction, "favorite" | "rating" | "note" | "playlist">
  > = {},
) {
  if (typeof window === "undefined") return undefined;

  const interactions = getMusicInteractions();
  const existing = interactions.find(
    (interaction) => interaction.songId === song.songId,
  );
  const nextInteraction: MusicInteraction = {
    songId: song.songId,
    title: song.title,
    artist: song.artist,
    album: song.album,
    lyrics: song.lyrics,
    durationSeconds: song.durationSeconds,
    favorite: existing?.favorite ?? false,
    rating: existing?.rating ?? 0,
    note: existing?.note ?? "",
    playlist: existing?.playlist ?? "",
    updatedAt: new Date().toISOString(),
    ...patch,
  };

  saveMusicInteractions([
    nextInteraction,
    ...interactions.filter(
      (interaction) => interaction.songId !== song.songId,
    ),
  ]);

  return nextInteraction;
}

export async function getUserMusicInteractions() {
  if (!getAuthToken()) return getMusicInteractions();

  const response = await apiRequest<{ interactions: MusicInteraction[] }>(
    "/interactions/",
  );
  return response.interactions;
}

export async function upsertUserMusicInteraction(
  song: MusicInteractionInput,
  patch: Partial<
    Pick<MusicInteraction, "favorite" | "rating" | "note" | "playlist">
  > = {},
) {
  const existing =
    getMusicInteractions().find((item) => item.songId === song.songId) ??
    undefined;
  const nextInteraction = {
    songId: song.songId,
    favorite: existing?.favorite ?? false,
    rating: existing?.rating ?? 0,
    note: existing?.note ?? "",
    playlist: existing?.playlist ?? "",
    ...patch,
  };

  if (!getAuthToken()) {
    return upsertMusicInteraction(song, patch);
  }

  const savedInteraction = await apiRequest<MusicInteraction>("/interactions/", {
    method: "POST",
    body: JSON.stringify(nextInteraction),
  });
  window.dispatchEvent(new Event("music-interactions-updated"));
  return savedInteraction;
}

export async function syncLocalInteractionsToUser() {
  if (!getAuthToken()) return [];

  const localInteractions = getMusicInteractions();
  const syncedInteractions = await Promise.all(
    localInteractions.map((interaction) =>
      apiRequest<MusicInteraction>("/interactions/", {
        method: "POST",
        body: JSON.stringify({
          songId: interaction.songId,
          favorite: interaction.favorite,
          rating: interaction.rating,
          note: interaction.note,
          playlist: interaction.playlist,
        }),
      }),
    ),
  );

  window.localStorage.removeItem(MUSIC_INTERACTIONS_STORAGE_KEY);
  window.dispatchEvent(new Event("music-interactions-updated"));
  return syncedInteractions;
}

export function saveRecognitionToHistory(
  result: RecognitionResult,
  source: RecognitionHistoryItem["source"],
) {
  if (typeof window === "undefined" || !result.song?.title) return;

  const item: RecognitionHistoryItem = {
    id: `${Date.now()}-${result.song.id}`,
    songId: result.song.id,
    title: result.song.title,
    artist: result.song.artist,
    album: result.song.album,
    lyrics: result.song.lyrics,
    durationSeconds: result.song.duration_seconds,
    confidence: result.confidence,
    source,
    createdAt: new Date().toISOString(),
  };

  const interactionInput = {
    songId: item.songId,
    title: item.title,
    artist: item.artist,
    album: item.album,
    lyrics: item.lyrics,
    durationSeconds: item.durationSeconds,
  };

  if (getAuthToken()) {
    upsertUserMusicInteraction(interactionInput).catch(() =>
      upsertMusicInteraction(interactionInput),
    );
  } else {
    upsertMusicInteraction(interactionInput);
  }

  const history = getRecognitionHistory();
  const nextHistory = [
    item,
    ...history.filter(
      (entry) =>
        !(
          entry.songId === item.songId &&
          entry.source === item.source &&
          Date.now() - new Date(entry.createdAt).getTime() < 10_000
        ),
    ),
  ].slice(0, MAX_HISTORY_ITEMS);

  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
  window.dispatchEvent(new Event("recognition-history-updated"));
}

export function clearRecognitionHistory() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(HISTORY_STORAGE_KEY);
  window.dispatchEvent(new Event("recognition-history-updated"));
}
