// src/pages/Analytics/AnalyticsPage.jsx
import React, { useEffect, useState } from "react";
import { analyticsService, mlService } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import { PageLoader } from "../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../components/common/LoadingSpinner";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

// ── Custom tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-card text-xs">
      <p className="font-semibold text-gray-600 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {typeof p.value === "number" ? `${p.value.toFixed(1)}%` : p.value}
        </p>
      ))}
    </div>
  );
};

// ── Score Predictor form ──────────────────────────────────────────────────────
function ScorePredictor() {
  const [form,    setForm]    = useState({ study_hours_per_week: 8, avg_quiz_score: 70, quizzes_completed: 10, chat_sessions: 5 });
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handlePredict = async () => {
    setLoading(true); setError("");
    try {
      const res = await mlService.predictScore(form);
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: "study_hours_per_week", label: "Study Hours / Week", min: 0, max: 60 },
    { key: "avg_quiz_score",       label: "Avg Quiz Score (%)", min: 0, max: 100 },
    { key: "quizzes_completed",    label: "Quizzes Completed",  min: 0, max: 200 },
    { key: "chat_sessions",        label: "AI Chat Sessions",   min: 0, max: 200 },
  ];

  return (
    <div className="card border-primary-100 bg-gradient-to-br from-primary-50/40 to-white">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
            <path d="M12 2a9 9 0 110 18A9 9 0 0112 2z"/>
            <path d="M12 8v4l3 3"/>
          </svg>
        </div>
        <div>
          <h3 className="font-display font-semibold text-gray-900">ML Score Predictor</h3>
          <p className="text-xs text-gray-400 mt-0.5">Random Forest model predicts your final exam score</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {fields.map(({ key, label, min, max }) => (
          <div key={key}>
            <label className="form-label text-xs">{label}</label>
            <input
              type="number" min={min} max={max}
              value={form[key]}
              onChange={(e) => setForm(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
              className="form-input text-sm"
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">{error}</div>
      )}

      <button onClick={handlePredict} disabled={loading} className="btn-primary w-full mb-4">
        {loading
          ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Predicting…</>
          : "Predict My Score"
        }
      </button>

      {result && (
        <div className="p-4 bg-white border border-primary-100 rounded-xl space-y-2 animate-fade-up">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Predicted Score</span>
            <span className="text-2xl font-display font-bold text-primary-600">
              {result.predicted_score}%
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Confidence Band</span>
            <span className="font-semibold text-gray-700">{result.confidence_band}</span>
          </div>
          <div className="progress-bar h-2 mt-1">
            <div className="progress-fill" style={{ width: `${result.predicted_score}%` }} />
          </div>
          <div className="mt-2 p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-xs text-amber-700 leading-relaxed">{result.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Analytics Page ───────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { user }   = useAuth();
  const isTeacher  = user?.role === "teacher";

  const [timeline,    setTimeline]    = useState([]);
  const [subjects,    setSubjects]    = useState([]);
  const [summary,     setSummary]     = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");

  useEffect(() => {
    if (!user?.user_id) return;
    (async () => {
      try {
        if (isTeacher) {
          const lbRes = await analyticsService.leaderboard();
          setLeaderboard(lbRes.data.leaderboard || []);
        } else {
          const [tlRes, subRes, sumRes] = await Promise.all([
            analyticsService.performance(user.user_id),
            analyticsService.subjects(user.user_id),
            analyticsService.summary(user.user_id),
          ]);
          setTimeline(tlRes.data.timeline || []);
          setSubjects(subRes.data.subjects || []);
          setSummary(sumRes.data);
        }
      } catch {
        setError("Could not load analytics data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isTeacher]);

  if (loading) return <PageLoader />;

  // ── TEACHER view ─────────────────────────────────────────────────────────
  if (isTeacher) return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-900">Class Analytics</h1>
        <p className="text-sm text-gray-400 mt-1">Student performance overview across all subjects</p>
      </div>

      <ErrorMessage message={error} />

      {/* Leaderboard bar chart */}
      <div className="card">
        <h3 className="font-display font-semibold text-gray-900 mb-1">Class Leaderboard</h3>
        <p className="text-xs text-gray-400 mb-4">Top students by average quiz score</p>
        {leaderboard.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={leaderboard.slice(0, 10).map((s, i) => ({
              name:  s.name?.split(" ")[0] || `S${i+1}`,
              score: +s.avg_percentage.toFixed(1),
              attempts: s.total_attempts,
            }))} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="score" name="Avg Score" radius={[6,6,0,0]}>
                {leaderboard.slice(0,10).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            No student data yet
          </div>
        )}
      </div>

      {/* Leaderboard table */}
      {leaderboard.length > 0 && (
        <div className="card">
          <h3 className="font-display font-semibold text-gray-900 mb-4">Full Rankings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 pb-2 pr-4">#</th>
                  <th className="text-left text-xs font-semibold text-gray-400 pb-2 pr-4">Student</th>
                  <th className="text-right text-xs font-semibold text-gray-400 pb-2 pr-4">Avg Score</th>
                  <th className="text-right text-xs font-semibold text-gray-400 pb-2">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((s, i) => (
                  <tr key={s.student_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="py-2.5 pr-4">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                        ${i === 0 ? "bg-amber-100 text-amber-700"
                                         : i === 1 ? "bg-gray-200 text-gray-600"
                                         : i === 2 ? "bg-orange-100 text-orange-600"
                                         : "bg-gray-100 text-gray-500"}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-gray-800">{s.name}</td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className={`font-bold ${
                        s.avg_percentage >= 80 ? "text-green-600"
                        : s.avg_percentage >= 60 ? "text-amber-600"
                        : "text-red-500"
                      }`}>
                        {s.avg_percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-gray-500">{s.total_attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ── STUDENT view ──────────────────────────────────────────────────────────
  const pieData = subjects.slice(0, 5).map((s, i) => ({
    name:  s.subject,
    value: +s.avg_percentage.toFixed(1),
    fill:  COLORS[i % COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-900">My Analytics</h1>
        <p className="text-sm text-gray-400 mt-1">Track your performance over time</p>
      </div>

      <ErrorMessage message={error} />

      {/* Summary stat cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Avg Score",   value: `${summary.avg_percentage?.toFixed(1)}%`, color: "text-primary-600" },
            { label: "Best Score",  value: `${summary.best_percentage?.toFixed(1)}%`, color: "text-green-600" },
            { label: "Quizzes",     value: summary.total_attempts,                    color: "text-gray-900"   },
            { label: "AI Sessions", value: summary.chat_sessions,                     color: "text-purple-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="card text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Timeline chart */}
      <div className="card">
        <h3 className="font-display font-semibold text-gray-900 mb-1">Performance Over Time</h3>
        <p className="text-xs text-gray-400 mb-4">Average quiz score per day</p>
        {timeline.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false} tickLine={false}
                tickFormatter={(d) => d.slice(5)} // MM-DD
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="avg_score"
                name="Avg Score"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ fill: "#6366f1", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            Take quizzes to see your performance timeline
          </div>
        )}
      </div>

      {/* Subject pie + bar side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart */}
        <div className="card">
          <h3 className="font-display font-semibold text-gray-900 mb-1">Subject Distribution</h3>
          <p className="text-xs text-gray-400 mb-3">Score breakdown by subject</p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v}%`, "Avg Score"]} />
                <Legend
                  formatter={(val) => <span className="text-xs text-gray-600">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No data yet
            </div>
          )}
        </div>

        {/* Subject bars */}
        <div className="card">
          <h3 className="font-display font-semibold text-gray-900 mb-1">Subject Averages</h3>
          <p className="text-xs text-gray-400 mb-3">Avg score per subject</p>
          {subjects.length > 0 ? (
            <div className="space-y-3 mt-2">
              {subjects.map((s, i) => (
                <div key={s.subject}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700 truncate max-w-[160px]">{s.subject}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-gray-400">{s.total_attempts} attempts</span>
                      <span className="font-bold text-gray-900">{s.avg_percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${s.avg_percentage}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No subject data yet
            </div>
          )}
        </div>
      </div>

      {/* ML Score Predictor */}
      <ScorePredictor />
    </div>
  );
}