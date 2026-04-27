// src/pages/Materials/MaterialsPage.jsx
// Accessible by BOTH students and teachers.
// Students: browse & summarize materials uploaded by teachers.
// Teachers: same view + reminder to upload more.

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { teacherService } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import { PageLoader } from "../../components/common/LoadingSpinner";

const SUBJECTS = [
  { id: "full_stack",        label: "Full Stack Dev",   color: "#3b82f6", bg: "#eff6ff"},
  { id: "dbms",              label: "DBMS",             color: "#8b5cf6", bg: "#f5f3ff"  },
  { id: "data_structures",   label: "Data Structures",  color: "#6366f1", bg: "#eef2ff"},
  { id: "machine_learning",  label: "Machine Learning", color: "#f59e0b", bg: "#fffbeb" },
  { id: "operating_systems", label: "Operating Systems",color: "#10b981", bg: "#ecfdf5" },
];

const FILE_ICONS = { pdf: "📄", pptx: "📊", ppt: "📊", docx: "📝", doc: "📝" };

function SummaryModal({ material, onClose }) {
  const [summary,  setSummary]  = useState("");
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [loadMsg,  setLoadMsg]  = useState("Analyzing document…");
  const timerRef = useRef(null);

  useEffect(() => {
    const msgs = [
      "Analyzing document…",
      "Extracting key concepts…",
      "Generating summary… (this takes 30-60s)",
      "Almost done…",
    ];
    let i = 0;
    timerRef.current = setInterval(() => {
      i = (i + 1) % msgs.length;
      setLoadMsg(msgs[i]);
    }, 8000);

    teacherService.summarize(material.id)
      .then(res => setSummary(res.data.summary))
      .catch(err => setError(err.response?.data?.detail || "Failed to generate summary. Is Ollama running?"))
      .finally(() => { setLoading(false); clearInterval(timerRef.current); });

    return () => clearInterval(timerRef.current);
  }, [material.id]);

  // Parse summary into sections for nicer rendering
  const renderSummary = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return (
          <h4 key={i} style={{ fontFamily:"Sora,sans-serif", fontWeight:"700",
                                color:"#1e1b4b", margin:"16px 0 6px", fontSize:"14px" }}>
            {line.replace(/\*\*/g, "")}
          </h4>
        );
      }
      if (line.startsWith("- ") || line.startsWith("• ")) {
        return (
          <div key={i} style={{ display:"flex", gap:"8px", marginBottom:"4px" }}>
            <span style={{ color:"#6366f1", flexShrink:0 }}>•</span>
            <span style={{ fontSize:"13px", color:"#374151", lineHeight:"1.5" }}>
              {line.replace(/^[-•]\s/, "")}
            </span>
          </div>
        );
      }
      if (line.trim() === "") return <div key={i} style={{ height:"6px" }} />;
      return (
        <p key={i} style={{ fontSize:"13px", color:"#374151", lineHeight:"1.6", margin:"0 0 4px" }}>
          {line}
        </p>
      );
    });
  };

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:1000, padding:"24px",
    }} onClick={onClose}>
      <div style={{
        background:"white", borderRadius:"20px", width:"100%", maxWidth:"680px",
        maxHeight:"85vh", display:"flex", flexDirection:"column",
        boxShadow:"0 20px 60px rgba(0,0,0,0.2)",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding:"20px 24px 16px",
          borderBottom:"1px solid #f3f4f6",
          display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"16px",
        }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px" }}>
              <span style={{ fontSize:"20px" }}>{FILE_ICONS[material.file_type] || "📄"}</span>
              <h3 style={{ fontFamily:"Sora,sans-serif", fontWeight:"700",
                           fontSize:"16px", color:"#111827", margin:0 }}>
                {material.file_name}
              </h3>
            </div>
            <div style={{ display:"flex", gap:"8px" }}>
              <span style={{ fontSize:"11px", background:"#eef2ff", color:"#4338ca",
                             padding:"2px 8px", borderRadius:"999px", fontWeight:"600" }}>
                AI Summary
              </span>
              <span style={{ fontSize:"11px", background:"#f3f4f6", color:"#6b7280",
                             padding:"2px 8px", borderRadius:"999px" }}>
                {material.chunk_count} chunks
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{
            width:"32px", height:"32px", borderRadius:"8px", border:"1px solid #e5e7eb",
            background:"white", cursor:"pointer", fontSize:"16px", flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
          {loading ? (
            <div style={{ display:"flex", flexDirection:"column",
                          alignItems:"center", justifyContent:"center",
                          gap:"16px", padding:"48px 0" }}>
              <div style={{
                width:"48px", height:"48px", border:"3px solid #e0e7ff",
                borderTop:"3px solid #6366f1", borderRadius:"50%",
                animation:"spin 0.8s linear infinite",
              }} />
              <div style={{ textAlign:"center" }}>
                <p style={{ fontWeight:"600", color:"#374151", margin:"0 0 4px" }}>
                  Generating AI Summary
                </p>
                <p style={{ fontSize:"13px", color:"#9ca3af", fontStyle:"italic", margin:0 }}>
                  {loadMsg}
                </p>
              </div>
            </div>
          ) : error ? (
            <div style={{ padding:"16px", background:"#fef2f2", border:"1px solid #fecaca",
                          borderRadius:"12px", color:"#dc2626", fontSize:"13px" }}>
              {error}
            </div>
          ) : (
            <div>{renderSummary(summary)}</div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div style={{ padding:"16px 24px", borderTop:"1px solid #f3f4f6",
                        display:"flex", justifyContent:"flex-end" }}>
            <button onClick={onClose} style={{
              padding:"8px 20px", borderRadius:"10px",
              background:"#4f46e5", color:"white", border:"none",
              fontWeight:"600", fontSize:"13px", cursor:"pointer",
            }}>
              Close
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function MaterialsPage() {
  const [urlParams]  = useSearchParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const isTeacher    = user?.role === "teacher";

  const defaultSubj  = urlParams.get("subject") || SUBJECTS[0].id;
  const [subject,    setSubject]    = useState(defaultSubj);
  const [materials,  setMaterials]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [summaryMat, setSummaryMat] = useState(null);  // material being summarized

  useEffect(() => { fetchMaterials(subject); }, [subject]);

  const fetchMaterials = async (subj) => {
    setLoading(true);
    setError("");
    try {
      const res = await teacherService.materialsBySubject(subj);
      setMaterials(res.data.materials || []);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  const currentSubject = SUBJECTS.find(s => s.id === subject);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-900">Study Materials</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isTeacher
              ? "Manage your uploaded course materials"
              : "Browse course materials uploaded by your teacher"}
          </p>
        </div>
        {isTeacher && (
          <button onClick={() => navigate("/upload")} className="btn-primary">
            + Upload New Material
          </button>
        )}
      </div>

      {/* Subject tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth:"none" }}>
        {SUBJECTS.map(s => (
          <button
            key={s.id}
            onClick={() => setSubject(s.id)}
            style={{
              padding:"8px 16px", borderRadius:"12px", whiteSpace:"nowrap",
              border: subject === s.id ? `1px solid ${s.color}` : "1px solid #e5e7eb",
              background: subject === s.id ? s.bg : "white",
              color: subject === s.id ? s.color : "#6b7280",
              fontWeight:"600", fontSize:"13px", cursor:"pointer",
              transition:"all 0.15s",
            }}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <PageLoader />
      ) : error ? (
        <div className="card text-center py-10">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      ) : materials.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4"></div>
          <h3 className="font-display font-semibold text-gray-700 mb-2">
            No materials yet for {currentSubject?.label}
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            {isTeacher
              ? "Upload study materials for this subject so students can access them."
              : "Your teacher hasn't uploaded any materials for this subject yet."}
          </p>
          {isTeacher && (
            <button onClick={() => navigate("/upload")} className="btn-primary">
              Upload Notes
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="flex items-center gap-4 p-4 rounded-xl"
               style={{ background: currentSubject?.bg, border:`1px solid ${currentSubject?.color}22` }}>
            <span className="text-2xl">{currentSubject?.icon}</span>
            <div>
              <p className="font-display font-semibold text-gray-900" style={{ fontSize:"15px" }}>
                {currentSubject?.label}
              </p>
              <p className="text-xs text-gray-500">
                {materials.length} material{materials.length !== 1 ? "s" : ""} available ·{" "}
                {materials.reduce((a, m) => a + (m.chunk_count || 0), 0).toLocaleString()} total chunks indexed
              </p>
            </div>
          </div>

          {/* Materials grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map((mat) => (
              <div key={mat.id} className="card hover:shadow-deep transition-shadow flex flex-col">
                {/* File icon + name */}
                <div className="flex items-start gap-3 mb-3">
                  <div style={{
                    width:"44px", height:"44px", borderRadius:"12px",
                    background: currentSubject?.bg || "#eef2ff",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"22px", flexShrink:0,
                  }}>
                    {FILE_ICONS[mat.file_type] || "📄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-snug truncate">
                      {mat.file_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span style={{
                        fontSize:"10px", fontWeight:"600", textTransform:"uppercase",
                        background:"#f3f4f6", color:"#6b7280",
                        padding:"1px 6px", borderRadius:"4px",
                      }}>
                        {mat.file_type?.toUpperCase() || "PDF"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {mat.chunk_count} chunks
                      </span>
                    </div>
                  </div>
                </div>

                {/* Upload date */}
                <p className="text-xs text-gray-400 mb-4">
                  Uploaded {mat.upload_date
                    ? new Date(mat.upload_date).toLocaleDateString("en-US", {
                        day:"numeric", month:"short", year:"numeric"
                      })
                    : "—"}
                </p>

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => setSummaryMat(mat)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                               text-xs font-semibold transition-all"
                    style={{
                      background: currentSubject?.bg || "#eef2ff",
                      color:      currentSubject?.color || "#4338ca",
                      border:    `1px solid ${currentSubject?.color}33` || "1px solid #c7d2fe",
                    }}
                  >
                    ✨ Summarize
                  </button>
                  <button
                    onClick={() => navigate(`/tutor?subject=${subject}`)}
                    className="flex-1 btn-primary text-xs py-2"
                  >
                    Ask Tutor
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Summary Modal */}
      {summaryMat && (
        <SummaryModal
          material={summaryMat}
          onClose={() => setSummaryMat(null)}
        />
      )}
    </div>
  );
}