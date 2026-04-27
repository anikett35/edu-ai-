// src/components/layout/Navbar.jsx
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

// ── EduAI Logo SVG ────────────────────────────────────────────────────────────
function EduAILogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#4f46e5" />
      <path d="M10 12h10a8 8 0 018 8v16a4 4 0 01-4-4V20a4 4 0 00-4-4H10V12z" fill="white" />
      <path d="M38 12H28a8 8 0 00-8 8v16a4 4 0 004-4V20a4 4 0 014-4h10V12z" fill="rgba(255,255,255,0.6)" />
      <circle cx="20" cy="34" r="3" fill="white" />
      <circle cx="28" cy="34" r="3" fill="rgba(255,255,255,0.6)" />
    </svg>
  );
}

// ── Student Avatar ────────────────────────────────────────────────────────────
function StudentAvatar({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#eef2ff" />
      <circle cx="20" cy="15" r="6" fill="#6366f1" />
      <path d="M8 36c0-6.627 5.373-10 12-10s12 3.373 12 10" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14 13l6-3 6 3-6 3-6-3z" fill="white" opacity="0.9" />
    </svg>
  );
}

// ── Teacher Avatar ────────────────────────────────────────────────────────────
function TeacherAvatar({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#f0fdf4" />
      <circle cx="20" cy="14" r="6" fill="#16a34a" />
      <path d="M8 36c0-6.627 5.373-10 12-10s12 3.373 12 10" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="18" y="20" width="4" height="5" rx="1" fill="white" opacity="0.9" />
      <path d="M16 23h8" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

export default function Navbar() {
  const { user } = useAuth();
  const [hasNotif] = useState(true);
  const isTeacher = user?.role === "teacher";

  const displayName = user?.name
    ? user.name.split(" ")[0]
    : user?.email
    ? user.email.split("@")[0]
    : isTeacher ? "Teacher" : "Student";

  const roleLabel = isTeacher ? "Teacher" : "Student";

  return (
    <header style={{
      height: "56px",
      background: "white",
      borderBottom: "1px solid #f1f5f9",
      display: "flex",
      alignItems: "center",
      padding: "0 24px",
      gap: "16px",
      position: "sticky",
      top: 0,
      zIndex: 20,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>

      {/* Search */}
      <div style={{ flex: 1, maxWidth: "440px" }}>
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
               width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search resources, topics, or AI chat..."
            style={{
              width: "100%", padding: "8px 14px 8px 36px",
              borderRadius: "12px", border: "1.5px solid #e2e8f0",
              background: "#f8faff", fontSize: "13px", outline: "none",
              fontFamily: "DM Sans, sans-serif", color: "#374151",
              boxSizing: "border-box", transition: "all 0.15s",
            }}
            onFocus={e => e.target.style.borderColor = "#6366f1"}
            onBlur={e => e.target.style.borderColor = "#e2e8f0"}
          />
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "auto" }}>

        {/* Notification bell */}
        <button style={{
          width: "36px", height: "36px", borderRadius: "10px",
          border: "1.5px solid #e2e8f0", background: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", position: "relative", transition: "all 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "#f8faff"}
          onMouseLeave={e => e.currentTarget.style.background = "white"}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          {hasNotif && (
            <span style={{
              position: "absolute", top: "6px", right: "6px",
              width: "8px", height: "8px", borderRadius: "50%",
              background: "#ef4444", border: "2px solid white",
            }} />
          )}
        </button>

        {/* Divider */}
        <div style={{ width: "1px", height: "28px", background: "#e2e8f0" }} />

        {/* User chip — role-based avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isTeacher ? <TeacherAvatar size={36} /> : <StudentAvatar size={36} />}
          <div>
            <p style={{
              fontSize: "13px", fontWeight: "700", color: "#0f172a",
              margin: 0, lineHeight: 1, fontFamily: "Sora, sans-serif",
              textTransform: "capitalize",
            }}>
              {displayName}
            </p>
            <p style={{
              fontSize: "11px", color: "#94a3b8", margin: "3px 0 0",
              fontWeight: "500",
            }}>
              {roleLabel}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}