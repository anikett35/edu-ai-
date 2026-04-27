// src/pages/Subjects/SubjectsPage.jsx
// All subjects shown for the CURRENT semester (set by teacher).
// No semester filter tabs — students see only their active semester's subjects.
// Teacher can change the active semester from Manage Subjects page.
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { subjectsService } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import { PageLoader } from "../../components/common/LoadingSpinner";

const SEMESTER_LABELS = {
  1:"1st Sem", 2:"2nd Sem", 3:"3rd Sem", 4:"4th Sem",
  5:"5th Sem", 6:"6th Sem", 7:"7th Sem", 8:"8th Sem",
};

const FALLBACK_SUBJECTS = [
  { id:"full_stack",        name:"Full Stack Development", code:"CS401",
    description:"Comprehensive curriculum covering modern Frontend architectures, scalable Backend systems, RESTful APIs, and robust Databases.",
    semester:1, tags:["Frontend","Backend","APIs","Databases"], icon:"🌐", color:"#3b82f6", is_active:true },
  { id:"dbms",              name:"DBMS",                   code:"CS301",
    description:"Mastering SQL, database normalization, complex queries, and ACID transactions.",
    semester:1, tags:["SQL","Normalization","ACID"], icon:"🗄️", color:"#8b5cf6", is_active:true },
  { id:"data_structures",   name:"Data Structures",        code:"CS201",
    description:"Fundamental building blocks: Arrays, linked lists, stacks, queues, and tree-based hierarchical models.",
    semester:1, tags:["Arrays","Trees","Graphs"], icon:"🔷", color:"#6366f1", is_active:true },
  { id:"machine_learning",  name:"Machine Learning",       code:"CS501",
    description:"Exploring supervised learning, statistical models, neural networks, and iterative training methodologies.",
    semester:1, tags:["Supervised","Neural Nets","Training"], icon:"🤖", color:"#f59e0b", is_active:true },
  { id:"operating_systems", name:"Operating Systems",      code:"CS302",
    description:"Low-level systems logic: Processes, memory management, CPU scheduling, and file system architecture.",
    semester:1, tags:["Processes","Memory","Scheduling"], icon:"⚙️", color:"#10b981", is_active:true },
];

export default function SubjectsPage() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const isTeacher = user?.role === "teacher";

  const [subjects,    setSubjects]    = useState([]);
  const [currentSem,  setCurrentSem]  = useState(null);
  const [nextSem,     setNextSem]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [useFallback, setUseFallback] = useState(false);
  const [search,      setSearch]      = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res  = await subjectsService.list();
        const flat = res.data.flat || [];

        if (flat.length === 0) {
          setSubjects(FALLBACK_SUBJECTS);
          setUseFallback(true);
          setCurrentSem(1);
          setNextSem(2);
        } else {
          setSubjects(flat);
          // Determine current semester: highest semester that has subjects
          const sems = [...new Set(flat.map(s => s.semester))].sort((a,b) => a-b);
          const cur  = sems[0] ?? 1;
          const nxt  = sems[1] ?? null;
          setCurrentSem(cur);
          setNextSem(nxt);
        }
      } catch {
        setSubjects(FALLBACK_SUBJECTS);
        setUseFallback(true);
        setCurrentSem(1);
        setNextSem(2);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Only subjects for current semester
  const currentSubjects = subjects.filter(s =>
    s.semester === currentSem && s.is_active !== false
  );

  const filtered = currentSubjects.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code?.toLowerCase().includes(search.toLowerCase()) ||
    s.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const goToTutor     = (s) => navigate(`/tutor?subject=${s.id || s.code?.toLowerCase()}`);
  const goToQuiz      = (s) => navigate(`/quiz?subject=${s.id || s.code?.toLowerCase()}`);
  const goToMaterials = (s) => navigate(`/materials?subject=${s.id || s.code?.toLowerCase()}`);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div style={{
        borderRadius:"20px", padding:"24px 28px",
        background:"linear-gradient(135deg,#1e1b4b,#312e81,#4f46e5)",
        position:"relative", overflow:"hidden",
      }}>
        {/* Decorations */}
        <div style={{ position:"absolute", top:"-30px", right:"80px", width:"120px", height:"120px",
                      borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />
        <div style={{ position:"absolute", bottom:"-40px", right:"-20px", width:"160px", height:"160px",
                      borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                      flexWrap:"wrap", gap:"16px", position:"relative" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"6px" }}>
              <h1 style={{ fontFamily:"Sora,sans-serif", fontWeight:"800", fontSize:"22px",
                           color:"white", margin:0 }}>
                Academic Subjects
              </h1>
              {currentSem && (
                <span style={{ padding:"4px 12px", borderRadius:"999px", fontSize:"12px",
                               fontWeight:"700", background:"rgba(255,255,255,0.15)",
                               color:"white", border:"1px solid rgba(255,255,255,0.25)" }}>
                  {SEMESTER_LABELS[currentSem]} · Active
                </span>
              )}
            </div>
            <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.65)", margin:0 }}>
              {isTeacher
                ? `Managing ${currentSubjects.length} subjects for ${SEMESTER_LABELS[currentSem] || "current semester"}`
                : `${currentSubjects.length} subjects for your current semester`}
            </p>
          </div>

          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", position:"relative" }}>
            {nextSem && (
              <div style={{ padding:"8px 14px", borderRadius:"12px",
                            background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)" }}>
                <p style={{ fontSize:"10px", color:"rgba(255,255,255,0.5)",
                            fontWeight:"600", margin:"0 0 1px", textTransform:"uppercase" }}>
                  Next Semester
                </p>
                <p style={{ fontSize:"12px", color:"white", fontWeight:"700", margin:0 }}>
                  {SEMESTER_LABELS[nextSem]} starts soon
                </p>
              </div>
            )}
            {isTeacher && (
              <button onClick={() => navigate("/manage-subjects")} style={{
                padding:"9px 18px", borderRadius:"12px", border:"none",
                background:"white", color:"#4f46e5", fontSize:"13px", fontWeight:"700",
                cursor:"pointer", fontFamily:"Sora,sans-serif",
                boxShadow:"0 4px 12px rgba(0,0,0,0.15)",
              }}>
                ⚙️ Manage Subjects
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fallback notice */}
      {useFallback && (
        <div style={{ padding:"11px 16px", borderRadius:"12px", background:"#fffbeb",
                      border:"1px solid #fde68a", fontSize:"12px", color:"#92400e",
                      display:"flex", alignItems:"center", gap:"8px" }}>
          <span>💡</span>
          <span>
            {isTeacher
              ? <>Showing default subjects. <button onClick={() => navigate("/manage-subjects")}
                  style={{ background:"none", border:"none", cursor:"pointer",
                           color:"#d97706", fontWeight:"700", textDecoration:"underline", padding:0 }}>
                  Create your own subjects
                </button> for your students.</>
              : "Your teacher hasn't set up custom subjects yet. Showing default subjects."}
          </span>
        </div>
      )}

      {/* Search */}
      <div style={{ position:"relative", maxWidth:"400px" }}>
        <svg style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)",
                      color:"#94a3b8" }} width="15" height="15" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search subjects, codes, or topics..."
          style={{ width:"100%", padding:"9px 14px 9px 34px", borderRadius:"12px",
                   border:"1.5px solid #e2e8f0", background:"white", fontSize:"13px",
                   outline:"none", fontFamily:"DM Sans,sans-serif", boxSizing:"border-box" }}
          onFocus={e => e.target.style.borderColor="#6366f1"}
          onBlur={e => e.target.style.borderColor="#e2e8f0"}
        />
      </div>

      {/* Subjects grid */}
      {filtered.length === 0 ? (
        <div style={{ background:"white", borderRadius:"20px", border:"1px solid #e2e8f0",
                      padding:"60px 24px", textAlign:"center" }}>
          <div style={{ fontSize:"40px", marginBottom:"10px" }}>🔍</div>
          <p style={{ color:"#94a3b8", fontSize:"14px" }}>No subjects found</p>
        </div>
      ) : (
        <div style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fill, minmax(290px, 1fr))",
                       gap:"16px" }}>
          {filtered.map((s) => (
            <div key={s.id || s.code} style={{
              background:"white", borderRadius:"18px",
              border:`1px solid ${s.color}22`, overflow:"hidden",
              transition:"all 0.2s", cursor:"default",
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = `0 10px 30px ${s.color}25`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Colour top strip */}
              <div style={{ height:"5px", background:s.color }} />

              <div style={{ padding:"20px" }}>
                {/* Icon + name row */}
                <div style={{ display:"flex", alignItems:"flex-start", gap:"12px", marginBottom:"12px" }}>
                  <div style={{
                    width:"50px", height:"50px", borderRadius:"14px",
                    background:`${s.color}15`, display:"flex",
                    alignItems:"center", justifyContent:"center",
                    fontSize:"24px", flexShrink:0,
                  }}>
                    {s.icon || "📚"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center",
                                  gap:"6px", marginBottom:"3px", flexWrap:"wrap" }}>
                      <span style={{ fontFamily:"Sora,sans-serif", fontWeight:"700",
                                     fontSize:"14px", color:"#111827" }}>
                        {s.name}
                      </span>
                      <span style={{ fontSize:"10px", padding:"2px 7px", borderRadius:"6px",
                                     background:`${s.color}15`, color:s.color, fontWeight:"700" }}>
                        {s.code}
                      </span>
                    </div>
                    <p style={{ fontSize:"12px", color:"#64748b", margin:0, lineHeight:"1.45",
                                display:"-webkit-box", WebkitLineClamp:2,
                                WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                      {s.description}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                {s.tags?.length > 0 && (
                  <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", marginBottom:"14px" }}>
                    {s.tags.slice(0,4).map(t => (
                      <span key={t} style={{ fontSize:"10px", padding:"2px 8px",
                                             borderRadius:"999px", background:"#f1f5f9",
                                             color:"#64748b", fontWeight:"500" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display:"grid",
                               gridTemplateColumns: isTeacher ? "1fr 1fr" : "1fr 1fr 1fr",
                               gap:"7px" }}>
                  {!isTeacher && (
                    <button onClick={() => goToTutor(s)} style={{
                      padding:"8px 4px", borderRadius:"10px",
                      border:`1.5px solid ${s.color}33`,
                      background:`${s.color}0d`, color:s.color,
                      fontSize:"12px", fontWeight:"700", cursor:"pointer",
                    }}>
                      🤖 Tutor
                    </button>
                  )}
                  <button onClick={() => goToMaterials(s)} style={{
                    padding:"8px 4px", borderRadius:"10px",
                    border:"1.5px solid #e2e8f0", background:"#f8faff",
                    color:"#374151", fontSize:"12px", fontWeight:"700", cursor:"pointer",
                  }}>
                    📚 Materials
                  </button>
                  <button onClick={() => goToQuiz(s)} style={{
                    padding:"8px 4px", borderRadius:"10px", border:"none",
                    background:s.color, color:"white",
                    fontSize:"12px", fontWeight:"700", cursor:"pointer",
                    boxShadow:`0 2px 8px ${s.color}40`,
                  }}>
                    📝 Quiz
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Semester info footer */}
      {currentSem && (
        <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"14px 18px",
                      borderRadius:"14px", background:"#f8faff", border:"1px solid #e2e8f0" }}>
          <div style={{ width:"36px", height:"36px", borderRadius:"10px",
                        background:"linear-gradient(135deg,#4f46e5,#7c3aed)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        color:"white", fontWeight:"800", fontSize:"14px",
                        fontFamily:"Sora,sans-serif", flexShrink:0 }}>
            {currentSem}
          </div>
          <div>
            <p style={{ fontFamily:"Sora,sans-serif", fontWeight:"700", fontSize:"13px",
                        color:"#0f172a", margin:"0 0 2px" }}>
              Currently in {SEMESTER_LABELS[currentSem]} — {currentSubjects.length} active subjects
            </p>
            <p style={{ fontSize:"12px", color:"#94a3b8", margin:0 }}>
              {nextSem
                ? `${SEMESTER_LABELS[nextSem]} subjects will be available next semester`
                : "Contact your teacher to add more subjects"}
            </p>
          </div>
          {isTeacher && (
            <button onClick={() => navigate("/manage-subjects")}
              style={{ marginLeft:"auto", padding:"7px 14px", borderRadius:"10px",
                       border:"1.5px solid #6366f1", background:"white", color:"#6366f1",
                       fontSize:"12px", fontWeight:"700", cursor:"pointer", flexShrink:0 }}>
              Change Semester →
            </button>
          )}
        </div>
      )}
    </div>
  );
}