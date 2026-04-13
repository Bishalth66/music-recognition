import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { FiUpload, FiX } from "react-icons/fi";
type resultServer = {
    confidence:number,
    song:{
      id:number,
      title:string,
      artist:string,
      album:string,
      duration_seconds:number
    }
}



const UploadUi = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<resultServer | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    const audioFile = acceptedFiles[0];
    if (!audioFile) return;

    setFile(audioFile);
    setPreviewUrl(URL.createObjectURL(audioFile));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "audio/*": [] },
    multiple: false,
  });

  // 📡 send to backend
  const recognizeSong = async () => {
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("audio", file);

    try {
      const res = await fetch("http://localhost:8000/api/recognize/", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);
      console.log("Result:", data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ❌ remove file
  const removeFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
  };
  return (
    <div className="flex flex-col items-center justify-center w-full h-64 gap-6">

      {/* 📦 DROP ZONE (only when no file) */}
      {!file && (
        <div
          {...getRootProps()}
          className={`w-80 p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition
          ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
        >
          <input {...getInputProps()} />

          <FiUpload className="text-5xl mx-auto text-gray-500" />

          <p className="mt-3 text-gray-600">
            {isDragActive
              ? "Drop your audio here..."
              : "Drag & drop or click to upload"}
          </p>
        </div>
      )}

      {/* 🎧 PREVIEW CARD */}
      {file && (
        <div className="w-80 bg-white border rounded-lg p-4 shadow-sm relative">

          {/* ❌ remove button */}
          <button
            onClick={removeFile}
            className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
          >
            <FiX size={18} />
          </button>

          <p className="text-sm font-medium text-gray-700 truncate">
            🎵 {file.name}
          </p>

          {previewUrl && (
            <audio controls src={previewUrl} className="w-full mt-3" />
          )}

          {/* 🚀 recognize button */}
          <button
            onClick={recognizeSong}
            disabled={loading}
            className="w-full mt-4 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
          >
            {loading ? "Recognizing..." : "Recognize Song"}
          </button>

          {/* 🎯 result */}
          {result && (
            <div className="mt-3 text-sm text-green-600">
              {result?.song.title || "Song not detected!"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadUi;