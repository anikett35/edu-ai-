// src/pages/Dashboard/StudentDashboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { analyticsService, quizService, interventionService } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import StatsCard from "../../components/common/StatsCard";
import { PageLoader, ErrorMessage } from "../../components/common/LoadingSpinner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const subjectColors = {
  "data_structures":   "#6366f1",
  "algorithms":        "#8b5cf6",
  "dbms":              "#06b6d4",
  "operating_systems": "#10b981",
  "machine_learning":  "#f59e0b",
  "full_stack":        "#ec4899",
};

export default function StudentDashboard() {
  const { user } = useAuth();

  // Real display name from stored user data
  const firstName = user?.name
    ? user.name.split(" ")[0].charAt(0).toUpperCase() + user.name.split(" ")[0].slice(1)
    : user?.email
    ? user.email.split("@")[0].charAt(0).toUpperCase() + user.email.split("@")[0].slice(1)
    : "there";

  const [summary,  setSummary]  = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [risk,     setRisk]     = useState(null);

  useEffect(() => {
    if (!user?.user_id) return;
    (async () => {
      try {
        const [sumRes, subRes, histRes] = await Promise.all([
          analyticsService.summary(user.user_id),
          analyticsService.subjects(user.user_id),
          quizService.history(user.user_id, { limit: 5 }),
        ]);
        setSummary(sumRes.data);
        setSubjects(subRes.data.subjects || []);
        setHistory(histRes.data.attempts || []);
      } catch {
        setError("Could not load dashboard data. Is the backend running?");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <PageLoader />;

  const chartData = subjects.slice(0, 5).map((s) => ({
    name:  s.subject.replace(/_/g, " ").split(" ").slice(0, 2).join(" "),
    score: Math.round(s.avg_percentage),
    fill:  subjectColors[s.subject] || "#6366f1",
  }));

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div style={{
        borderRadius:"20px", padding:"28px 32px",
        background:"linear-gradient(135deg, #3730a3 0%, #4f46e5 50%, #7c3aed 100%)",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:"16px",
        boxShadow:"0 8px 32px rgba(79,70,229,0.25)",
        position:"relative", overflow:"hidden",
      }}>
        {/* Background decoration */}
        <div style={{
          position:"absolute", top:"-30px", right:"120px",
          width:"120px", height:"120px", borderRadius:"50%",
          background:"rgba(255,255,255,0.05)",
        }} />
        <div style={{
          position:"absolute", bottom:"-40px", right:"-20px",
          width:"160px", height:"160px", borderRadius:"50%",
          background:"rgba(255,255,255,0.05)",
        }} />
        <div style={{ position:"relative" }}>
          <h1 style={{
            fontFamily:"Sora,sans-serif", fontWeight:"800", fontSize:"24px",
            color:"white", margin:"0 0 6px", letterSpacing:"-0.01em",
          }}>
            Welcome back, {firstName} 👋
          </h1>
          <p style={{ fontSize:"14px", color:"rgba(255,255,255,0.7)", margin:0 }}>
            You've completed{" "}
            <strong style={{ color:"white" }}>{summary?.total_attempts ?? 0}</strong>{" "}
            quizzes so far. Keep the momentum!
          </p>
        </div>
        <Link to="/tutor" style={{
          display:"inline-flex", alignItems:"center", gap:"8px",
          padding:"11px 22px", borderRadius:"12px",
          background:"white", color:"#4f46e5",
          fontWeight:"700", fontSize:"14px", textDecoration:"none",
          boxShadow:"0 4px 12px rgba(0,0,0,0.15)",
          transition:"all 0.15s", flexShrink:0, position:"relative",
          fontFamily:"Sora,sans-serif",
        }}>
          🤖 Ask AI Tutor
        </Link>
      </div>

      <ErrorMessage message={error} />

      {/* Risk alert banner */}
      {risk && risk.tier !== "WF1" && (
        <div style={{
          borderRadius:"14px", padding:"14px 18px",
          background: risk.tier === "WF4" ? "#fef2f2" : risk.tier === "WF3" ? "#fff7ed" : "#fefce8",
          border: `1px solid ${risk.tier === "WF4" ? "#fecaca" : risk.tier === "WF3" ? "#fed7aa" : "#fde68a"}`,
          display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap",
        }}>
          <span style={{ fontSize:"22px" }}>
            {risk.tier === "WF4" ? "🚨" : risk.tier === "WF3" ? "🔶" : "⚠️"}
          </span>
          <div style={{ flex:1 }}>
            <p style={{ fontWeight:"700", fontSize:"13px", margin:"0 0 2px",
                        color: risk.tier === "WF4" ? "#dc2626" : risk.tier === "WF3" ? "#ea580c" : "#d97706" }}>
              {risk.tier === "WF4"
                ? "URGENT: Academic counselor intervention required"
                : risk.tier === "WF3"
                ? "HIGH RISK: Faculty review has been triggered"
                : "ACTION NEEDED: Study reminders & quiz recommendations active"}
            </p>
            <p style={{ fontSize:"12px", margin:0,
                        color: risk.tier === "WF4" ? "#991b1b" : risk.tier === "WF3" ? "#9a3412" : "#92400e" }}>
              Risk score: {risk.risk_score}/100 · {risk.action}
            </p>
          </div>
          <a href="/intervention" style={{
            padding:"7px 14px", borderRadius:"9px", textDecoration:"none",
            background: risk.tier === "WF4" ? "#dc2626" : risk.tier === "WF3" ? "#ea580c" : "#d97706",
            color:"white", fontSize:"12px", fontWeight:"700", flexShrink:0,
          }}>
            View Details →
          </a>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          label="Quiz Accuracy"
          value={`${summary?.avg_percentage?.toFixed(1) ?? "0.0"}%`}
          sub="Average across all subjects"
          subColor="text-green-500"
        />
        <StatsCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}
          label="Quizzes Taken"
          value={summary?.total_attempts ?? 0}
          sub="Total attempts"
        />
        <StatsCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>}
          label="Chat Sessions"
          value={summary?.chat_sessions ?? 0}
          sub="AI Tutor interactions"
        />
        <StatsCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
          label="Best Score"
          value={`${summary?.best_percentage?.toFixed(0) ?? "0"}%`}
          sub="Personal best"
          subColor="text-primary-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quiz performance bars */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-gray-900">Quiz Performance</h3>
              <p className="text-xs text-gray-400">Average scores across subjects</p>
            </div>
            <Link to="/analytics" className="text-xs font-semibold text-primary-600 hover:text-primary-700">
              View All →
            </Link>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barCategoryGap="35%">
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                  formatter={(v) => [`${v}%`, "Avg Score"]}
                />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No quiz data yet —{" "}
              <Link to="/quiz" className="text-primary-600 font-semibold ml-1">take your first quiz!</Link>
            </div>
          )}
        </div>

        {/* Subject performance list */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-gray-900">Subject Breakdown</h3>
              <p className="text-xs text-gray-400">Progress per subject</p>
            </div>
          </div>
          {subjects.length > 0 ? (
            <div className="space-y-3">
              {subjects.slice(0, 5).map((s) => (
                <div key={s.subject}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 capitalize">{s.subject.replace(/_/g, " ")}</span>
                    <span className="font-semibold text-gray-900">{s.avg_percentage.toFixed(0)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${s.avg_percentage}%`,
                        backgroundColor: subjectColors[s.subject] || "#6366f1",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Complete quizzes to see subject breakdown
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <h3 className="font-display font-semibold text-gray-900 mb-4">Recent Quiz Attempts</h3>
        {history.length > 0 ? (
          <div className="space-y-2.5">
            {history.map((a) => (
              <div key={a.id}
                   className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition">
                <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="1"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate capitalize">
                    {a.subject.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-gray-400">
                    {a.score}/{a.total_questions} correct · {new Date(a.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`badge ${a.percentage >= 70 ? "badge-green" : a.percentage >= 50 ? "badge-yellow" : "badge-red"}`}>
                    {a.grade}
                  </span>
                  <span className="text-sm font-bold text-gray-900">{a.percentage.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400 text-sm">
            No quiz attempts yet.{" "}
            <Link to="/quiz" className="text-primary-600 font-semibold hover:underline">
              Take your first quiz →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}