"use client";

import { useEffect, useMemo, useState } from "react";
import { FiHeart, FiList, FiMusic, FiStar } from "react-icons/fi";
import Overlay from "@/components/Overlay";
import {
  getUserMusicInteractions,
  type MusicInteraction,
} from "@/lib/history";

const LibraryPage = () => {
  const [songs, setSongs] = useState<MusicInteraction[]>([]);
  const [selectedSong, setSelectedSong] = useState<MusicInteraction | null>(
    null,
  );

  useEffect(() => {
    const loadSongs = async () => setSongs(await getUserMusicInteractions());

    loadSongs();
    window.addEventListener("auth-updated", loadSongs);
    window.addEventListener("music-interactions-updated", loadSongs);
    return () => {
      window.removeEventListener("auth-updated", loadSongs);
      window.removeEventListener("music-interactions-updated", loadSongs);
    };
  }, []);

  const stats = useMemo(
    () => ({
      favorites: songs.filter((song) => song.favorite).length,
      rated: songs.filter((song) => song.rating > 0).length,
      playlists: new Set(
        songs
          .map((song) => song.playlist.trim())
          .filter((playlist) => playlist.length > 0),
      ).size,
    }),
    [songs],
  );

  return (
    <main className="flex-1 bg-gray-50 px-4 py-10 md:px-6">
      <section className="mx-auto w-full max-w-5xl">
        <div className="border-b border-gray-200 pb-6">
          <p className="text-sm font-medium text-blue-600">Library</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950">
            Your saved music
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Favorites, ratings, notes, and mood groups from songs you have
            recognized.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
            <FiHeart className="text-2xl text-red-500" />
            <h2 className="mt-4 text-lg font-semibold text-gray-950">
              Favorites
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Songs you marked as worth keeping close.
            </p>
            <p className="mt-5 text-2xl font-bold text-gray-950">
              {stats.favorites}
            </p>
          </article>

          <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
            <FiStar className="text-2xl text-amber-500" />
            <h2 className="mt-4 text-lg font-semibold text-gray-950">
              Rated tracks
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Matches with your own taste signal attached.
            </p>
            <p className="mt-5 text-2xl font-bold text-gray-950">
              {stats.rated}
            </p>
          </article>

          <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
            <FiList className="text-2xl text-blue-600" />
            <h2 className="mt-4 text-lg font-semibold text-gray-950">
              Mood groups
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Playlist labels you created while exploring.
            </p>
            <p className="mt-5 text-2xl font-bold text-gray-950">
              {stats.playlists}
            </p>
          </article>
        </div>

        <div className="mt-8 overflow-hidden rounded-md border border-gray-200 bg-white">
          {songs.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <FiMusic className="text-4xl text-gray-400" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold text-gray-900">
                Nothing saved yet
              </h2>
              <p className="mt-2 max-w-sm text-sm text-gray-500">
                Recognize a song, open its details, and add a favorite, rating,
                note, or mood.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {songs.map((song) => (
                <li key={song.songId}>
                  <button
                    onClick={() => setSelectedSong(song)}
                    className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-gray-50 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold text-gray-950">
                        {song.title}
                      </span>
                      <span className="mt-1 block truncate text-sm text-gray-500">
                        {song.artist || "Unknown artist"}
                        {song.album ? ` - ${song.album}` : ""}
                      </span>
                      {(song.note || song.playlist) && (
                        <span className="mt-2 block truncate text-xs text-gray-500">
                          {song.playlist || song.note}
                        </span>
                      )}
                    </span>

                    <span className="flex flex-wrap items-center gap-2 text-xs text-gray-500 sm:justify-end">
                      {song.favorite && (
                        <span className="rounded-full bg-red-50 px-2 py-1 font-medium text-red-700">
                          Favorite
                        </span>
                      )}
                      {song.rating > 0 && (
                        <span className="rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-700">
                          {song.rating}/5
                        </span>
                      )}
                      {song.playlist && (
                        <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700">
                          {song.playlist}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
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
          onClose={() => setSelectedSong(null)}
        />
      )}
    </main>
  );
};

export default LibraryPage;
