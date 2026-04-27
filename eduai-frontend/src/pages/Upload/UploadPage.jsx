// src/pages/Upload/UploadPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { teacherService } from "../../api/services";
import FileUpload from "../../components/common/FileUpload";

const SUBJECTS = [
  { id: "data_structures",   label: "Data Structures"   },
  { id: "machine_learning",  label: "Machine Learning"  },
  { id: "dbms",              label: "DBMS"              },
  { id: "operating_systems", label: "Operating Systems" },
  { id: "full_stack",        label: "Full Stack Dev"    },
];

const CATEGORIES = ["Lecture Slides", "Assignment", "Reading Text", "Sample Code"];

// ─────────────────────────────────────────────────────────────────────────────
// MCQ CREATOR — single question form
// ─────────────────────────────────────────────────────────────────────────────
function MCQCreator() {
  const [subject,  setSubject]  = useState("");
  const [question, setQuestion] = useState("");
  const [options,  setOptions]  = useState(["", "", "", ""]);
  const [correct,  setCorrect]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState("");
  const [error,    setError]    = useState("");
  const [created,  setCreated]  = useState([]);

  const updateOption = (i, val) => {
    const copy = [...options];
    copy[i] = val;
    setOptions(copy);
    if (correct === options[i]) setCorrect(val);
  };

  const validate = () => {
    if (!subject)                    return "Please select a subject";
    if (question.trim().length < 10) return "Question must be at least 10 characters";
    if (options.some(o => !o.trim())) return "All 4 options must be filled";
    if (new Set(options.map(o => o.trim())).size !== 4) return "All 4 options must be unique";
    if (!correct)                    return "Please select the correct answer (click the ○ circle)";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      const res = await teacherService.createQuiz({
        subject,
        question: question.trim(),
        options:  options.map(o => o.trim()),
        correct_answer: correct,
      });
      const diff = res.data.difficulty;
      setSuccess(`✅ Question created! ML classified difficulty: ${diff.toUpperCase()}`);
      setCreated(prev => [{ question: question.trim(), difficulty: diff, subject }, ...prev.slice(0, 4)]);
      setQuestion(""); setOptions(["","","",""]); setCorrect(""); setSubject("");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create question");
    } finally {
      setLoading(false);
    }
  };

  const diffBg = { easy:"#dcfce7", medium:"#fef9c3", hard:"#fee2e2" };
  const diffTx = { easy:"#15803d", medium:"#92400e", hard:"#991b1b" };

  return (
    <div style={{ background:"white", borderRadius:"20px", border:"1px solid #e2e8f0", overflow:"hidden" }}>
      {/* Header */}
      <div style={{
        padding:"20px 24px", borderBottom:"1px solid #f1f5f9",
        background:"linear-gradient(135deg,#1e1b4b,#312e81)",
        display:"flex", alignItems:"center", gap:"12px",
      }}>
        <div style={{ width:"40px", height:"40px", borderRadius:"12px",
                      background:"rgba(255,255,255,0.15)", display:"flex",
                      alignItems:"center", justifyContent:"center", fontSize:"20px" }}>
          ✍️
        </div>
        <div>
          <h2 style={{ fontFamily:"Sora,sans-serif", fontWeight:"800", fontSize:"15px",
                       color:"white", margin:0 }}>Manual MCQ Entry</h2>
          
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding:"20px" }}>
        {/* Subject */}
        <div style={{ marginBottom:"14px" }}>
          <label style={{ display:"block", fontSize:"12px", fontWeight:"700",
                          color:"#374151", marginBottom:"5px" }}>Subject *</label>
          <select value={subject} onChange={e => setSubject(e.target.value)}
            style={{ width:"100%", padding:"9px 12px", borderRadius:"10px",
                     border:"1.5px solid #e2e8f0", background:"#f8faff",
                     fontSize:"13px", outline:"none", fontFamily:"DM Sans,sans-serif",
                     color: subject ? "#111827" : "#9ca3af" }}>
            <option value="">Select Subject</option>
            {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        {/* Question */}
        <div style={{ marginBottom:"14px" }}>
          <label style={{ display:"block", fontSize:"12px", fontWeight:"700",
                          color:"#374151", marginBottom:"5px" }}>Question *</label>
          <textarea value={question} onChange={e => setQuestion(e.target.value)}
            placeholder="e.g. What is the time complexity of binary search?"
            rows={3}
            style={{ width:"100%", padding:"9px 12px", borderRadius:"10px",
                     border:"1.5px solid #e2e8f0", background:"#f8faff",
                     fontSize:"13px", outline:"none", fontFamily:"DM Sans,sans-serif",
                     resize:"vertical", boxSizing:"border-box", color:"#111827" }}
            onFocus={e => e.target.style.borderColor="#6366f1"}
            onBlur={e => e.target.style.borderColor="#e2e8f0"}
          />
        </div>

        {/* Options */}
        <div style={{ marginBottom:"14px" }}>
          <label style={{ display:"block", fontSize:"12px", fontWeight:"700",
                          color:"#374151", marginBottom:"6px" }}>
            Options * <span style={{ color:"#9ca3af", fontWeight:"400" }}>
              — click ○ to mark correct
            </span>
          </label>
          <div style={{ display:"flex", flexDirection:"column", gap:"7px" }}>
            {options.map((opt, i) => {
              const letter     = ["A","B","C","D"][i];
              const isCorrect  = correct === opt.trim() && opt.trim() !== "";
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                  {/* Radio */}
                  <button type="button" title="Mark as correct"
                    onClick={() => opt.trim() && setCorrect(opt.trim())}
                    style={{
                      width:"26px", height:"26px", borderRadius:"50%", flexShrink:0,
                      border: isCorrect ? "2px solid #16a34a" : "2px solid #d1d5db",
                      background: isCorrect ? "#dcfce7" : "white",
                      cursor:"pointer", display:"flex", alignItems:"center",
                      justifyContent:"center", fontSize:"13px", transition:"all 0.15s",
                    }}>
                    {isCorrect ? "✓" : ""}
                  </button>
                  {/* Letter */}
                  <div style={{
                    width:"26px", height:"26px", borderRadius:"7px", flexShrink:0,
                    background: isCorrect ? "#dcfce7" : "#f3f4f6",
                    color: isCorrect ? "#15803d" : "#6b7280",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"11px", fontWeight:"800",
                  }}>{letter}</div>
                  {/* Input */}
                  <input type="text" value={opt}
                    onChange={e => updateOption(i, e.target.value)}
                    placeholder={`Option ${letter}`}
                    style={{
                      flex:1, padding:"8px 11px", borderRadius:"9px",
                      border:`1.5px solid ${isCorrect ? "#86efac" : "#e2e8f0"}`,
                      background: isCorrect ? "#f0fdf4" : "#f8faff",
                      fontSize:"13px", outline:"none",
                      fontFamily:"DM Sans,sans-serif", color:"#111827",
                    }}
                    onFocus={e => e.target.style.borderColor="#6366f1"}
                    onBlur={e => e.target.style.borderColor = isCorrect ? "#86efac" : "#e2e8f0"}
                  />
                </div>
              );
            })}
          </div>
          {correct && (
            <p style={{ fontSize:"11px", color:"#16a34a", marginTop:"5px", fontWeight:"600" }}>
              ✓ Correct answer: "{correct}"
            </p>
          )}
        </div>

        {error   && <div style={{ padding:"9px 12px", borderRadius:"9px", marginBottom:"10px",
                                  background:"#fef2f2", border:"1px solid #fecaca",
                                  fontSize:"12px", color:"#dc2626" }}>⚠️ {error}</div>}
        {success && <div style={{ padding:"9px 12px", borderRadius:"9px", marginBottom:"10px",
                                  background:"#f0fdf4", border:"1px solid #bbf7d0",
                                  fontSize:"12px", color:"#15803d" }}>{success}</div>}

        <button type="submit" disabled={loading} style={{
          width:"100%", padding:"11px", borderRadius:"11px", border:"none",
          background: loading ? "#c7d2fe" : "linear-gradient(135deg,#4f46e5,#7c3aed)",
          color:"white", fontSize:"13px", fontWeight:"700",
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily:"Sora,sans-serif",
          boxShadow: loading ? "none" : "0 4px 12px rgba(79,70,229,0.3)",
        }}>
          {loading
            ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"7px" }}>
                <span style={{ width:"13px", height:"13px", border:"2px solid rgba(255,255,255,0.4)",
                               borderTop:"2px solid white", borderRadius:"50%",
                               display:"inline-block", animation:"spin 0.8s linear infinite" }} />
                Creating…
              </span>
            : "➕ Add to Quiz Bank"
          }
        </button>
      </form>

      {/* Recent */}
      {created.length > 0 && (
        <div style={{ padding:"0 20px 16px" }}>
          <p style={{ fontSize:"11px", fontWeight:"700", color:"#9ca3af",
                      textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"7px" }}>
            Recently Added
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
            {created.map((q, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"8px",
                                    padding:"9px 11px", borderRadius:"9px",
                                    background:"#f8faff", border:"1px solid #e2e8f0" }}>
                <span style={{ fontSize:"12px", color:"#374151", flex:1,
                               lineHeight:"1.4", fontWeight:"500" }}>
                  {q.question.slice(0, 55)}{q.question.length > 55 ? "…" : ""}
                </span>
                <span style={{ fontSize:"10px", fontWeight:"700", padding:"2px 7px",
                               borderRadius:"999px", flexShrink:0,
                               background: diffBg[q.difficulty] || "#f3f4f6",
                               color:      diffTx[q.difficulty] || "#374151" }}>
                  {q.difficulty}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BULK QUIZ UPLOADER
// ─────────────────────────────────────────────────────────────────────────────
function BulkQuizUploader() {
  const [file,       setFile]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState("");
  const [dlLoading,  setDlLoading]  = useState(false);
  const inputRef = useRef(null);

  const handleDownloadTemplate = async () => {
    setDlLoading(true);
    try {
      const res = await teacherService.downloadQuizTemplate();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement("a");
      a.href    = url;
      a.download = "EduAI_Quiz_Template.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download template");
    } finally {
      setDlLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) { setError("Please select a file first"); return; }
    const suffix = file.name.split(".").pop().toLowerCase();
    if (!["xlsx","csv"].includes(suffix)) {
      setError("Only .xlsx and .csv files accepted");
      return;
    }
    setLoading(true); setError(""); setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await teacherService.bulkUploadQuiz(fd);
      setResult(res.data);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const diffColor = { easy:"#16a34a", medium:"#d97706", hard:"#dc2626" };
  const diffBg    = { easy:"#dcfce7", medium:"#fef9c3", hard:"#fee2e2" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>

      {/* Step 1 — Download template */}
      <div style={{ background:"white", borderRadius:"20px", border:"1px solid #e2e8f0",
                    overflow:"hidden" }}>
        <div style={{ padding:"18px 20px", borderBottom:"1px solid #f1f5f9",
                      display:"flex", alignItems:"center", gap:"10px" }}>
          
          <div>
            <h3 style={{ fontFamily:"Sora,sans-serif", fontWeight:"700", fontSize:"14px",
                         color:"#0f172a", margin:0 }}>Step 1 : Download Template</h3>
            
          </div>
        </div>
        <div style={{ padding:"16px 20px" }}>
          



          <button onClick={handleDownloadTemplate} disabled={dlLoading} style={{
            display:"flex", alignItems:"center", gap:"8px",
            padding:"10px 20px", borderRadius:"11px", border:"none",
            background: dlLoading ? "#c7d2fe" : "linear-gradient(135deg,#1e1b4b,#4f46e5)",
            color:"white", fontSize:"13px", fontWeight:"700",
            cursor: dlLoading ? "not-allowed" : "pointer",
            fontFamily:"Sora,sans-serif",
            boxShadow: dlLoading ? "none" : "0 4px 12px rgba(30,27,75,0.3)",
          }}>
            {dlLoading ? (
              <span style={{ width:"13px", height:"13px", border:"2px solid rgba(255,255,255,0.4)",
                             borderTop:"2px solid white", borderRadius:"50%",
                             display:"inline-block", animation:"spin 0.8s linear infinite" }} />
            ) : "📥"} Download EduAI_Quiz_Template.xlsx
          </button>
        </div>




        
      </div>

      {/* Step 2 — Fill & Upload */}
      <div style={{ background:"white", borderRadius:"20px", border:"1px solid #e2e8f0",
                    overflow:"hidden" }}>
        <div style={{ padding:"18px 20px", borderBottom:"1px solid #f1f5f9",
                      display:"flex", alignItems:"center", gap:"10px" }}>
         
          <div>
            <h3 style={{ fontFamily:"Sora,sans-serif", fontWeight:"700", fontSize:"14px",
                         color:"#0f172a", margin:0 }}>Step 2 : Fill & Upload</h3>
            <p style={{ fontSize:"12px", color:"#64748b", margin:0 }}>
              Fill the template, save as .xlsx or .csv, then upload below
            </p>
          </div>
        </div>
        <div style={{ padding:"16px 20px" }}>
          {/* File picker */}
          <div
            onClick={() => inputRef.current?.click()}
            style={{
              border:`2px dashed ${file ? "#6366f1" : "#e2e8f0"}`,
              borderRadius:"14px", padding:"24px",
              background: file ? "#eef2ff" : "#f8faff",
              cursor:"pointer", textAlign:"center",
              transition:"all 0.2s", marginBottom:"14px",
            }}
            onMouseEnter={e => { if(!file) e.currentTarget.style.borderColor="#6366f1"; }}
            onMouseLeave={e => { if(!file) e.currentTarget.style.borderColor="#e2e8f0"; }}
          >
            {file ? (
              <div>
                <div style={{ fontSize:"32px", marginBottom:"6px" }}>
                  {file.name.endsWith(".csv") ? "📋" : "📊"}
                </div>
                <p style={{ fontWeight:"700", color:"#4f46e5", margin:"0 0 4px",
                            fontSize:"14px" }}>{file.name}</p>
                <p style={{ fontSize:"12px", color:"#64748b", margin:0 }}>
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <button type="button"
                  onClick={e => { e.stopPropagation(); setFile(null); setResult(null); }}
                  style={{ marginTop:"8px", fontSize:"11px", color:"#ef4444",
                           background:"none", border:"none", cursor:"pointer",
                           textDecoration:"underline" }}>
                  Remove file
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize:"32px", marginBottom:"8px" }}></div>
                <p style={{ fontWeight:"600", color:"#374151", margin:"0 0 4px" }}>
                  Click to select file
                </p>
                <p style={{ fontSize:"12px", color:"#94a3b8", margin:0 }}>
                  Accepts .xlsx and .csv · Max 5 MB · Max 100 questions
                </p>
              </div>
            )}
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.csv"
                 style={{ display:"none" }}
                 onChange={e => { setFile(e.target.files[0]); setResult(null); setError(""); }} />

          {error && (
            <div style={{ padding:"9px 12px", borderRadius:"9px", marginBottom:"12px",
                          background:"#fef2f2", border:"1px solid #fecaca",
                          fontSize:"12px", color:"#dc2626" }}>
              ⚠️ {error}
            </div>
          )}

          <button onClick={handleUpload} disabled={loading || !file} style={{
            width:"100%", padding:"11px", borderRadius:"11px", border:"none",
            background: (loading || !file) ? "#c7d2fe" : "linear-gradient(135deg,#059669,#0891b2)",
            color:"white", fontSize:"13px", fontWeight:"700",
            cursor: (loading || !file) ? "not-allowed" : "pointer",
            fontFamily:"Sora,sans-serif",
            boxShadow: (loading || !file) ? "none" : "0 4px 12px rgba(5,150,105,0.3)",
          }}>
            {loading
              ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"7px" }}>
                  <span style={{ width:"13px", height:"13px", border:"2px solid rgba(255,255,255,0.4)",
                                 borderTop:"2px solid white", borderRadius:"50%",
                                 display:"inline-block", animation:"spin 0.8s linear infinite" }} />
                  Classifying & Uploading…
                </span>
              : " Upload & Classify All Questions"
            }
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div style={{ background:"white", borderRadius:"20px", border:"1px solid #e2e8f0",
                      overflow:"hidden" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9",
                        background:"#f0fdf4" }}>
            <h3 style={{ fontFamily:"Sora,sans-serif", fontWeight:"700", fontSize:"14px",
                         color:"#065f46", margin:"0 0 4px" }}>
              ✅ Upload Complete
            </h3>
            <p style={{ fontSize:"12px", color:"#047857", margin:0 }}>{result.message}</p>
          </div>
          <div style={{ padding:"16px 20px" }}>

            {/* Summary stats */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px",
                          marginBottom:"16px" }}>
              {[
                { label:"Created",  value: result.success_count, color:"#16a34a", bg:"#dcfce7" },
                { label:"Errors",   value: result.error_count,   color:"#dc2626", bg:"#fee2e2" },
                { label:"Total",    value: result.total_rows,    color:"#4f46e5", bg:"#eef2ff" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ textAlign:"center", padding:"12px 8px",
                                          borderRadius:"12px", background:bg }}>
                  <p style={{ fontSize:"22px", fontWeight:"800", color, margin:0,
                               fontFamily:"Sora,sans-serif" }}>{value}</p>
                  <p style={{ fontSize:"11px", color, margin:"2px 0 0", fontWeight:"600",
                               textTransform:"uppercase" }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Difficulty breakdown */}
            <div style={{ padding:"12px 14px", borderRadius:"12px", background:"#f8faff",
                          border:"1px solid #e2e8f0", marginBottom:"14px" }}>
              <p style={{ fontSize:"11px", fontWeight:"700", color:"#6b7280",
                          textTransform:"uppercase", margin:"0 0 10px" }}>
                ML Difficulty Breakdown
              </p>
              <div style={{ display:"flex", gap:"10px" }}>
                {Object.entries(result.difficulty_breakdown).map(([diff, count]) => (
                  <div key={diff} style={{ flex:1, textAlign:"center", padding:"8px",
                                           borderRadius:"10px",
                                           background: diffBg[diff], border:`1px solid ${diffColor[diff]}33` }}>
                    <p style={{ fontSize:"18px", fontWeight:"800", color:diffColor[diff],
                                 margin:0, fontFamily:"Sora,sans-serif" }}>{count}</p>
                    <p style={{ fontSize:"11px", color:diffColor[diff], margin:"2px 0 0",
                                 fontWeight:"700", textTransform:"capitalize" }}>{diff}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize:"10px", color:"#94a3b8", margin:"8px 0 0",
                          fontStyle:"italic" }}>
                Classifier: {result.ml_classifier}
              </p>
            </div>

            {/* Per-row results */}
            <div style={{ maxHeight:"240px", overflowY:"auto" }}>
              {result.results.map((r, i) => (
                <div key={i} style={{
                  display:"flex", alignItems:"flex-start", gap:"10px",
                  padding:"8px 10px", borderRadius:"9px", marginBottom:"5px",
                  background: r.status === "success" ? "#f0fdf4" : "#fef2f2",
                  border:`1px solid ${r.status === "success" ? "#bbf7d0" : "#fecaca"}`,
                }}>
                  <span style={{ fontSize:"14px", flexShrink:0 }}>
                    {r.status === "success" ? "✅" : "❌"}
                  </span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:"12px", fontWeight:"600",
                                color: r.status === "success" ? "#065f46" : "#991b1b",
                                margin:"0 0 2px" }}>
                      Row {r.row} — {r.question}
                    </p>
                    {r.status === "success" ? (
                      <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                        <span style={{ fontSize:"10px", padding:"1px 7px", borderRadius:"999px",
                                       background: diffBg[r.difficulty],
                                       color: diffColor[r.difficulty], fontWeight:"700" }}>
                          {r.difficulty}
                        </span>
                        <span style={{ fontSize:"10px", color:"#059669" }}>
                          {r.subject}
                        </span>
                      </div>
                    ) : (
                      <p style={{ fontSize:"11px", color:"#dc2626", margin:0 }}>
                        {r.errors?.join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN UPLOAD PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function UploadPage() {
  const [subject,   setSubject]   = useState("");
  const [title,     setTitle]     = useState("");
  const [category,  setCategory]  = useState(CATEGORIES[0]);
  const [file,      setFile]      = useState(null);
  const [fileError, setFileError] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState("");
  const [error,     setError]     = useState("");
  const [activeTab, setActiveTab] = useState("material");
  // quiz sub-tab: "manual" | "bulk"
  const [quizTab,   setQuizTab]   = useState("manual");

  useEffect(() => { loadMaterials(); }, []);

  const loadMaterials = async () => {
    try {
      const res = await teacherService.listMaterials();
      setMaterials(res.data || []);
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!subject)      { setError("Please select a subject"); return; }
    if (!title.trim()) { setError("Please enter a material title"); return; }
    if (!file)         { setError("Please select a file"); return; }
    if (fileError)     { setError(fileError); return; }
    const fd = new FormData();
    fd.append("subject", subject);
    fd.append("file", file);
    setLoading(true);
    try {
      const res = await teacherService.uploadMaterial(fd);
      setSuccess(`✅ "${file.name}" uploaded! ${res.data.chunks_created} chunks created and indexed for RAG.`);
      setFile(null); setTitle(""); setSubject("");
      loadMaterials();
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key:"material", label:"📄 Upload Material" },
    { key:"quiz",     label:"📝 Quiz Management" },
  ];

  const quizTabs = [
    { key:"manual", label:" Manual MCQ" },
    { key:"bulk",   label:" Bulk Upload" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div style={{
        borderRadius:"20px", padding:"24px 28px",
        background:"linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#312e81 100%)",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:"16px",
      }}>
        <div>
          <h1 style={{ fontFamily:"Sora,sans-serif", fontWeight:"800", fontSize:"22px",
                       color:"white", margin:"0 0 4px" }}>
            Teaching Resources
          </h1>
          <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.6)", margin:0 }}>
            Upload study materials · Create quiz questions · Bulk import MCQs
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px",
                      padding:"8px 16px", borderRadius:"12px",
                      background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)" }}>
          <span style={{ fontSize:"13px", fontWeight:"600", color:"rgba(255,255,255,0.9)" }}>
            📁 {materials.length} materials uploaded
          </span>
        </div>
      </div>

      {/* Main tab switcher */}
      <div style={{ display:"flex", background:"#f1f5f9", borderRadius:"14px",
                    padding:"4px", gap:"4px" }}>
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            flex:1, padding:"10px", borderRadius:"10px", border:"none",
            cursor:"pointer", fontSize:"14px", fontWeight:"600",
            transition:"all 0.2s", fontFamily:"DM Sans,sans-serif",
            background: activeTab === key ? "white" : "transparent",
            color:      activeTab === key ? "#1e293b" : "#64748b",
            boxShadow:  activeTab === key ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
          }}>{label}</button>
        ))}
      </div>

      {/* ── MATERIAL TAB ── */}
      {activeTab === "material" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <form onSubmit={handleSubmit} className="card space-y-4">
            <h2 className="font-display font-semibold text-gray-900">Material Details</h2>

            <div>
              <label className="form-label">Subject Name</label>
              <select value={subject} onChange={e => setSubject(e.target.value)} className="form-input">
                <option value="">Select a Subject</option>
                {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label className="form-label">Material Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                     placeholder="e.g. Week 4: Linked Lists Deep Dive" className="form-input" />
            </div>

            <div>
              <label className="form-label">Document Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button key={c} type="button" onClick={() => setCategory(c)}
                    className="px-3 py-1.5 rounded-xl border text-xs font-semibold transition"
                    style={{ borderColor: category===c ? "#4f46e5":"#e5e7eb",
                             background:  category===c ? "#eef2ff":"white",
                             color:       category===c ? "#4338ca":"#6b7280" }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            

            {success && <div style={{ padding:"10px 14px", borderRadius:"10px",
                                      background:"#f0fdf4", border:"1px solid #bbf7d0",
                                      fontSize:"13px", color:"#15803d" }}>{success}</div>}
            {error   && <div style={{ padding:"10px 14px", borderRadius:"10px",
                                      background:"#fef2f2", border:"1px solid #fecaca",
                                      fontSize:"13px", color:"#dc2626" }}>⚠️ {error}</div>}

            <button type="submit" disabled={loading} style={{
              width:"100%", padding:"13px", borderRadius:"12px", border:"none",
              background: loading ? "#c7d2fe" : "linear-gradient(135deg,#0f172a,#312e81)",
              color:"white", fontSize:"14px", fontWeight:"700",
              cursor: loading ? "not-allowed":"pointer", fontFamily:"Sora,sans-serif",
              boxShadow: loading ? "none":"0 4px 14px rgba(15,23,42,0.3)",
            }}>
              {loading ? (
                <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
                  <span style={{ width:"14px", height:"14px", border:"2px solid rgba(255,255,255,0.4)",
                                 borderTop:"2px solid white", borderRadius:"50%",
                                 display:"inline-block", animation:"spin 0.8s linear infinite" }} />
                  Processing & Embedding…
                </span>
              ) : "📤 Upload to Portal"}
            </button>
          </form>

          <div className="space-y-4">
            <div className="card">
              <FileUpload file={file}
                onChange={(f, err) => { setFile(f); setFileError(err); }}
                error={fileError} />
            </div>
           


          </div>
        </div>
      )}

      {/* ── QUIZ TAB ── */}
      {activeTab === "quiz" && (
        <div>
          {/* Quiz sub-tabs */}
          <div style={{ display:"flex", background:"#f1f5f9", borderRadius:"12px",
                        padding:"4px", gap:"4px", marginBottom:"16px",
                        maxWidth:"380px" }}>
            {quizTabs.map(({ key, label }) => (
              <button key={key} onClick={() => setQuizTab(key)} style={{
                flex:1, padding:"8px 12px", borderRadius:"9px", border:"none",
                cursor:"pointer", fontSize:"13px", fontWeight:"600",
                transition:"all 0.2s", fontFamily:"DM Sans,sans-serif",
                background: quizTab===key ? "white" : "transparent",
                color:      quizTab===key ? "#1e293b" : "#64748b",
                boxShadow:  quizTab===key ? "0 1px 6px rgba(0,0,0,0.08)" : "none",
              }}>{label}</button>
            ))}
          </div>

          {quizTab === "manual" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <MCQCreator />
             
            </div>
          )}

          {quizTab === "bulk" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div style={{ gridColumn:"1 / span 2" }}>
                <BulkQuizUploader />
              </div>
              {/* Instructions sidebar */}
              <div className="card space-y-4">
                <h3 className="font-display font-semibold text-gray-900">Bulk Upload Rules</h3>
                <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                  {[
                    { title:"1. Format", desc:"Download the .xlsx template. Fill rows from row 2 onward. Do not change column headers." },
                    {  title:"2. Required fields", desc:"All 7 columns must be filled: subject, question, option_a/b/c/d, correct_answer." },
                    { title:"3. Subject values", desc:"Must exactly match: data_structures, machine_learning, dbms, operating_systems, full_stack" },
                    { title:"4. correct_answer", desc:"Must be: option_a, option_b, option_c, or option_d (not the text, the key name)" },
                    { title:"5. Limits", desc:"Max 100 questions per upload. Max 5 MB file size." },
                   
                  ].map(({ icon, title, desc }) => (
                    <div key={title} style={{ display:"flex", gap:"10px" }}>
                      <span style={{ fontSize:"18px", flexShrink:0 }}>{icon}</span>
                      <div>
                        <p style={{ fontSize:"12px", fontWeight:"700", color:"#111827", margin:"0 0 2px" }}>{title}</p>
                        <p style={{ fontSize:"11px", color:"#6b7280", margin:0, lineHeight:"1.4" }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}