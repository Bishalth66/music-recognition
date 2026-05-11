const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000/api";

export type BackendSong = {
  id: number;
  title: string;
  artist: string;
  album?: string;
  lyrics?: string;
  durationSeconds?: number;
  fingerprinted: boolean;
  createdAt: string;
  audioUrl: string;
  streamUrl: string;
};

export async function getBackendSongs() {
  const res = await fetch(`${API_BASE_URL}/songs/`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Could not load songs from the backend.");
  }

  const data = (await res.json()) as { songs?: BackendSong[] };
  return data.songs ?? [];
}
