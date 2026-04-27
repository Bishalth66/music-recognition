"use client";

import { useState, useEffect } from "react";
import { IoClose } from "react-icons/io5";

type PageProps = {
  title: string;
  artist: string;
  lyrics: string;
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

const Overlay = ({ title, artist, lyrics, onClose }: PageProps) => {
  const [data, setData] = useState<YouTubeVideo | null>(null);
  const [loading, setLoading] = useState(true);

  // 🎥 Fetch YouTube video
  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `/api/youtube?title=${title}&artist=${artist}`
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

  // ⌨️ ESC to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const videoId = data?.id?.videoId;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg px-4"
    >
      {/* Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl overflow-hidden bg-white shadow-2xl border border-white/20 transition-all duration-200 scale-100"
      >
        {/* ❌ Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition"
        >
          <IoClose size={18} />
        </button>

        {/* 🎬 Video Section */}
        {loading ? (
          <div className="w-full h-52 bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
        ) : videoId ? (
          <div className="relative w-full h-52">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="w-full h-52 flex items-center justify-center text-sm text-gray-500">
            No video found
          </div>
        )}

        {/* 📄 Body */}
        <div className="p-4 space-y-3">
          {loading ? (
            <>
              {/* Title skeleton */}
              <div className="space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
              </div>

              <div className="h-px bg-gray-100" />

              {/* Lyrics skeleton */}
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-3 bg-gray-200 rounded animate-pulse"
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Title */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {title}
                </h2>
                <p className="text-sm text-gray-500">{artist}</p>
              </div>

              <div className="h-px bg-gray-100" />

              {/* Lyrics */}
              <div className="max-h-56 overflow-y-auto pr-2">
                <p className="whitespace-pre-wrap text-base leading-relaxed text-gray-700">
                  {lyrics}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Overlay;