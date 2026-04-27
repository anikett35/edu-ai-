// src/components/common/FileUpload.jsx
import React, { useRef, useState } from "react";

const ACCEPTED = [".pdf", ".pptx", ".ppt", ".docx", ".doc"];
const MAX_MB   = 50;

const typeIcon = (name) => {
  const ext = name?.split(".").pop()?.toLowerCase();
  if (ext === "pdf")  return "📄";
  if (["pptx","ppt"].includes(ext)) return "📊";
  return "📝";
};

export default function FileUpload({ file, onChange, error }) {
  const inputRef  = useRef(null);
  const [drag, setDrag] = useState(false);

  const validate = (f) => {
    if (!f) return null;
    const ext = "." + f.name.split(".").pop().toLowerCase();
    if (!ACCEPTED.includes(ext)) return `File type not allowed. Use: ${ACCEPTED.join(", ")}`;
    if (f.size > MAX_MB * 1024 * 1024) return `File too large (max ${MAX_MB} MB)`;
    return null;
  };

  const handleFile = (f) => {
    const err = validate(f);
    onChange(f, err);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-3 p-8 rounded-xl3 border-2 border-dashed
                    cursor-pointer transition-all
                    ${drag         ? "border-primary-400 bg-primary-50"
                    : file         ? "border-primary-300 bg-primary-50/50"
                    : error        ? "border-red-300 bg-red-50/30"
                    :                "border-gray-200 bg-gray-50/50 hover:border-primary-300 hover:bg-primary-50/30"}`}
      >
        {file ? (
          <>
            <span className="text-4xl">{typeIcon(file.name)}</span>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">{file.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null, null); }}
              className="text-xs text-red-400 hover:text-red-600 font-medium underline"
            >
              Remove
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                   stroke="#6366f1" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">Drag & Drop Files</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Support for PDF, PPT, and DOCX (Max {MAX_MB}MB)
              </p>
            </div>
            <button type="button"
                    className="btn-secondary text-xs px-3 py-1.5">
              Browse My Computer
            </button>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => { const f = e.target.files[0]; if (f) handleFile(f); }}
      />

      {error && (
        <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}