// src/pages/Profile/ProfilePage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { analyticsService } from "../../api/services";

// ── Role-specific avatars ─────────────────────────────────────────────────────
function StudentAvatarLarge({ initials }) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
        <defs>
          <linearGradient id="stuGrad" x1="0" y1="0" x2="88" y2="88" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <rect width="88" height="88" rx="22" fill="url(#stuGrad)" />
        {/* Graduation cap */}
        <path d="M44 24l20 10-20 10-20-10 20-10z" fill="white" opacity="0.95" />
        <path d="M30 36v12" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
        {/* Person body */}
        <circle cx="44" cy="52" r="7" fill="white" opacity="0.9" />
        <path d="M28 72c0-8.837 7.163-12 16-12s16 3.163 16 12"
              stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        {/* Tassel */}
        <path d="M64 24v8" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
        <circle cx="64" cy="33" r="2" fill="white" opacity="0.7" />
      </svg>
    </div>
  );
}

function TeacherAvatarLarge({ initials }) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
        <defs>
          <linearGradient id="teachGrad" x1="0" y1="0" x2="88" y2="88" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#065f46" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
        </defs>
        <rect width="88" height="88" rx="22" fill="url(#teachGrad)" />
        {/* Person */}
        <circle cx="44" cy="34" r="12" fill="white" opacity="0.95" />
        <path d="M22 76c0-12.15 9.85-18 22-18s22 5.85 22 18"
              stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        {/* Tie / badge */}
        <path d="M44 46l-3 8h6l-3-8z" fill="white" opacity="0.9" />
        <rect x="42" y="46" width="4" height="3" rx="1" fill="white" opacity="0.9" />
        {/* Whiteboard icon top-right */}
        <rect x="60" y="18" width="18" height="14" rx="3" fill="white" opacity="0.2"
              stroke="white" strokeWidth="1.5" />
        <path d="M64 24h10M64 28h6" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      </svg>
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);

  const isTeacher = user?.role === "teacher";

  const displayName = user?.name
    ? user.name.charAt(0).toUpperCase() + user.name.slice(1)
    : user?.email
    ? user.email.split("@")[0].charAt(0).toUpperCase() + user.email.split("@")[0].slice(1)
    : "User";

  const displayEmail = user?.email || "—";

  const initials = displayName
    .split(" ").filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join("") || "U";

  useEffect(() => {
    if (!isTeacher && user?.user_id) {
      analyticsService.summary(user.user_id)
        .then(r => setSummary(r.data))
        .catch(() => {});
    }
  }, [user, isTeacher]);

  const handleLogout = () => { logout(); navigate("/login"); };

  const stats = isTeacher ? [] : [
    { label: "Quizzes Taken", value: summary?.total_attempts ?? "—"                            },
    { label: "Avg Score",     value: summary ? `${summary.avg_percentage?.toFixed(1)}%` : "—"},
    { label: "Best Score",    value: summary ? `${summary.best_percentage?.toFixed(1)}%` : "—"},
    { label: "AI Sessions",   value: summary?.chat_sessions ?? "—"},
  ];

  return (
    <div style={{ maxWidth: "680px" }} className="space-y-5">
      <h1 className="font-display font-bold text-2xl text-gray-900">My Profile</h1>

      {/* ── Avatar hero card ── */}
      <div style={{
        borderRadius: "20px", overflow: "hidden",
        background: isTeacher
          ? "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #0891b2 100%)"
          : "linear-gradient(135deg, #1e1b4b 0%, #4f46e5 50%, #7c3aed 100%)",
        padding: "32px 28px",
        display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap",
        position: "relative", boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
      }}>
        {/* Decorative circles */}
        <div style={{ position:"absolute", top:"-20px", right:"60px", width:"100px", height:"100px",
                      borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />
        <div style={{ position:"absolute", bottom:"-30px", right:"-10px", width:"130px", height:"130px",
                      borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />

        {/* Avatar */}
        {isTeacher
          ? <TeacherAvatarLarge initials={initials} />
          : <StudentAvatarLarge initials={initials} />
        }

        {/* Info */}
        <div style={{ position: "relative" }}>
          <h2 style={{ fontFamily:"Sora,sans-serif", fontWeight:"800", fontSize:"24px",
                       color:"white", margin:"0 0 4px" }}>
            {displayName}
          </h2>
          <p style={{ fontSize:"14px", color:"rgba(255,255,255,0.7)", margin:"0 0 10px" }}>
            {displayEmail}
          </p>
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
            <span style={{
              padding:"4px 12px", borderRadius:"999px", fontSize:"12px", fontWeight:"700",
              background:"rgba(255,255,255,0.15)", color:"white",
              border:"1px solid rgba(255,255,255,0.25)",
            }}>
              {isTeacher ? "👨‍🏫 Teacher" : "🎓 Student"}
            </span>
            <span style={{
              padding:"4px 12px", borderRadius:"999px", fontSize:"12px", fontWeight:"600",
              background:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.8)",
              border:"1px solid rgba(255,255,255,0.15)",
            }}>
              🟢 Active Session
            </span>
          </div>
        </div>
      </div>

      {/* ── Stats (student only) ── */}
      {!isTeacher && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon }) => (
            <div key={label} style={{
              background:"white", borderRadius:"16px", padding:"16px",
              border:"1px solid #e2e8f0", textAlign:"center",
              boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
            }}>
              <div style={{ fontSize:"22px", marginBottom:"6px" }}>{icon}</div>
              <p style={{ fontSize:"11px", color:"#9ca3af", textTransform:"uppercase",
                          letterSpacing:"0.08em", margin:"0 0 4px", fontWeight:"600" }}>
                {label}
              </p>
              <p style={{ fontSize:"20px", fontWeight:"800", color:"#4f46e5", margin:0,
                          fontFamily:"Sora,sans-serif" }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Account Information ── */}
      <div style={{ background:"white", borderRadius:"20px", border:"1px solid #e2e8f0",
                    overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9",
                      display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ width:"36px", height:"36px", borderRadius:"10px",
                        background: isTeacher ? "#f0fdf4" : "#eef2ff",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:"18px" }}>
            {isTeacher ? "👨‍🏫" : "🎓"}
          </div>
          <h3 style={{ fontFamily:"Sora,sans-serif", fontWeight:"700", fontSize:"15px",
                       color:"#0f172a", margin:0 }}>
            Account Information
          </h3>
        </div>

        <div style={{ padding:"8px 0" }}>
          {[
            { label:"Name",     value: displayName,  emoji:"👤" },
            { label:"Email",    value: displayEmail,  emoji:"📧" },
            { label:"Role",     value: isTeacher ? "Teacher" : "Student", emoji: isTeacher ? "👨‍🏫" : "🎓" },
            { label:"User ID",  value: `${user?.user_id?.slice(0,16)}…`, emoji:"🔑" },
            { label:"Session",  value: "Active",     emoji:"🟢" },
          ].map(({ label, value, emoji }, i, arr) => (
            <div key={label} style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"13px 20px",
              borderBottom: i < arr.length - 1 ? "1px solid #f8fafc" : "none",
              transition:"background 0.1s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8faff"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                <span style={{ fontSize:"18px" }}>{emoji}</span>
                <span style={{ fontSize:"13px", fontWeight:"600", color:"#64748b" }}>{label}</span>
              </div>
              <span style={{ fontSize:"13px", fontWeight:"700", color:"#0f172a",
                             maxWidth:"220px", textAlign:"right", wordBreak:"break-all" }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>


      {/* ── Sign Out ── */}
      <div style={{ background:"#fff5f5", borderRadius:"20px",
                    border:"1px solid #fecaca", padding:"20px 24px" }}>
        <h3 style={{ fontFamily:"Sora,sans-serif", fontWeight:"700", fontSize:"15px",
                     color:"#0f172a", margin:"0 0 4px" }}>
          Sign Out
        </h3>
       
        <button onClick={handleLogout} style={{
          display:"inline-flex", alignItems:"center", gap:"8px",
          padding:"10px 20px", borderRadius:"12px",
          border:"1.5px solid #fca5a5", background:"white",
          color:"#ef4444", fontSize:"13px", fontWeight:"700",
          cursor:"pointer", transition:"all 0.15s",
          fontFamily:"DM Sans,sans-serif",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "white"; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Sign Out of EduAI
        </button>
      </div>
    </div>
  );
}