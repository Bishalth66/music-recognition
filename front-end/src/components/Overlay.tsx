"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

type PageProps = {
  title: string;
  artist:string;
};

type YouTubeVideo = {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      medium: {
        url: string;
      };
    };
  };
};

const Overlay = ({ title, artist }: PageProps) => {
  const [previewData, setPreviewData] = useState<YouTubeVideo | null>(null);
  useEffect(() => {
    const googleFetch = async () => {
      try {
        const res = await fetch(
          `/api/youtube?title=${title}&artist=${artist}`,
        );
        const jsonData = await res.json();
        const firstData = jsonData?.youtube?.items?.[0];
        setPreviewData(firstData);
      } catch (error) {
        console.error("Error : ", error);
      }
    };
    googleFetch();
  }, [title,artist]);
  console.log(previewData);

  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
    
    {/* Card */}
    <div className="bg-white rounded-2xl shadow-xl p-4 w-[320px]">
      
      {previewData && (
        <>
          <Image
            src={previewData.snippet.thumbnails.medium.url}
            alt={previewData.snippet.title}
            width={320}
            height={180}
            className="rounded-lg"
          />

          <p className="mt-3 font-semibold text-sm">
            {previewData.snippet.title}
          </p>

          <p className="text-xs text-gray-500">
            {previewData.snippet.channelTitle}
          </p>
        </>
      )}
      
    </div>
  </div>
);
};

export default Overlay;
