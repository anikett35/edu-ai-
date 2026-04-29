// src/pages/Intervention/InterventionPage.jsx
// Unified intervention page:
//   - Students see their own risk score + recommendations
//   - Teachers see full dashboard of at-risk students
import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { interventionService } from "../../api/services";
import { PageLoader } from "../../components/common/LoadingSpinner";

// ── WF Tier config ────────────────────────────────────────────────────────────
const TIERS = {
  WF1: { label:"LOW",      color:"#16a34a", bg:"#dcfce7", border:"#bbf7d0",  ring:"rgba(22,163,74,0.15)"  },
  WF2: { label:"MEDIUM",   color:"#d97706", bg:"#fef9c3", border:"#fde68a",  ring:"rgba(217,119,6,0.15)"  },
  WF3: { label:"HIGH",     color:"#ea580c", bg:"#fff7ed", border:"#fed7aa", ring:"rgba(234,88,12,0.15)"  },
  WF4: { label:"CRITICAL", color:"#dc2626", bg:"#fef2f2", border:"#fecaca",  ring:"rgba(220,38,38,0.2)"   },
};

// ── Risk score gauge ──────────────────────────────────────────────────────────
function RiskGauge({ score, tier }) {
  const t = TIERS[tier] || TIERS.WF1;
  const circumference = 2 * Math.PI * 40;
  const strokeDash    = ((100 - score) / 100) * circumference;

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"8px" }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        {/* Track */}
        <circle cx="55" cy="55" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10"/>
        {/* Progress */}
        <circle cx="55" cy="55" r="40" fill="none"
          stroke={t.color} strokeWidth="10"
          strokeDasharray={`${circumference - strokeDash} ${strokeDash}`}
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
          style={{ transition:"stroke-dasharray 0.6s ease" }}
        />
        {/* Center */}
        <text x="55" y="49" textAnchor="middle"
              style={{ fontSize:"20px", fontWeight:"800", fill:t.color,
                       fontFamily:"Sora,sans-serif" }}>
          {score}
        </text>
        <text x="55" y="65" textAnchor="middle"
              style={{ fontSize:"9px", fill:"#94a3b8", fontWeight:"600" }}>
          RISK SCORE
        </text>
      </svg>
      <div style={{
        padding:"4px 14px", borderRadius:"999px",
        background:t.bg, border:`1px solid ${t.border}`,
        color:t.color, fontWeight:"800", fontSize:"13px",
        letterSpacing:"0.04em", fontFamily:"Sora,sans-serif",
      }}>
        {t.icon} {tier} — {t.label}
      </div>
    </div>
  );
}

// ── Recommendation card ───────────────────────────────────────────────────────
function RecommendationCard({ tier, recommendations }) {
  const t = TIERS[tier] || TIERS.WF1;
  return (
    <div style={{
      borderRadius:"16px", padding:"18px 20px",
      background:t.bg, border:`1px solid ${t.border}`,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px" }}>
        <span style={{ fontSize:"20px" }}>{t.icon}</span>
        <h3 style={{ fontFamily:"Sora,sans-serif", fontWeight:"700", fontSize:"14px",
                     color:t.color, margin:0 }}>
          {tier === "WF1" ? "You're on track!" :
           tier === "WF2" ? "Action recommended" :
           tier === "WF3" ? "Faculty review required" :
                            "Urgent intervention required"}
        </h3>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:"7px" }}>
        {recommendations.map((r, i) => (
          <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"8px" }}>
            <span style={{ color:t.color, fontWeight:"700", flexShrink:0, fontSize:"13px" }}>
              {i+1}.
            </span>
            <p style={{ fontSize:"13px", color:t.color, margin:0, lineHeight:"1.45",
                        opacity:0.9 }}>
              {r}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Risk breakdown bar ────────────────────────────────────────────────────────
function ComponentBar({ label, value, max, color }) {
  return (
    <div style={{ marginBottom:"10px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
        <span style={{ fontSize:"12px", color:"#64748b", fontWeight:"500" }}>{label}</span>
        <span style={{ fontSize:"12px", fontWeight:"700", color }}>+{value} pts</span>
      </div>
      <div style={{ height:"6px", borderRadius:"999px", background:"#f1f5f9", overflow:"hidden" }}>
        <div style={{
          height:"100%", borderRadius:"999px", background:color,
          width:`${Math.min(100, (value / max) * 100)}%`,
          transition:"width 0.5s ease",
        }} />
      </div>
    </div>
  );
}

// ── Student view ──────────────────────────────────────────────────────────────
function StudentRiskView() {
  const { user }    = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    interventionService.getRisk(user.user_id)
      .then(r => setData(r.data))
      .catch(() => setError("Could not load risk assessment"))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <PageLoader />;
  if (error)   return <div style={{ color:"#dc2626", padding:"20px" }}>{error}</div>;
  if (!data)   return null;

  // Guard: stats may be missing if student has no quiz attempts yet
  const stats = data.stats || {
    avg_percentage:    0,
    best_percentage:   0,
    quizzes_completed: 0,
    chat_sessions:     0,
  };
  const components = data.components || {
    base_risk: 0, inactivity_penalty: 0, no_tutor_penalty: 0, improvement_bonus: 0,
  };
  const t = TIERS[data.tier] || TIERS.WF1;

  return (
    <div className="space-y-5" style={{ maxWidth:"720px" }}>
      {/* Header banner */}
      <div style={{
        borderRadius:"20px", padding:"24px 28px",
        background:`linear-gradient(135deg, ${t.color}dd, ${t.color}99)`,
        display:"flex", alignItems:"center", gap:"24px",
        flexWrap:"wrap", boxShadow:`0 8px 32px ${t.ring}`,
      }}>
        <RiskGauge score={data.risk_score} tier={data.tier} />
        <div style={{ flex:1 }}>
          <h1 style={{ fontFamily:"Sora,sans-serif", fontWeight:"800", fontSize:"20px",
                       color:"white", margin:"0 0 6px" }}>
            Academic Risk Assessment
          </h1>
          <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.85)", margin:"0 0 10px",
                      lineHeight:"1.5" }}>
            {data.action}
          </p>
          {data.human_required === true && (
            <div style={{ display:"inline-flex", alignItems:"center", gap:"6px",
                          padding:"5px 12px", borderRadius:"10px",
                          background:"rgba(255,255,255,0.2)",
                          border:"1px solid rgba(255,255,255,0.3)" }}>
              <span style={{ fontSize:"14px" }}>👤</span>
              <span style={{ fontSize:"12px", color:"white", fontWeight:"700" }}>
                Human intervention required
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"10px" }}>
        {[
          { label:"Avg Quiz Score",     value:`${stats.avg_percentage}%`,   color:"#6366f1" },
          { label:"Best Score",         value:`${stats.best_percentage}%`, color:"#16a34a" },
          { label:"Quizzes Completed",  value:stats.quizzes_completed,     color:"#0891b2" },
          { label:"AI Tutor Sessions",  value:stats.chat_sessions,         color:"#7c3aed" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ background:"white", borderRadius:"14px",
                                    border:"1px solid #e2e8f0", padding:"14px 16px",
                                    display:"flex", alignItems:"center", gap:"12px" }}>
            <div style={{ width:"38px", height:"38px", borderRadius:"10px",
                          background:`${color}15`, display:"flex",
                          alignItems:"center", justifyContent:"center", fontSize:"18px", flexShrink:0 }}>
              {icon}
            </div>
            <div>
              <p style={{ fontSize:"11px", color:"#94a3b8", margin:"0 0 2px",
                          textTransform:"uppercase", fontWeight:"600" }}>{label}</p>
              <p style={{ fontSize:"18px", fontWeight:"800", color, margin:0,
                          fontFamily:"Sora,sans-serif" }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Risk breakdown */}
      <div style={{ background:"white", borderRadius:"16px", border:"1px solid #e2e8f0", padding:"18px 20px" }}>
        <h3 style={{ fontFamily:"Sora,sans-serif", fontWeight:"700", fontSize:"14px",
                     color:"#0f172a", margin:"0 0 14px" }}>
          Risk Score Breakdown
        </h3>
        <ComponentBar label="Base risk (100 − avg score)"  value={components.base_risk}          max={100} color="#6366f1"/>
        <ComponentBar label="Inactivity penalty"           value={components.inactivity_penalty} max={30}  color="#f59e0b"/>
        <ComponentBar label="Low tutor usage penalty"      value={components.no_tutor_penalty}   max={10}  color="#0891b2"/>
        {components.improvement_bonus > 0 && (
          <div style={{ padding:"8px 12px", borderRadius:"9px", background:"#f0fdf4",
                        border:"1px solid #bbf7d0", fontSize:"12px", color:"#15803d",
                        fontWeight:"600", marginTop:"6px" }}>
            ✅ Improvement bonus: −{components.improvement_bonus} pts (you're improving!)
          </div>
        )}
      </div>

      {/* Weak subjects */}
      {(data.weak_subjects || []).length > 0 && (
        <div style={{ background:"white", borderRadius:"16px", border:"1px solid #fecaca", padding:"18px 20px" }}>
          <h3 style={{ fontFamily:"Sora,sans-serif", fontWeight:"700", fontSize:"14px",
                       color:"#dc2626", margin:"0 0 12px" }}>
            🔴 Subjects Needing Attention (avg &lt; 60%)
          </h3>
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {(data.weak_subjects || []).map(s => (
              <div key={s.subject} style={{ display:"flex", alignItems:"center", gap:"10px",
                                            padding:"9px 12px", borderRadius:"10px",
                                            background:"#fef2f2", border:"1px solid #fecaca" }}>
                <span style={{ fontSize:"13px", fontWeight:"600", color:"#dc2626", flex:1,
                               textTransform:"capitalize" }}>
                  {s.subject.replace(/_/g," ")}
                </span>
                <span style={{ fontSize:"12px", color:"#dc2626", fontWeight:"700" }}>
                  {s.avg}% avg
                </span>
                <span style={{ fontSize:"11px", color:"#94a3b8" }}>
                  {s.attempts} attempts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {(data.recommendations || []).length > 0 && (
        <RecommendationCard tier={data.tier} recommendations={data.recommendations || []} />
      )}
    </div>
  );
}

// ── Teacher dashboard view ────────────────────────────────────────────────────
function TeacherDashboardView() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [filter,     setFilter]     = useState("WF2");
  const [acking,     setAcking]     = useState({});
  const [expanded,   setExpanded]   = useState(null);

  const load = async (tier) => {
    setLoading(true);
    try {
      const res = await interventionService.getDashboard(tier);
      setData(res.data);
    } catch { setError("Failed to load dashboard"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(filter); }, [filter]);

  const handleAcknowledge = async (studentId) => {
    setAcking(p => ({ ...p, [studentId]: true }));
    try {
      await interventionService.acknowledge(studentId, "Reviewed by teacher");
      await load(filter);
    } catch {}
    finally { setAcking(p => ({ ...p, [studentId]: false })); }
  };

  if (loading) return <PageLoader />;
  if (error)   return <div style={{ color:"#dc2626", padding:"20px" }}>{error}</div>;

  const summary = data?.summary || {};

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
            Intervention Dashboard
          </h1>
          <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.6)", margin:0 }}>
            Academic risk monitoring · WF1–WF4 workflow system
          </p>
        </div>
        <div style={{ display:"flex", gap:"8px" }}>
          {[
            { key:"WF4", label:"Critical", n:summary.WF4 || 0, color:"#dc2626", bg:"#fef2f2" },
            { key:"WF3", label:"High",     n:summary.WF3 || 0, color:"#ea580c", bg:"#fff7ed" },
            { key:"WF2", label:"Medium",   n:summary.WF2 || 0, color:"#d97706", bg:"#fef9c3" },
          ].map(({ key, label, n, color, bg }) => (
            <div key={key} style={{ textAlign:"center", padding:"8px 14px",
                                    borderRadius:"12px", background:bg,
                                    border:`1px solid ${color}33` }}>
              <p style={{ fontSize:"20px", fontWeight:"800", color, margin:0,
                          fontFamily:"Sora,sans-serif" }}>{n}</p>
              <p style={{ fontSize:"10px", color, margin:"1px 0 0", fontWeight:"600",
                          textTransform:"uppercase" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:"6px" }}>
        {["WF2","WF3","WF4"].map(tier => {
          const t = TIERS[tier];
          return (
            <button key={tier} onClick={() => setFilter(tier)} style={{
              padding:"7px 16px", borderRadius:"10px", border:"none",
              background: filter === tier ? t.color : "#f1f5f9",
              color:      filter === tier ? "white"  : "#64748b",
              fontWeight:"700", fontSize:"12px", cursor:"pointer",
              transition:"all 0.15s",
            }}>
              {t.icon} {tier} — {t.label} and above
            </button>
          );
        })}
      </div>

      {/* Student cards */}
      {!data?.students?.length ? (
        <div style={{ background:"white", borderRadius:"20px", border:"1px solid #e2e8f0",
                      padding:"60px 24px", textAlign:"center" }}>
          <div style={{ fontSize:"40px", marginBottom:"10px" }}>✅</div>
          <p style={{ color:"#94a3b8", fontSize:"14px" }}>
            No students at {filter} or above risk level
          </p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {data.students.map(s => {
            const t = TIERS[s.tier] || TIERS.WF1;
            const isExpanded = expanded === s.student_id;
            return (
              <div key={s.student_id} style={{
                background:"white", borderRadius:"16px",
                border:`1px solid ${t.border}`,
                overflow:"hidden", transition:"box-shadow 0.15s",
              }}>
                {/* Top strip */}
                <div style={{ height:"3px", background:t.color }} />
                <div style={{ padding:"16px 20px" }}>
                  <div style={{ display:"flex", alignItems:"center",
                                justifyContent:"space-between", gap:"12px", flexWrap:"wrap" }}>
                    {/* Left */}
                    <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
                      <div style={{
                        width:"44px", height:"44px", borderRadius:"12px",
                        background:`${t.color}15`, display:"flex",
                        alignItems:"center", justifyContent:"center",
                        fontSize:"20px", flexShrink:0,
                      }}>
                        {t.icon}
                      </div>
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                          <p style={{ fontFamily:"Sora,sans-serif", fontWeight:"700",
                                      fontSize:"14px", color:"#0f172a", margin:0 }}>
                            {s.student_name}
                          </p>
                          <span style={{ padding:"2px 8px", borderRadius:"999px",
                                         background:t.bg, color:t.color,
                                         fontSize:"10px", fontWeight:"800" }}>
                            {s.tier} · {t.label}
                          </span>
                          {s.human_required && (
                            <span style={{ padding:"2px 8px", borderRadius:"999px",
                                           background:"#fef2f2", color:"#dc2626",
                                           fontSize:"10px", fontWeight:"700" }}>
                              👤 Human required
                            </span>
                          )}
                        </div>
                        <div style={{ display:"flex", gap:"12px", marginTop:"4px" }}>
                          {[
                            { label:"Avg", value:`${s.avg_percentage}%`  },
                            { label:"Quizzes", value:s.quizzes_done      },
                            { label:"AI sessions", value:s.chat_sessions },
                          ].map(({ label, value }) => (
                            <span key={label} style={{ fontSize:"11px", color:"#94a3b8" }}>
                              <strong style={{ color:"#374151" }}>{value}</strong> {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Risk gauge mini */}
                    <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                      <div style={{
                        width:"48px", height:"48px", borderRadius:"50%",
                        background:`conic-gradient(${t.color} ${s.risk_score * 3.6}deg, #f1f5f9 0deg)`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        position:"relative",
                      }}>
                        <div style={{
                          width:"36px", height:"36px", borderRadius:"50%",
                          background:"white", display:"flex", alignItems:"center",
                          justifyContent:"center",
                        }}>
                          <span style={{ fontSize:"12px", fontWeight:"800", color:t.color,
                                         fontFamily:"Sora,sans-serif" }}>
                            {s.risk_score}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:"flex", gap:"6px" }}>
                      <button onClick={() => setExpanded(isExpanded ? null : s.student_id)}
                        style={{ padding:"7px 14px", borderRadius:"9px",
                                 border:"1.5px solid #e2e8f0", background:"white",
                                 fontSize:"12px", fontWeight:"600", color:"#374151",
                                 cursor:"pointer" }}>
                        {isExpanded ? "▲ Less" : "▼ More"}
                      </button>
                      {s.human_required && (
                        <button
                          onClick={() => handleAcknowledge(s.student_id)}
                          disabled={acking[s.student_id]}
                          style={{ padding:"7px 14px", borderRadius:"9px",
                                   border:"none", cursor:"pointer",
                                   background: acking[s.student_id] ? "#c7d2fe" : t.color,
                                   color:"white", fontSize:"12px", fontWeight:"700" }}>
                          {acking[s.student_id] ? "…" : "✓ Acknowledge"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ marginTop:"14px", paddingTop:"14px",
                                  borderTop:"1px solid #f1f5f9" }}>
                      <p style={{ fontSize:"12px", fontWeight:"700", color:t.color,
                                  margin:"0 0 6px" }}>
                        Required Action:
                      </p>
                      <p style={{ fontSize:"13px", color:"#374151", margin:0,
                                  lineHeight:"1.5" }}>
                        {s.human_required
                          ? s.tier === "WF4"
                            ? "⚡ URGENT: Assign personal counselor. Schedule immediate meeting. Prepare support plan."
                            : "🔶 HIGH: Send faculty alert. Generate subject weakness report. Schedule mentoring review."
                          : "📧 AUTO: Study reminders and quiz recommendations have been auto-dispatched."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function InterventionPage() {
  const { user } = useAuth();
  return user?.role === "teacher" ? <TeacherDashboardView /> : <StudentRiskView />;
}