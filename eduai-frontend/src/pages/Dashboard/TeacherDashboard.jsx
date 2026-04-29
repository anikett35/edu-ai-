// src/pages/Dashboard/TeacherDashboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { teacherService, analyticsService, interventionService } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import { PageLoader, ErrorMessage } from "../../components/common/LoadingSpinner";
import StatsCard from "../../components/common/StatsCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const firstName = user?.name ? user.name.split(" ")[0].charAt(0).toUpperCase() + user.name.split(" ")[0].slice(1) : user?.email ? user.email.split("@")[0].charAt(0).toUpperCase() + user.email.split("@")[0].slice(1) : "Teacher";
  const [materials,    setMaterials]    = useState([]);
  const [leaderboard,  setLeaderboard]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [riskSummary,  setRiskSummary]  = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [matRes, lbRes] = await Promise.all([
          teacherService.listMaterials(),
          analyticsService.leaderboard(),
        ]);
        setMaterials(matRes.data || []);
        setLeaderboard(lbRes.data.leaderboard || []);
        try {
          const riskRes = await interventionService.getDashboard("WF3");
          setRiskSummary(riskRes.data?.summary || null);
        } catch {}
      } catch (e) {
        setError("Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <PageLoader />;

  const lbChart = leaderboard.slice(0, 6).map((s, i) => ({
    name:  s.name?.split(" ")[0] || `S${i + 1}`,
    score: Math.round(s.avg_percentage),
  }));

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div style={{
        borderRadius:"20px", padding:"28px 32px",
        background:"linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:"16px",
        boxShadow:"0 8px 32px rgba(6,78,59,0.25)",
        position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute", top:"-30px", right:"120px", width:"120px", height:"120px",
                      borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />
        <div style={{ position:"relative" }}>
          <h1 style={{ fontFamily:"Sora,sans-serif", fontWeight:"800", fontSize:"24px",
                       color:"white", margin:"0 0 6px", letterSpacing:"-0.01em" }}>
            Welcome back, {firstName} 👋
          </h1>
          <p style={{ fontSize:"14px", color:"rgba(255,255,255,0.7)", margin:0 }}>
            Overview of your uploaded materials and student activity.
          </p>
        </div>
        <div style={{ display:"flex", gap:"10px", position:"relative" }}>
          <Link to="/upload" style={{
            display:"inline-flex", alignItems:"center", gap:"8px",
            padding:"11px 22px", borderRadius:"12px",
            background:"white", color:"#065f46",
            fontWeight:"700", fontSize:"14px", textDecoration:"none",
            boxShadow:"0 4px 12px rgba(0,0,0,0.15)",
            fontFamily:"Sora,sans-serif",
          }}>
            📤 New Material
          </Link>
        </div>
      </div>

      <ErrorMessage message={error} />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}
          label="Materials Uploaded"
          value={materials.length}
          sub="Across all subjects"
        />
        <StatsCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
          label="Top Leaderboard"
          value={leaderboard.length}
          sub="Students ranked"
        />
        <StatsCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
          label="Class Avg Score"
          value={leaderboard.length
            ? `${(leaderboard.reduce((a, s) => a + s.avg_percentage, 0) / leaderboard.length).toFixed(1)}%`
            : "—"}
          sub="Across all quizzes"
          subColor="text-green-500"
        />
      </div>

      {/* Intervention summary */}
      {riskSummary && (riskSummary.WF3 > 0 || riskSummary.WF4 > 0) && (
        <div style={{ borderRadius:"14px", padding:"14px 18px",
                      background:"#fef2f2", border:"1px solid #fecaca",
                      display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
          <span style={{ fontSize:"22px" }}>🚨</span>
          <div style={{ flex:1 }}>
            <p style={{ fontWeight:"700", fontSize:"13px", color:"#dc2626", margin:"0 0 2px" }}>
              Students Requiring Intervention
            </p>
            <p style={{ fontSize:"12px", color:"#991b1b", margin:0 }}>
              {riskSummary.WF4 > 0 && `${riskSummary.WF4} CRITICAL · `}
              {riskSummary.WF3 > 0 && `${riskSummary.WF3} HIGH`}
              {" — immediate action required"}
            </p>
          </div>
          <a href="/intervention" style={{
            padding:"7px 14px", borderRadius:"9px", textDecoration:"none",
            background:"#dc2626", color:"white",
            fontSize:"12px", fontWeight:"700",
          }}>
            View Dashboard →
          </a>
        </div>
      )}

      {/* Charts + Materials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leaderboard chart */}
        <div className="card">
          <h3 className="font-display font-semibold text-gray-900 mb-1">Student Leaderboard</h3>
          <p className="text-xs text-gray-400 mb-4">Top students by average quiz score</p>
          {lbChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={lbChart} barCategoryGap="35%">
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                  formatter={(v) => [`${v}%`, "Avg Score"]}
                />
                <Bar dataKey="score" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No student quiz data yet
            </div>
          )}
        </div>

        {/* Recent materials */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-gray-900">Recent Materials</h3>
            <Link to="/upload" className="text-xs font-semibold text-primary-600 hover:text-primary-700">
              Upload New →
            </Link>
          </div>
          {materials.length > 0 ? (
            <div className="space-y-2.5">
              {materials.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition">
                  <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center shrink-0 text-sm">
                    📄
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{m.file_name}</p>
                    <p className="text-xs text-gray-400">
                      {m.subject} • {m.chunk_count} chunks
                    </p>
                  </div>
                  <span className="badge badge-purple text-[10px] shrink-0 capitalize">
                    {m.subject}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400 text-sm">
              No materials uploaded yet.{" "}
              <Link to="/upload" className="text-primary-600 font-semibold hover:underline">Upload now →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Top contributors */}
      {leaderboard.length > 0 && (
        <div className="card">
          <h3 className="font-display font-semibold text-gray-900 mb-4">Top Students</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {leaderboard.slice(0, 6).map((s, i) => (
              <div key={s.student_id}
                   className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                                ${i === 0 ? "bg-amber-100 text-amber-700"
                                 : i === 1 ? "bg-gray-200 text-gray-700"
                                 : "bg-primary-100 text-primary-700"}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.total_attempts} attempts</p>
                </div>
                <span className="text-sm font-bold text-primary-700">
                  {s.avg_percentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}