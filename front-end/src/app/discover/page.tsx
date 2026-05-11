"use client";

import { useEffect, useMemo, useState } from "react";
import { FiCompass, FiHeart, FiPlay, FiTrendingUp } from "react-icons/fi";
import Overlay from "@/components/Overlay";
import {
  getUserMusicInteractions,
  getRecognitionHistory,
  type MusicInteraction,
  type RecognitionHistoryItem,
} from "@/lib/history";

const defaultPicks = [
  {
    title: "Late-night pop",
    subtitle: "Bright hooks with soft edges",
    tag: "Mood",
  },
  {
    title: "Indie pulse",
    subtitle: "New guitars, warm vocals, steady drums",
    tag: "Fresh",
  },
  {
    title: "Study instrumentals",
    subtitle: "Clean textures for focus sessions",
    tag: "Focus",
  },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

const DiscoverPage = () => {
  const [history, setHistory] = useState<RecognitionHistoryItem[]>([]);
  const [interactions, setInteractions] = useState<MusicInteraction[]>([]);
  const [selectedSong, setSelectedSong] =
    useState<RecognitionHistoryItem | null>(null);

  useEffect(() => {
    const loadDiscoveryData = async () => {
      setHistory(getRecognitionHistory());
      setInteractions(await getUserMusicInteractions());
    };

    loadDiscoveryData();
    window.addEventListener("auth-updated", loadDiscoveryData);
    window.addEventListener("recognition-history-updated", loadDiscoveryData);
    window.addEventListener("music-interactions-updated", loadDiscoveryData);
    return () => {
      window.removeEventListener("auth-updated", loadDiscoveryData);
      window.removeEventListener(
        "recognition-history-updated",
        loadDiscoveryData,
      );
      window.removeEventListener(
        "music-interactions-updated",
        loadDiscoveryData,
      );
    };
  }, []);

  const topArtists = useMemo(() => {
    const counts = new Map<string, number>();

    history.forEach((item) => {
      if (!item.artist) return;
      counts.set(item.artist, (counts.get(item.artist) ?? 0) + 1);
    });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([artist, count]) => ({ artist, count }));
  }, [history]);

  const favoriteSongs = interactions.filter((song) => song.favorite).slice(0, 3);
  const recentSongs = history.slice(0, 4);

  return (
    <main className="flex-1 bg-gray-50 px-4 py-10 md:px-6">
      <section className="mx-auto w-full max-w-5xl">
        <div className="border-b border-gray-200 pb-6">
          <p className="text-sm font-medium text-blue-600">Discover</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950">
            Find something worth playing
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Discovery now responds to your recognized tracks, saved favorites,
            and artist patterns on this device.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {history.length === 0
            ? defaultPicks.map((pick) => (
                <article
                  key={pick.title}
                  className="rounded-md border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      {pick.tag}
                    </span>
                    <FiPlay className="text-gray-400" />
                  </div>
                  <FiCompass className="mt-8 text-3xl text-blue-600" />
                  <h2 className="mt-4 text-lg font-semibold text-gray-950">
                    {pick.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {pick.subtitle}
                  </p>
                </article>
              ))
            : topArtists.map((artist) => (
                <article
                  key={artist.artist}
                  className="rounded-md border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                      Artist signal
                    </span>
                    <FiTrendingUp className="text-gray-400" />
                  </div>
                  <h2 className="mt-8 text-lg font-semibold text-gray-950">
                    More from {artist.artist}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {artist.count} recognized match
                    {artist.count === 1 ? "" : "es"} point toward this sound.
                  </p>
                </article>
              ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="overflow-hidden rounded-md border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-950">
                Recently identified
              </h2>
            </div>
            {recentSongs.length === 0 ? (
              <div className="px-4 py-10 text-sm text-gray-500">
                Recognize music to turn this into a live discovery feed.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {recentSongs.map((song) => (
                  <li key={song.id}>
                    <button
                      onClick={() => setSelectedSong(song)}
                      className="grid w-full gap-2 px-4 py-4 text-left transition hover:bg-gray-50 sm:grid-cols-[1fr_auto] sm:items-center"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-base font-semibold text-gray-950">
                          {song.title}
                        </span>
                        <span className="mt-1 block truncate text-sm text-gray-500">
                          {song.artist || "Unknown artist"}
                        </span>
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(song.createdAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-md border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <FiHeart className="text-2xl text-red-500" />
              <div>
                <h2 className="text-sm font-semibold text-gray-950">
                  Favorite-driven picks
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Songs you saved shape what appears here.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {favoriteSongs.length === 0 ? (
                <p className="text-sm leading-6 text-gray-500">
                  Mark tracks as favorites from the details view to build this
                  list.
                </p>
              ) : (
                favoriteSongs.map((song) => (
                  <div
                    key={song.songId}
                    className="rounded-md border border-gray-200 bg-gray-50 px-3 py-3"
                  >
                    <p className="truncate text-sm font-medium text-gray-950">
                      {song.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-gray-500">
                      {song.artist || "Unknown artist"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>

      {selectedSong && (
        <Overlay
          songId={selectedSong.songId}
          title={selectedSong.title}
          artist={selectedSong.artist}
          album={selectedSong.album}
          lyrics={selectedSong.lyrics || "No lyrics saved for this track."}
          durationSeconds={selectedSong.durationSeconds}
          confidence={selectedSong.confidence}
          onClose={() => setSelectedSong(null)}
        />
      )}
    </main>
  );
};

export default DiscoverPage;
