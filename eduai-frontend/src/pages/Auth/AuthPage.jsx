// src/pages/Auth/AuthPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ROLES = ["student", "teacher"];

// ── EduAI SVG Logo ────────────────────────────────────────────────────────────
export function EduAILogo({ size = 40, dark = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill={dark ? "#4f46e5" : "white"} />
      <path d="M10 12h10a8 8 0 018 8v16a4 4 0 01-4-4V20a4 4 0 00-4-4H10V12z"
            fill={dark ? "white" : "#4f46e5"} />
      <path d="M38 12H28a8 8 0 00-8 8v16a4 4 0 004-4V20a4 4 0 014-4h10V12z"
            fill={dark ? "rgba(255,255,255,0.6)" : "#818cf8"} />
      <circle cx="20" cy="34" r="3" fill={dark ? "white" : "#4f46e5"} />
      <circle cx="28" cy="34" r="3" fill={dark ? "rgba(255,255,255,0.6)" : "#818cf8"} />
    </svg>
  );
}

// ── Student / Teacher avatar icons ────────────────────────────────────────────
export function StudentAvatar({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#eef2ff" />
      <circle cx="20" cy="15" r="6" fill="#6366f1" />
      <path d="M8 34c0-6.627 5.373-10 12-10s12 3.373 12 10" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
      {/* graduation cap */}
      <path d="M14 13l6-3 6 3-6 3-6-3z" fill="white" opacity="0.9" />
      <path d="M26 13v5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function TeacherAvatar({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#f0fdf4" />
      <circle cx="20" cy="14" r="6" fill="#16a34a" />
      <path d="M8 34c0-6.627 5.373-10 12-10s12 3.373 12 10" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
      {/* tie */}
      <path d="M20 20l-2 5h4l-2-5z" fill="white" opacity="0.9" />
      <rect x="19" y="20" width="2" height="2" rx="1" fill="white" />
    </svg>
  );
}

export default function AuthPage() {
  const [mode,     setMode]     = useState("login");
  const [role,     setRole]     = useState("student");
  const [form,     setForm]     = useState({ name: "", email: "", password: "" });
  const [errors,   setErrors]   = useState({});
  const [apiError, setApiError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const { login, register, loading } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const e = {};
    if (mode === "register" && !form.name.trim()) e.name = "Name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email required";
    if (form.password.length < 8)     e.password = "Minimum 8 characters";
    if (!/[A-Z]/.test(form.password)) e.password = "Must include an uppercase letter";
    if (!/\d/.test(form.password))    e.password = "Must include a digit";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await register({ name: form.name, email: form.email, password: form.password, role });
      }
      navigate("/dashboard");
    } catch (err) {
      setApiError(err.message);
    }
  };

  const inputStyle = (hasErr) => ({
    width: "100%", padding: "12px 16px", borderRadius: "12px",
    border: `1.5px solid ${hasErr ? "#fca5a5" : "#e5e7eb"}`,
    background: "#f8faff", fontSize: "14px", outline: "none",
    fontFamily: "DM Sans, sans-serif", transition: "all 0.15s",
    boxSizing: "border-box",
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f1f5f9" }}>

      {/* ── Left decorative panel ── */}
      <div style={{
        width: "360px", flexShrink: 0, padding: "40px 36px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        background: "linear-gradient(160deg, #3730a3 0%, #4f46e5 45%, #7c3aed 100%)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Background decoration circles */}
        <div style={{
          position:"absolute", top:"-60px", right:"-60px",
          width:"200px", height:"200px", borderRadius:"50%",
          background:"rgba(255,255,255,0.05)",
        }} />
        <div style={{
          position:"absolute", bottom:"80px", left:"-40px",
          width:"150px", height:"150px", borderRadius:"50%",
          background:"rgba(255,255,255,0.05)",
        }} />

        {/* Logo */}
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"48px" }}>
            <EduAILogo size={44} dark={false} />
            <div>
              <p style={{ fontFamily:"Sora,sans-serif", fontWeight:"800",
                          fontSize:"18px", color:"white", margin:0, lineHeight:"1" }}>
                EduAI
              </p>
              <p style={{ fontSize:"10px", color:"rgba(255,255,255,0.5)",
                          letterSpacing:"0.15em", textTransform:"uppercase", margin:"4px 0 0" }}>
                CS Learning Portal
              </p>
            </div>
          </div>

          <h2 style={{
            fontFamily:"Sora,sans-serif", fontWeight:"800",
            fontSize:"28px", color:"white", lineHeight:"1.25",
            margin:"0 0 32px", letterSpacing:"-0.02em",
          }}>
            Learn smarter with<br />AI‑powered tutoring
          </h2>

          <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
            {[
              { emoji:"📚", title:"RAG-powered AI Tutor",  desc:"Answers from your actual course notes"       },
              { emoji:"🧠", title:"ML-graded Quizzes",     desc:"Adaptive difficulty based on your progress"  },
              { emoji:"📊", title:"Real-time Analytics",   desc:"Track performance across all subjects"       },
            ].map(({ emoji, title, desc }) => (
              <div key={title} style={{ display:"flex", alignItems:"flex-start", gap:"14px" }}>
                <div style={{
                  width:"40px", height:"40px", borderRadius:"10px",
                  background:"rgba(255,255,255,0.12)", flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:"20px",
                }}>
                  {emoji}
                </div>
                <div>
                  <p style={{ fontWeight:"700", fontSize:"14px", color:"white", margin:"0 0 2px" }}>{title}</p>
                  <p style={{ fontSize:"12px", color:"rgba(255,255,255,0.55)", margin:0, lineHeight:"1.4" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        
         
         
       

        <p style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)", margin:0 }}>
          © 2024 EduAI. Production-grade education platform.
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div style={{
        flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        padding:"40px 24px",
      }}>
        <div style={{ width:"100%", maxWidth:"460px" }}>

          {/* Toggle */}
          <div style={{
            display:"flex", background:"#e2e8f0", borderRadius:"14px",
            padding:"4px", marginBottom:"36px",
          }}>
            {["login","register"].map((m) => (
              <button key={m}
                onClick={() => { setMode(m); setErrors({}); setApiError(""); }}
                style={{
                  flex:1, padding:"10px", borderRadius:"10px", border:"none",
                  cursor:"pointer", fontSize:"14px", fontWeight:"600",
                  transition:"all 0.2s",
                  background: mode === m ? "white" : "transparent",
                  color:      mode === m ? "#1e293b" : "#64748b",
                  boxShadow:  mode === m ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                {m === "login" ? "🔑 Sign In" : "✨ Create Account"}
              </button>
            ))}
          </div>

          {/* Heading */}
          <div style={{ marginBottom:"28px" }}>
            <h1 style={{
              fontFamily:"Sora,sans-serif", fontWeight:"800", fontSize:"26px",
              color:"#0f172a", margin:"0 0 6px", letterSpacing:"-0.02em",
            }}>
              {mode === "login" ? "Welcome back 👋" : "Join EduAI 🎓"}
            </h1>
            <p style={{ fontSize:"14px", color:"#64748b", margin:0 }}>
              {mode === "login"
                ? "Sign in to continue your learning journey"
                : "Create your account and start learning today"}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>

            {/* Name field (register only) */}
            {mode === "register" && (
              <div>
                <label style={{ display:"block", fontSize:"13px", fontWeight:"600",
                                color:"#374151", marginBottom:"6px" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Alex Johnson"
                  style={inputStyle(errors.name)}
                  onFocus={e => e.target.style.borderColor = "#6366f1"}
                  onBlur={e => e.target.style.borderColor = errors.name ? "#fca5a5" : "#e5e7eb"}
                />
                {errors.name && <p style={{ fontSize:"12px", color:"#ef4444", margin:"4px 0 0" }}>{errors.name}</p>}
              </div>
            )}

            {/* Email */}
            <div>
              <label style={{ display:"block", fontSize:"13px", fontWeight:"600",
                              color:"#374151", marginBottom:"6px" }}>
                Email Address
              </label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)",
                               fontSize:"16px" }}></span>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="you@university.edu"
                  style={{ ...inputStyle(errors.email), paddingLeft:"40px" }}
                  onFocus={e => e.target.style.borderColor = "#6366f1"}
                  onBlur={e => e.target.style.borderColor = errors.email ? "#fca5a5" : "#e5e7eb"}
                />
              </div>
              {errors.email && <p style={{ fontSize:"12px", color:"#ef4444", margin:"4px 0 0" }}>{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label style={{ display:"block", fontSize:"13px", fontWeight:"600",
                              color:"#374151", marginBottom:"6px" }}>
                Password
              </label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)",
                               fontSize:"16px" }}></span>
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  style={{ ...inputStyle(errors.password), paddingLeft:"40px", paddingRight:"44px" }}
                  onFocus={e => e.target.style.borderColor = "#6366f1"}
                  onBlur={e => e.target.style.borderColor = errors.password ? "#fca5a5" : "#e5e7eb"}
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)",
                           background:"none", border:"none", cursor:"pointer", fontSize:"16px",
                           color:"#9ca3af", padding:"4px" }}>
                  {showPass ? "" : ""}
                </button>
              </div>
              {errors.password && <p style={{ fontSize:"12px", color:"#ef4444", margin:"4px 0 0" }}>{errors.password}</p>}
            </div>

            {/* Role selector (register only) */}
            {mode === "register" && (
              <div>
                <label style={{ display:"block", fontSize:"13px", fontWeight:"600",
                                color:"#374151", marginBottom:"8px" }}>
                  I am a
                </label>
                <div style={{ display:"flex", gap:"12px" }}>
                  {ROLES.map((r) => (
                    <button key={r} type="button" onClick={() => setRole(r)}
                      style={{
                        flex:1, padding:"12px", borderRadius:"12px", border:"none",
                        cursor:"pointer", transition:"all 0.15s",
                        border: role === r ? "2px solid #4f46e5" : "2px solid #e5e7eb",
                        background: role === r ? "#eef2ff" : "white",
                        display:"flex", flexDirection:"column", alignItems:"center", gap:"6px",
                      }}>
                      {r === "student"
                        ? <span style={{ fontSize:"28px" }}>🎓</span>
                        : <span style={{ fontSize:"28px" }}>👨‍🏫</span>}
                      <span style={{ fontSize:"13px", fontWeight:"700",
                                    color: role === r ? "#4338ca" : "#6b7280",
                                    fontFamily:"DM Sans,sans-serif" }}>
                        {r === "student" ? "Student" : "Teacher"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* API Error */}
            {apiError && (
              <div style={{
                padding:"12px 16px", borderRadius:"12px",
                background:"#fef2f2", border:"1px solid #fecaca",
                fontSize:"13px", color:"#dc2626",
                display:"flex", alignItems:"center", gap:"8px",
              }}>
                ⚠️ {apiError}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width:"100%", padding:"14px", borderRadius:"12px", border:"none",
              background: loading ? "#c7d2fe" : "linear-gradient(135deg, #4f46e5, #7c3aed)",
              color:"white", fontSize:"15px", fontWeight:"700", cursor: loading ? "not-allowed" : "pointer",
              fontFamily:"Sora,sans-serif", letterSpacing:"0.01em",
              boxShadow: loading ? "none" : "0 4px 16px rgba(79,70,229,0.35)",
              transition:"all 0.2s", marginTop:"4px",
            }}>
              {loading ? (
                <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
                  <span style={{
                    width:"16px", height:"16px", border:"2px solid rgba(255,255,255,0.4)",
                    borderTop:"2px solid white", borderRadius:"50%",
                    display:"inline-block", animation:"spin 0.8s linear infinite",
                  }} />
                  {mode === "login" ? "Signing in…" : "Creating account…"}
                </span>
              ) : (
                mode === "login" ? "Sign In →" : "Create Account →"
              )}
            </button>

            {/* Switch mode link */}
            <p style={{ textAlign:"center", fontSize:"13px", color:"#64748b", margin:0 }}>
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button type="button"
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setErrors({}); setApiError(""); }}
                style={{ background:"none", border:"none", cursor:"pointer",
                         color:"#4f46e5", fontWeight:"700", fontSize:"13px",
                         fontFamily:"DM Sans,sans-serif", padding:0 }}>
                {mode === "login" ? "Create one" : "Sign in"}
              </button>
            </p>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}