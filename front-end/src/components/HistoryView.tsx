"use client";

import { useEffect, useState } from "react";
import { FiClock, FiTrash2 } from "react-icons/fi";
import Overlay from "./Overlay";
import {
  clearRecognitionHistory,
  getRecognitionHistory,
  type RecognitionHistoryItem,
} from "@/lib/history";

function formatDetectedTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

const HistoryView = () => {
  const [history, setHistory] = useState<RecognitionHistoryItem[]>([]);
  const [selectedItem, setSelectedItem] =
    useState<RecognitionHistoryItem | null>(null);

  useEffect(() => {
    const loadHistory = () => setHistory(getRecognitionHistory());

    loadHistory();
    window.addEventListener("recognition-history-updated", loadHistory);
    return () =>
      window.removeEventListener("recognition-history-updated", loadHistory);
  }, []);

  const handleClearHistory = () => {
    clearRecognitionHistory();
    setHistory([]);
    setSelectedItem(null);
  };

  return (
    <main className="flex-1 w-full px-4 py-10 md:px-6">
      <section className="mx-auto w-full max-w-4xl">
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Recognition log</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950">
              History
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Songs you identify from recording or upload are saved here on this
              device.
            </p>
          </div>

          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-red-300 hover:text-red-600"
            >
              <FiTrash2 aria-hidden="true" />
              Clear
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="mt-10 flex min-h-72 flex-col items-center justify-center rounded-md border border-dashed border-gray-300 px-6 text-center">
            <FiClock className="text-4xl text-gray-400" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              No songs yet
            </h2>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              Recognize a song from the main screen and it will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-md border border-gray-200">
            <ul className="divide-y divide-gray-200">
              {history.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-gray-50 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold text-gray-950">
                        {item.title}
                      </span>
                      <span className="mt-1 block truncate text-sm text-gray-500">
                        {item.artist || "Unknown artist"}
                        {item.album ? ` - ${item.album}` : ""}
                      </span>
                    </span>

                    <span className="flex flex-wrap items-center gap-2 text-xs text-gray-500 sm:justify-end">
                      <span className="rounded-full bg-gray-100 px-2 py-1 capitalize text-gray-700">
                        {item.source}
                      </span>
                      {typeof item.confidence === "number" && (
                        <span>
                          {Math.round(item.confidence * 100)}% confidence
                        </span>
                      )}
                      <span>{formatDetectedTime(item.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {selectedItem && (
        <Overlay
          title={selectedItem.title}
          artist={selectedItem.artist}
          lyrics={selectedItem.lyrics || "No lyrics saved for this track."}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </main>
  );
};

export default HistoryView;
