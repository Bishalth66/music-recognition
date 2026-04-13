import { useRef, useState } from "react";
import { IoMicOutline } from "react-icons/io5";

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
const RecordUi = () => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [data,setData]=useState<resultServer>();
  // 🎤 START
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    streamRef.current = stream;

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, {
        type: "audio/webm",
      });

      await sendToServer(blob);

      stream.getTracks().forEach((t) => t.stop());
    };

    mediaRecorder.start();
    setIsRecording(true);

    // ⏱ auto stop after 10s
    timerRef.current = setTimeout(() => {
      stopRecording();
    }, 10000);
  };

  // ⏹ STOP
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // 🎛 TOGGLE (THIS IS THE MAGIC)
  const toggleRecording = () => {
    if (isLoading) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // 📡 SEND TO SERVER
  const sendToServer = async (blob: Blob) => {
    const formData = new FormData();
    formData.append("audio", blob, "audio.webm");

    try {
      setIsLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/recognize/`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await res.json();
      console.log("Detected:", data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full h-64 items-center justify-center py-10">
      <div className="flex flex-col items-center gap-6">
        {/* 🎤 SINGLE MIC BUTTON */}
        <button
          onClick={toggleRecording}
          className={`relative text-6xl text-white p-6 rounded-full transition ${isLoading ? "bg-yellow-500 animate-pulse" : isRecording? "bg-red-500 animate-pulse" : "bg-blue-600" }`}
        >
          <IoMicOutline />

          {isRecording && !isLoading && (
            <span className="absolute inset-0 rounded-full bg-red-300 opacity-40 animate-ping"></span>
          )}

          {isLoading && (
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
              ...
            </span>
          )}
        </button>

        <p className="text-sm text-gray-600">
          {isLoading
            ? "Decoding sound…"
            : isRecording
              ? "Listening..."
              : "Tap to identify music"}
        </p>
      </div>
    </div>
  );
};

export default RecordUi;
