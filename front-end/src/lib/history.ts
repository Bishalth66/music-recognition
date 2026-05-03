export type RecognitionHistoryItem = {
  id: string;
  songId: number;
  title: string;
  artist: string;
  album?: string;
  lyrics?: string;
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
  };
};

export const HISTORY_STORAGE_KEY = "soundtrace-recognition-history";
const MAX_HISTORY_ITEMS = 50;

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
    confidence: result.confidence,
    source,
    createdAt: new Date().toISOString(),
  };

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
