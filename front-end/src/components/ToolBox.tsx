"use client";
import {useState} from "react";
import RecordUi from "./RecordUi";
import UploadUi from "./UploadUi";
type Mode = "record" | "upload";
const ToolBox = () => {
    const [mode,setMode]=useState<Mode>("record");
  return (
    <div className="w-full h-fit border border-gray-400 rounded-md p-8 mt-8">
        {/* Buttons */}
      <div className="flex gap-4">
        <button onClick={()=>setMode("record")} className={`border rounded-full py-2 px-4  ${mode == "record" ? "bg-blue-600 text-white transition-colors duration-300" : ""}`}> Record</button>
        <button onClick={()=>setMode("upload")} className={`border rounded-full py-2 px-4  ${mode == "upload" ? "bg-blue-600 text-white transition-colors duration-300" : ""}`}> Upload</button>
    </div>
    {mode == "record" ?
      <RecordUi /> :<UploadUi />
}
    </div>
  );
};

export default ToolBox;
