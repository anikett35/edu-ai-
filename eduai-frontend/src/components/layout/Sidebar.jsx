// src/components/layout/Sidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// ── EduAI Logo ────────────────────────────────────────────────────────────────
function EduAILogo() {
  return (
    <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#4f46e5" />
      <path d="M10 12h10a8 8 0 018 8v16a4 4 0 01-4-4V20a4 4 0 00-4-4H10V12z" fill="white" />
      <path d="M38 12H28a8 8 0 00-8 8v16a4 4 0 004-4V20a4 4 0 014-4h10V12z" fill="rgba(255,255,255,0.6)" />
      <circle cx="20" cy="34" r="3" fill="white" />
      <circle cx="28" cy="34" r="3" fill="rgba(255,255,255,0.6)" />
    </svg>
  );
}

// ── Icon ──────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  dashboard:  "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  subjects:   "M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z",
  tutor:      "M12 2a9 9 0 110 18A9 9 0 0112 2zm0 4v4l3 3",
  materials:  "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l2 2h5a2 2 0 012 2v14a2 2 0 01-2 2z",
  manage:     "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
  quiz:       "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 M9 5a2 2 0 012-2h2a2 2 0 012 2 M12 12h.01 M12 16h.01",
  analytics:  "M18 20V10 M12 20V4 M6 20v-6",
  upload:     "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  profile:    "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z",
  settings:   "M12 15a3 3 0 100-6 3 3 0 000 6z M19 12a7 7 0 11-14 0 7 7 0 0114 0z",
  help:       "M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3 M12 17h.01",
  logout:     "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
};

const studentLinks = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/subjects",  label: "Subjects",  icon: "subjects"  },
  { to: "/tutor",     label: "AI Tutor",  icon: "tutor"     },
  { to: "/materials", label: "Materials", icon: "materials" },
  { to: "/quiz",      label: "Quiz",      icon: "quiz"      },
  { to: "/analytics", label: "Analytics", icon: "analytics" },
  { to: "/profile",   label: "Profile",   icon: "profile"   },
];

const teacherLinks = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/subjects",        label: "Subjects",    icon: "subjects"  },
  { to: "/manage-subjects", label: "My Subjects", icon: "manage"    },
  { to: "/materials",       label: "Materials",   icon: "materials" },
  { to: "/upload",    label: "Upload",    icon: "upload"    },
  { to: "/quiz",      label: "Quiz",      icon: "quiz"      },
  { to: "/analytics", label: "Analytics", icon: "analytics" },
  { to: "/profile",   label: "Profile",   icon: "profile"   },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links    = user?.role === "teacher" ? teacherLinks : studentLinks;

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <aside style={{
      position: "fixed", inset: "0 auto 0 0", width: "220px",
      background: "white", borderRight: "1px solid #f1f5f9",
      display: "flex", flexDirection: "column", zIndex: 30,
      boxShadow: "1px 0 12px rgba(0,0,0,0.04)",
    }}>
      {/* Logo */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "18px 16px 16px",
        borderBottom: "1px solid #f1f5f9",
      }}>
        <EduAILogo />
        <div>
          <p style={{
            fontFamily: "Sora, sans-serif", fontWeight: "800",
            fontSize: "15px", color: "#0f172a", margin: 0, lineHeight: 1,
          }}>EduAI</p>
          <p style={{
            fontSize: "9px", color: "#94a3b8", letterSpacing: "0.12em",
            textTransform: "uppercase", margin: "3px 0 0", fontWeight: "600",
          }}>CS Learning Portal</p>
        </div>
      </div>

      {/* Role badge */}
      <div style={{ padding: "10px 16px 6px" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "5px",
          padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "700",
          background: user?.role === "teacher" ? "#f0fdf4" : "#eef2ff",
          color:      user?.role === "teacher" ? "#15803d"  : "#4338ca",
          border:     user?.role === "teacher" ? "1px solid #bbf7d0" : "1px solid #c7d2fe",
        }}>
          {user?.role === "teacher" ? "👨‍🏫 Teacher Panel" : "🎓 Student Panel"}
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: "8px 10px", overflowY: "auto" }}>
        {links.map(({ to, label, icon }) => (
          <NavLink key={to} to={to}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: "10px",
              padding: "9px 12px", borderRadius: "10px", marginBottom: "2px",
              fontSize: "13px", fontWeight: isActive ? "700" : "500",
              color:      isActive ? "#4338ca" : "#64748b",
              background: isActive ? "#eef2ff"  : "transparent",
              textDecoration: "none", transition: "all 0.12s",
              borderLeft: isActive ? "3px solid #6366f1" : "3px solid transparent",
            })}
            onMouseEnter={e => { if (!e.currentTarget.style.background.includes("eef2ff")) { e.currentTarget.style.background = "#f8faff"; e.currentTarget.style.color = "#4338ca"; }}}
            onMouseLeave={e => { if (!e.currentTarget.style.background.includes("eef2ff")) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748b"; }}}
          >
            <span style={{ flexShrink: 0, opacity: 0.85 }}>
              <Icon d={icons[icon]} />
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding: "8px 10px 16px", borderTop: "1px solid #f1f5f9" }}>
        {[
          { label: "Settings", icon: "settings", action: () => {} },
          { label: "Help",     icon: "help",     action: () => {} },
        ].map(({ label, icon, action }) => (
          <button key={label} onClick={action} style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "9px 12px", borderRadius: "10px", width: "100%",
            fontSize: "13px", fontWeight: "500", color: "#64748b",
            background: "transparent", border: "none", cursor: "pointer",
            textAlign: "left", transition: "all 0.12s", marginBottom: "2px",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f8faff"; e.currentTarget.style.color = "#4338ca"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748b"; }}
          >
            <Icon d={icons[icon]} /><span>{label}</span>
          </button>
        ))}
        <button onClick={handleLogout} style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "9px 12px", borderRadius: "10px", width: "100%",
          fontSize: "13px", fontWeight: "600", color: "#ef4444",
          background: "transparent", border: "none", cursor: "pointer",
          textAlign: "left", transition: "all 0.12s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          <Icon d={icons.logout} /><span>Logout</span>
        </button>
      </div>
    </aside>
  );
}