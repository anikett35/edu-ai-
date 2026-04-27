// src/pages/Subjects/ManageSubjectsPage.jsx
// Teacher-only: Create, edit, delete subjects with semester assignment
import React, { useState, useEffect } from "react";
import { subjectsService } from "../../api/services";
import { PageLoader } from "../../components/common/LoadingSpinner";

const SEMESTER_LABELS = {
  1:"1st Semester", 2:"2nd Semester", 3:"3rd Semester", 4:"4th Semester",
  5:"5th Semester", 6:"6th Semester", 7:"7th Semester", 8:"8th Semester",
};

const PRESET_ICONS  = ["📚","💻","🧮","🔬","🗄️","🤖","⚙️","🌐","📊","🔷","📐","🧠","🔐","📡"];
const PRESET_COLORS = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#0ea5e9","#14b8a6","#f97316"];

const EMPTY_FORM = {
  name:"", code:"", description:"", semester:1,
  tags:"", icon:"📚", color:"#6366f1", is_active:true,
};

function SubjectForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim())        e.name        = "Name required";
    if (!form.code.trim())        e.code        = "Code required (e.g. CS301)";
    if (form.description.trim().length < 10) e.description = "Min 10 characters";
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    onSave({
      ...form,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
    });
  };

  const inp = (key, type="text", placeholder="") => (
    <input
      type={type}
      value={form[key]}
      onChange={e => setForm(p => ({ ...p, [key]: type === "number" ? +e.target.value : e.target.value }))}
      placeholder={placeholder}
      style={{
        width:"100%", padding:"9px 12px", borderRadius:"10px",
        border:`1.5px solid ${errors[key] ? "#fca5a5" : "#e2e8f0"}`,
        background:"#f8faff", fontSize:"13px", outline:"none",
        fontFamily:"DM Sans,sans-serif", color:"#111827", boxSizing:"border-box",
      }}
      onFocus={e => e.target.style.borderColor = "#6366f1"}
      onBlur={e => e.target.style.borderColor = errors[key] ? "#fca5a5" : "#e2e8f0"}
    />
  );

  const lbl = (text, required) => (
    <label style={{ display:"block", fontSize:"12px", fontWeight:"700",
                    color:"#374151", marginBottom:"5px" }}>
      {text}{required && <span style={{ color:"#ef4444" }}> *</span>}
    </label>
  );

  return (
    <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
        <div>
          {lbl("Subject Name", true)}
          {inp("name","text","e.g. Database Management Systems")}
          {errors.name && <p style={{ fontSize:"11px", color:"#ef4444", margin:"3px 0 0" }}>{errors.name}</p>}
        </div>
        <div>
          {lbl("Subject Code", true)}
          {inp("code","text","e.g. CS301")}
          {errors.code && <p style={{ fontSize:"11px", color:"#ef4444", margin:"3px 0 0" }}>{errors.code}</p>}
        </div>
      </div>

      <div>
        {lbl("Description", true)}
        <textarea
          value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          placeholder="Brief description of what students will learn..."
          rows={3}
          style={{ width:"100%", padding:"9px 12px", borderRadius:"10px",
                   border:`1.5px solid ${errors.description ? "#fca5a5":"#e2e8f0"}`,
                   background:"#f8faff", fontSize:"13px", outline:"none",
                   fontFamily:"DM Sans,sans-serif", resize:"vertical",
                   boxSizing:"border-box", color:"#111827" }}
          onFocus={e => e.target.style.borderColor="#6366f1"}
          onBlur={e => e.target.style.borderColor=errors.description?"#fca5a5":"#e2e8f0"}
        />
        {errors.description && <p style={{ fontSize:"11px", color:"#ef4444", margin:"3px 0 0" }}>{errors.description}</p>}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
        <div>
          {lbl("Semester")}
          <select value={form.semester} onChange={e => setForm(p => ({ ...p, semester: +e.target.value }))}
            style={{ width:"100%", padding:"9px 12px", borderRadius:"10px",
                     border:"1.5px solid #e2e8f0", background:"#f8faff",
                     fontSize:"13px", outline:"none", fontFamily:"DM Sans,sans-serif", color:"#111827" }}>
            {[1,2,3,4,5,6,7,8].map(s => (
              <option key={s} value={s}>{SEMESTER_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          {lbl("Tags (comma separated)")}
          {inp("tags","text","SQL, Normalization, ACID")}
        </div>
      </div>

      {/* Icon picker */}
      <div>
        {lbl("Icon")}
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
          {PRESET_ICONS.map(icon => (
            <button key={icon} type="button" onClick={() => setForm(p => ({ ...p, icon }))}
              style={{
                width:"36px", height:"36px", borderRadius:"9px", fontSize:"18px",
                border:`2px solid ${form.icon === icon ? "#6366f1" : "#e2e8f0"}`,
                background: form.icon === icon ? "#eef2ff" : "white",
                cursor:"pointer", transition:"all 0.12s",
              }}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div>
        {lbl("Card Color")}
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", alignItems:"center" }}>
          {PRESET_COLORS.map(color => (
            <button key={color} type="button" onClick={() => setForm(p => ({ ...p, color }))}
              style={{
                width:"28px", height:"28px", borderRadius:"50%", background:color,
                border:`3px solid ${form.color === color ? "#111827" : "transparent"}`,
                cursor:"pointer", transition:"all 0.12s", outline:"none",
              }} />
          ))}
          <input type="color" value={form.color}
            onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
            style={{ width:"32px", height:"28px", borderRadius:"8px",
                     border:"1px solid #e2e8f0", cursor:"pointer", padding:"2px" }} />
          <span style={{ fontSize:"12px", color:"#9ca3af" }}>Custom</span>
        </div>
      </div>

      {/* Active toggle */}
      <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
        <button type="button" onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
          style={{
            width:"44px", height:"24px", borderRadius:"999px", border:"none",
            background: form.is_active ? "#6366f1" : "#d1d5db",
            cursor:"pointer", position:"relative", transition:"all 0.2s",
          }}>
          <div style={{
            width:"18px", height:"18px", borderRadius:"50%", background:"white",
            position:"absolute", top:"3px",
            left: form.is_active ? "23px" : "3px",
            transition:"left 0.2s",
          }} />
        </button>
        <span style={{ fontSize:"13px", fontWeight:"600", color:"#374151" }}>
          {form.is_active ? "Active (visible to students)" : "Inactive (hidden from students)"}
        </span>
      </div>

      {/* Preview */}
      <div style={{ padding:"14px", borderRadius:"14px", background:"#f8faff",
                    border:`2px solid ${form.color}33` }}>
        <p style={{ fontSize:"11px", fontWeight:"700", color:"#9ca3af",
                    textTransform:"uppercase", margin:"0 0 8px" }}>Preview</p>
        <div style={{ display:"flex", alignItems:"flex-start", gap:"12px" }}>
          <div style={{ width:"44px", height:"44px", borderRadius:"12px",
                        background:`${form.color}18`, display:"flex",
                        alignItems:"center", justifyContent:"center", fontSize:"22px", flexShrink:0 }}>
            {form.icon}
          </div>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"2px" }}>
              <span style={{ fontFamily:"Sora,sans-serif", fontWeight:"700", fontSize:"14px",
                             color:"#111827" }}>
                {form.name || "Subject Name"}
              </span>
              <span style={{ fontSize:"10px", padding:"1px 7px", borderRadius:"999px",
                             background:`${form.color}18`, color:form.color, fontWeight:"700" }}>
                {form.code || "CODE"}
              </span>
              <span style={{ fontSize:"10px", padding:"1px 7px", borderRadius:"999px",
                             background:"#f1f5f9", color:"#64748b" }}>
                Sem {form.semester}
              </span>
            </div>
            <p style={{ fontSize:"12px", color:"#64748b", margin:0, lineHeight:"1.4" }}>
              {form.description || "Subject description will appear here"}
            </p>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display:"flex", gap:"10px", justifyContent:"flex-end", paddingTop:"4px" }}>
        <button type="button" onClick={onCancel} style={{
          padding:"9px 18px", borderRadius:"10px", border:"1.5px solid #e2e8f0",
          background:"white", color:"#64748b", fontSize:"13px", fontWeight:"600",
          cursor:"pointer", fontFamily:"DM Sans,sans-serif",
        }}>Cancel</button>
        <button type="submit" disabled={loading} style={{
          padding:"9px 20px", borderRadius:"10px", border:"none",
          background: loading ? "#c7d2fe" : "linear-gradient(135deg,#4f46e5,#7c3aed)",
          color:"white", fontSize:"13px", fontWeight:"700",
          cursor: loading ? "not-allowed":"pointer", fontFamily:"Sora,sans-serif",
          boxShadow: loading ? "none" : "0 4px 12px rgba(79,70,229,0.3)",
          display:"flex", alignItems:"center", gap:"7px",
        }}>
          {loading && <span style={{ width:"12px", height:"12px", border:"2px solid rgba(255,255,255,0.4)",
                                     borderTop:"2px solid white", borderRadius:"50%",
                                     display:"inline-block", animation:"spin 0.8s linear infinite" }} />}
          {initial ? "💾 Save Changes" : "➕ Create Subject"}
        </button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </form>
  );
}

export default function ManageSubjectsPage() {
  const [subjects, setSubjects]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [saving,   setSaving]     = useState(false);
  const [error,    setError]      = useState("");
  const [success,  setSuccess]    = useState("");
  const [mode,     setMode]       = useState("list"); // "list" | "create" | "edit"
  const [editing,  setEditing]    = useState(null);
  const [currentSem, setCurrentSem] = useState(1);

  useEffect(() => { fetchSubjects(); }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await subjectsService.myList();
      setSubjects(res.data.subjects || []);
    } catch { setError("Failed to load subjects"); }
    finally { setLoading(false); }
  };

  const handleCreate = async (data) => {
    setSaving(true); setError(""); setSuccess("");
    try {
      await subjectsService.create(data);
      setSuccess("✅ Subject created successfully!");
      setMode("list");
      await fetchSubjects();
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to create subject");
    } finally { setSaving(false); }
  };

  const handleUpdate = async (data) => {
    setSaving(true); setError(""); setSuccess("");
    try {
      await subjectsService.update(editing.id, data);
      setSuccess("✅ Subject updated successfully!");
      setMode("list");
      setEditing(null);
      await fetchSubjects();
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to update subject");
    } finally { setSaving(false); }
  };

  const handleDelete = async (sub) => {
    if (!window.confirm(`Delete "${sub.name}"? This won't delete associated materials or quizzes.`)) return;
    try {
      await subjectsService.delete(sub.id);
      setSuccess(`✅ "${sub.name}" deleted`);
      await fetchSubjects();
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to delete subject");
    }
  };

  const toggleActive = async (sub) => {
    try {
      await subjectsService.update(sub.id, { is_active: !sub.is_active });
      await fetchSubjects();
    } catch {}
  };

  // Group by semester
  const grouped = subjects.reduce((acc, s) => {
    const sem = s.semester;
    if (!acc[sem]) acc[sem] = [];
    acc[sem].push(s);
    return acc;
  }, {});

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div style={{
        borderRadius:"20px", padding:"24px 28px",
        background:"linear-gradient(135deg,#0f172a,#1e1b4b,#312e81)",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:"16px",
      }}>
        <div>
          <h1 style={{ fontFamily:"Sora,sans-serif", fontWeight:"800", fontSize:"22px",
                       color:"white", margin:"0 0 4px" }}>
            Manage Subjects
          </h1>
          <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.6)", margin:0 }}>
            Create and manage subjects · Assign semesters · Students see them organised by semester
          </p>
        </div>
        {mode === "list" && (
          <button onClick={() => { setMode("create"); setError(""); setSuccess(""); }}
            style={{
              padding:"10px 20px", borderRadius:"12px", border:"none",
              background:"white", color:"#4f46e5", fontSize:"13px", fontWeight:"700",
              cursor:"pointer", fontFamily:"Sora,sans-serif",
              boxShadow:"0 4px 12px rgba(0,0,0,0.15)",
            }}>
            ➕ New Subject
          </button>
        )}
      </div>

      {/* Current Semester Setter */}
      <div style={{ background:"white", borderRadius:"16px", border:"1px solid #e2e8f0",
                    padding:"16px 20px", display:"flex", alignItems:"center",
                    gap:"14px", flexWrap:"wrap" }}>
        <div style={{ width:"36px", height:"36px", borderRadius:"10px",
                      background:"#eef2ff", display:"flex", alignItems:"center",
                      justifyContent:"center", fontSize:"18px" }}>📅</div>
        <div style={{ flex:1 }}>
          <p style={{ fontFamily:"Sora,sans-serif", fontWeight:"700", fontSize:"13px",
                      color:"#0f172a", margin:"0 0 2px" }}>
            Active Semester for Students
          </p>
          <p style={{ fontSize:"12px", color:"#94a3b8", margin:0 }}>
            Students see only subjects assigned to this semester. Change it each new semester.
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <select
            value={currentSem}
            onChange={e => setCurrentSem(+e.target.value)}
            style={{ padding:"8px 12px", borderRadius:"10px", border:"1.5px solid #6366f1",
                     background:"white", fontSize:"13px", fontWeight:"600",
                     color:"#4f46e5", outline:"none", cursor:"pointer",
                     fontFamily:"DM Sans,sans-serif" }}
          >
            {[1,2,3,4,5,6,7,8].map(s => (
              <option key={s} value={s}>{SEMESTER_LABELS[s]}</option>
            ))}
          </select>
          <div style={{ padding:"6px 12px", borderRadius:"10px", background:"#eef2ff",
                        fontSize:"12px", fontWeight:"700", color:"#4338ca" }}>
            Active ✓
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error   && <div style={{ padding:"12px 16px", borderRadius:"12px", background:"#fef2f2",
                                 border:"1px solid #fecaca", color:"#dc2626", fontSize:"13px" }}>
                    ⚠️ {error}
                  </div>}
      {success && <div style={{ padding:"12px 16px", borderRadius:"12px", background:"#f0fdf4",
                                 border:"1px solid #bbf7d0", color:"#15803d", fontSize:"13px" }}>
                    {success}
                  </div>}

      {/* Create / Edit form */}
      {(mode === "create" || mode === "edit") && (
        <div style={{ background:"white", borderRadius:"20px", border:"1px solid #e2e8f0",
                      overflow:"hidden" }}>
          <div style={{ padding:"18px 24px", borderBottom:"1px solid #f1f5f9",
                        display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{ width:"36px", height:"36px", borderRadius:"10px",
                          background:"#eef2ff", display:"flex", alignItems:"center",
                          justifyContent:"center", fontSize:"18px" }}>
              {mode === "create" ? "➕" : "✏️"}
            </div>
            <h2 style={{ fontFamily:"Sora,sans-serif", fontWeight:"700", fontSize:"15px",
                         color:"#0f172a", margin:0 }}>
              {mode === "create" ? "Create New Subject" : `Edit — ${editing?.name}`}
            </h2>
          </div>
          <div style={{ padding:"24px" }}>
            <SubjectForm
              initial={mode === "edit" ? {
                ...editing,
                tags: (editing?.tags || []).join(", "),
              } : null}
              onSave={mode === "create" ? handleCreate : handleUpdate}
              onCancel={() => { setMode("list"); setEditing(null); }}
              loading={saving}
            />
          </div>
        </div>
      )}

      {/* Subject list grouped by semester */}
      {mode === "list" && (
        <>
          {subjects.length === 0 ? (
            <div style={{ background:"white", borderRadius:"20px", border:"1px solid #e2e8f0",
                          padding:"60px 24px", textAlign:"center" }}>
              <div style={{ fontSize:"48px", marginBottom:"12px" }}>📚</div>
              <h3 style={{ fontFamily:"Sora,sans-serif", fontWeight:"700", fontSize:"16px",
                           color:"#374151", margin:"0 0 8px" }}>
                No subjects yet
              </h3>
              <p style={{ fontSize:"13px", color:"#94a3b8", margin:"0 0 20px" }}>
                Create your first subject and assign it a semester. Students will see them organised by semester.
              </p>
              <button onClick={() => setMode("create")} style={{
                padding:"10px 22px", borderRadius:"12px", border:"none",
                background:"linear-gradient(135deg,#4f46e5,#7c3aed)",
                color:"white", fontSize:"13px", fontWeight:"700",
                cursor:"pointer", fontFamily:"Sora,sans-serif",
              }}>
                ➕ Create First Subject
              </button>
            </div>
          ) : (
            Object.entries(grouped)
              .sort(([a],[b]) => +a - +b)
              .map(([sem, subs]) => (
                <div key={sem}>
                  {/* Semester header */}
                  <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"12px" }}>
                    <div style={{ width:"32px", height:"32px", borderRadius:"9px",
                                  background:"linear-gradient(135deg,#4f46e5,#7c3aed)",
                                  display:"flex", alignItems:"center", justifyContent:"center",
                                  color:"white", fontWeight:"800", fontSize:"13px",
                                  fontFamily:"Sora,sans-serif" }}>
                      {sem}
                    </div>
                    <h2 style={{ fontFamily:"Sora,sans-serif", fontWeight:"700", fontSize:"15px",
                                 color:"#0f172a", margin:0 }}>
                      {SEMESTER_LABELS[+sem]}
                    </h2>
                    <span style={{ fontSize:"12px", color:"#94a3b8" }}>
                      {subs.length} subject{subs.length !== 1 ? "s":""}
                    </span>
                  </div>

                  {/* Subject cards */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",
                                 gap:"12px", marginBottom:"24px" }}>
                    {subs.map(sub => (
                      <div key={sub.id} style={{
                        background:"white", borderRadius:"16px",
                        border:`1px solid ${sub.color}33`,
                        overflow:"hidden", transition:"box-shadow 0.15s",
                        opacity: sub.is_active ? 1 : 0.6,
                      }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow=`0 4px 20px ${sub.color}22`}
                        onMouseLeave={e => e.currentTarget.style.boxShadow="none"}
                      >
                        {/* Color bar */}
                        <div style={{ height:"4px", background:sub.color }} />

                        <div style={{ padding:"16px" }}>
                          <div style={{ display:"flex", alignItems:"flex-start",
                                        justifyContent:"space-between", gap:"8px" }}>
                            <div style={{ display:"flex", gap:"10px", alignItems:"flex-start", flex:1 }}>
                              <div style={{ width:"40px", height:"40px", borderRadius:"10px",
                                            background:`${sub.color}18`, display:"flex",
                                            alignItems:"center", justifyContent:"center",
                                            fontSize:"20px", flexShrink:0 }}>
                                {sub.icon}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ display:"flex", alignItems:"center",
                                              gap:"6px", marginBottom:"2px", flexWrap:"wrap" }}>
                                  <span style={{ fontFamily:"Sora,sans-serif", fontWeight:"700",
                                                 fontSize:"13px", color:"#111827" }}>
                                    {sub.name}
                                  </span>
                                  <span style={{ fontSize:"10px", padding:"1px 6px", borderRadius:"5px",
                                                 background:`${sub.color}18`, color:sub.color,
                                                 fontWeight:"700" }}>
                                    {sub.code}
                                  </span>
                                  {!sub.is_active && (
                                    <span style={{ fontSize:"10px", padding:"1px 6px", borderRadius:"5px",
                                                   background:"#f3f4f6", color:"#9ca3af",
                                                   fontWeight:"600" }}>
                                      Hidden
                                    </span>
                                  )}
                                </div>
                                <p style={{ fontSize:"11px", color:"#64748b", margin:0,
                                            lineHeight:"1.4",
                                            display:"-webkit-box", WebkitLineClamp:2,
                                            WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                                  {sub.description}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Tags */}
                          {sub.tags?.length > 0 && (
                            <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", marginTop:"8px" }}>
                              {sub.tags.slice(0,4).map(t => (
                                <span key={t} style={{ fontSize:"10px", padding:"2px 7px",
                                                       borderRadius:"999px", background:"#f1f5f9",
                                                       color:"#64748b", fontWeight:"500" }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Actions */}
                          <div style={{ display:"flex", gap:"6px", marginTop:"12px" }}>
                            <button onClick={() => { setEditing(sub); setMode("edit"); setError(""); setSuccess(""); }}
                              style={{
                                flex:1, padding:"7px", borderRadius:"9px",
                                border:"1.5px solid #e2e8f0", background:"white",
                                fontSize:"12px", fontWeight:"600", color:"#374151",
                                cursor:"pointer",
                              }}>
                              ✏️ Edit
                            </button>
                            <button onClick={() => toggleActive(sub)}
                              style={{
                                flex:1, padding:"7px", borderRadius:"9px",
                                border:`1.5px solid ${sub.is_active ? "#fde68a" : "#bbf7d0"}`,
                                background: sub.is_active ? "#fffbeb" : "#f0fdf4",
                                fontSize:"12px", fontWeight:"600",
                                color: sub.is_active ? "#92400e" : "#065f46",
                                cursor:"pointer",
                              }}>
                              {sub.is_active ? "🙈 Hide" : "👁️ Show"}
                            </button>
                            <button onClick={() => handleDelete(sub)}
                              style={{
                                padding:"7px 10px", borderRadius:"9px",
                                border:"1.5px solid #fecaca", background:"#fef2f2",
                                fontSize:"12px", fontWeight:"600", color:"#dc2626",
                                cursor:"pointer",
                              }}>
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </>
      )}
    </div>
  );
}