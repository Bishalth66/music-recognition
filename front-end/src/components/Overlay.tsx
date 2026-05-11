"use client";

import { useEffect, useState } from "react";
import { IoClose } from "react-icons/io5";
import {
  FiClock,
  FiExternalLink,
  FiHeart,
  FiList,
  FiMusic,
  FiStar,
} from "react-icons/fi";
import {
  getSongInteraction,
  getUserMusicInteractions,
  isAuthenticated,
  upsertMusicInteraction,
  upsertUserMusicInteraction,
  type MusicInteraction,
} from "@/lib/history";

type PageProps = {
  songId?: number;
  title: string;
  artist: string;
  lyrics: string;
  album?: string;
  durationSeconds?: number;
  confidence?: number;
  onClose: () => void;
};

type YouTubeVideo = {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    channelTitle: string;
  };
};

function formatDuration(value?: number) {
  if (!value) return "Unknown length";

  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

const Overlay = ({
  songId,
  title,
  artist,
  lyrics,
  album,
  durationSeconds,
  confidence,
  onClose,
}: PageProps) => {
  const [data, setData] = useState<YouTubeVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [interaction, setInteraction] = useState<MusicInteraction | undefined>(
    undefined,
  );

  const interactionInput =
    typeof songId === "number"
      ? {
          songId,
          title,
          artist,
          album,
          lyrics,
          durationSeconds,
        }
      : null;

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `/api/youtube?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`,
        );
        const json = await res.json();

        setData(json?.youtube?.items?.[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [title, artist]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    let isMounted = true;

    const loadInteraction = async () => {
      if (typeof songId !== "number") return;

      if (!isAuthenticated()) {
        setInteraction(getSongInteraction(songId));
        return;
      }

      try {
        const interactions = await getUserMusicInteractions();
        if (!isMounted) return;
        setInteraction(
          interactions.find((item) => item.songId === songId) ?? undefined,
        );
      } catch {
        if (isMounted) setInteraction(getSongInteraction(songId));
      }
    };

    loadInteraction();
    return () => {
      isMounted = false;
    };
  }, [songId]);

  const updateInteraction = async (
    patch: Partial<
      Pick<MusicInteraction, "favorite" | "rating" | "note" | "playlist">
    >,
  ) => {
    if (!interactionInput) return;
    const nextPatch = {
      favorite,
      rating,
      note,
      playlist,
      ...patch,
    };

    setInteraction({
      songId: interactionInput.songId,
      title: interactionInput.title,
      artist: interactionInput.artist,
      album: interactionInput.album,
      lyrics: interactionInput.lyrics,
      durationSeconds: interactionInput.durationSeconds,
      updatedAt: new Date().toISOString(),
      ...nextPatch,
    });

    try {
      const savedInteraction = isAuthenticated()
        ? await upsertUserMusicInteraction(interactionInput, nextPatch)
        : upsertMusicInteraction(interactionInput, nextPatch);
      setInteraction(savedInteraction);
    } catch (error) {
      console.error(error);
    }
  };

  const videoId = data?.id?.videoId;
  const youtubeUrl = videoId
    ? `https://www.youtube.com/watch?v=${videoId}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(
        `${title} ${artist}`,
      )}`;
  const favorite = interaction?.favorite ?? false;
  const rating = interaction?.rating ?? 0;
  const note = interaction?.note ?? "";
  const playlist = interaction?.playlist ?? "";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-lg"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative grid max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-lg border border-white/20 bg-white shadow-2xl md:grid-cols-[minmax(0,1fr)_360px]"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
          aria-label="Close song details"
        >
          <IoClose size={18} />
        </button>

        <div className="min-h-0 overflow-y-auto">
          {loading ? (
            <div className="h-56 w-full animate-pulse bg-gray-200" />
          ) : videoId ? (
            <div className="relative h-56 w-full bg-black">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex h-56 w-full items-center justify-center bg-gray-100 text-sm text-gray-500">
              No video found
            </div>
          )}

          <div className="space-y-5 p-5">
            {loading ? (
              <div className="space-y-3">
                <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
                <div className="h-px bg-gray-100" />
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-3 animate-pulse rounded bg-gray-200"
                  />
                ))}
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {artist || "Unknown artist"}
                    {album ? ` - ${album}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
                    <FiClock aria-hidden="true" />
                    {formatDuration(durationSeconds)}
                  </span>
                  {typeof confidence === "number" && (
                    <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700">
                      {Math.round(confidence * 100)}% confidence
                    </span>
                  )}
                </div>

                <div className="h-px bg-gray-100" />

                <section>
                  <h3 className="text-sm font-semibold text-gray-950">
                    Lyrics
                  </h3>
                  <div className="mt-3 max-h-64 overflow-y-auto pr-2">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                      {lyrics || "No lyrics saved for this track."}
                    </p>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

        <aside className="min-h-0 overflow-y-auto border-t border-gray-200 bg-gray-50 p-5 md:border-l md:border-t-0">
          <div>
            <p className="text-sm font-semibold text-gray-950">
              Your interaction
            </p>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Save how this track fits your taste and come back to it from the
              library.
            </p>
          </div>

          <div className="mt-5 space-y-5">
            <button
              type="button"
              disabled={!interactionInput}
              onClick={() => updateInteraction({ favorite: !favorite })}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                favorite
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-gray-300 bg-white text-gray-700 hover:border-red-200 hover:text-red-600"
              }`}
            >
              <FiHeart aria-hidden="true" />
              {favorite ? "Saved to favorites" : "Add to favorites"}
            </button>

            <div>
              <label className="text-sm font-medium text-gray-800">
                Rating
              </label>
              <div className="mt-2 flex gap-1">
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={!interactionInput}
                      onClick={() =>
                        updateInteraction({
                          rating: rating === value ? 0 : value,
                        })
                      }
                      className={`flex h-9 w-9 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        value <= rating
                          ? "border-amber-200 bg-amber-50 text-amber-600"
                          : "border-gray-300 bg-white text-gray-400 hover:text-amber-500"
                      }`}
                      aria-label={`Rate ${value} stars`}
                    >
                      <FiStar aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="song-playlist"
                className="text-sm font-medium text-gray-800"
              >
                Playlist or mood
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3">
                <FiList className="shrink-0 text-gray-400" aria-hidden="true" />
                <input
                  id="song-playlist"
                  value={playlist}
                  disabled={!interactionInput}
                  onChange={(event) =>
                    updateInteraction({ playlist: event.target.value })
                  }
                  placeholder="Road trip, focus, favorites..."
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="song-note"
                className="text-sm font-medium text-gray-800"
              >
                Personal note
              </label>
              <textarea
                id="song-note"
                value={note}
                disabled={!interactionInput}
                onChange={(event) =>
                  updateInteraction({ note: event.target.value })
                }
                placeholder="Where you heard it, why it stuck, or who to send it to."
                className="mt-2 min-h-28 w-full resize-none rounded-md border border-gray-300 bg-white p-3 text-sm leading-6 outline-none transition focus:border-blue-400 disabled:cursor-not-allowed"
              />
            </div>

            <div className="grid gap-2">
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                <FiExternalLink aria-hidden="true" />
                Open on YouTube
              </a>
              <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
                <FiMusic className="shrink-0 text-blue-600" aria-hidden="true" />
                <span className="min-w-0">
                  {interactionInput
                    ? "Changes save automatically on this device."
                    : "Recognize this track again to save interactions."}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Overlay;
