"use client";
import { useEffect, useMemo, useState } from "react";
import { FiDisc, FiMusic, FiSearch } from "react-icons/fi";
import Overlay from "@/components/Overlay";
import { getBackendSongs, type BackendSong } from "@/lib/songs";

type SongCatalogProps = {
  showHeader?: boolean;
};

function formatDuration(value?: number) {
  if (!value) return "Unknown length";

  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

const SongCatalog = ({ showHeader = true }: SongCatalogProps) => {
  const [songs, setSongs] = useState<BackendSong[]>([]);
  const [selectedSong, setSelectedSong] = useState<BackendSong | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSongs = async () => {
      try {
        setLoading(true);
        setError("");
        setSongs(await getBackendSongs());
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load songs from the backend.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadSongs();
  }, []);

  const filteredSongs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return songs;

    return songs.filter((song) =>
      [song.title, song.artist, song.album]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery)),
    );
  }, [query, songs]);

  return (
    <section className="w-full">
      {showHeader && (
        <div className="border-b border-gray-200 pb-6">
          <p className="text-sm font-medium text-blue-600">Backend catalog</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950">
            Stream songs
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Browse the songs stored in Django, play their audio, and open the
            same details and interaction layer used by recognition results.
          </p>
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3">
        <FiSearch className="shrink-0 text-gray-400" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, artist, or album"
          className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-gray-200 bg-white">
        {loading ? (
          <div className="space-y-4 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="animate-pulse space-y-3">
                <div className="h-4 w-2/5 rounded bg-gray-200" />
                <div className="h-10 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-4 py-10 text-sm text-red-600">{error}</div>
        ) : filteredSongs.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <FiMusic className="text-4xl text-gray-400" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              No songs found
            </h2>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              Add songs in the Django admin or adjust your search.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredSongs.map((song) => (
              <li key={song.id} className="px-4 py-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-center">
                  <button
                    type="button"
                    onClick={() => setSelectedSong(song)}
                    className="min-w-0 text-left"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                        <FiDisc aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-base font-semibold text-gray-950">
                          {song.title}
                        </span>
                        <span className="mt-1 block truncate text-sm text-gray-500">
                          {song.artist || "Unknown artist"}
                          {song.album ? ` - ${song.album}` : ""}
                        </span>
                      </span>
                    </span>

                    <span className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                      <span className="rounded-full bg-gray-100 px-2 py-1">
                        {formatDuration(song.durationSeconds)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 ${
                          song.fingerprinted
                            ? "bg-green-50 text-green-700"
                            : "bg-yellow-50 text-yellow-700"
                        }`}
                      >
                        {song.fingerprinted
                          ? "Fingerprint ready"
                          : "Not fingerprinted"}
                      </span>
                    </span>
                  </button>

                  <audio
                    controls
                    preload="none"
                    src={song.streamUrl}
                    className="w-full"
                  >
                    <a href={song.streamUrl}>Open audio</a>
                  </audio>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedSong && (
        <Overlay
          songId={selectedSong.id}
          title={selectedSong.title}
          artist={selectedSong.artist}
          album={selectedSong.album}
          lyrics={selectedSong.lyrics || "No lyrics saved for this track."}
          durationSeconds={selectedSong.durationSeconds}
          onClose={() => setSelectedSong(null)}
        />
      )}
    </section>
  );
};

export default SongCatalog;
