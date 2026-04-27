// src/pages/Quiz/QuizPage.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { quizService } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import QuizCard from "../../components/common/QuizCard";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";

const SUBJECTS = [
  { id: "data_structures",   label: "Data Structures"  },
  { id: "machine_learning",  label: "Machine Learning" },
  { id: "dbms",              label: "Databases"        },
  { id: "operating_systems", label: "Networking"       },
  { id: "full_stack",        label: "Full Stack"       },
];

const DIFFICULTIES = ["easy", "medium", "hard"];

const PHASE = { CONFIG: "config", QUIZ: "quiz", RESULT: "result" };

export default function QuizPage() {
  const [urlParams] = useSearchParams();
  const { user }    = useAuth();
  const isTeacher   = user?.role === "teacher";

  // Config
  const [subject,   setSubject]   = useState(urlParams.get("subject") || SUBJECTS[0].id);
  const [difficulty,setDifficulty]= useState("medium");
  const [numQ,      setNumQ]      = useState(10);

  // Quiz state
  const [phase,     setPhase]     = useState(PHASE.CONFIG);
  const [questions, setQuestions] = useState([]);
  const [answers,   setAnswers]   = useState({});  // { questionId: selectedOption }
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  // Teacher: list questions
  const [tQuestions, setTQuestions] = useState([]);

  useEffect(() => {
    if (isTeacher) {
      quizService.questions(subject)
        .then(r => setTQuestions(r.data.questions || []))
        .catch(() => {});
    }
  }, [subject, isTeacher]);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await quizService.generate({ subject, num_questions: numQ });
      setQuestions(res.data.questions || []);
      setAnswers({});
      setResult(null);
      setPhase(PHASE.QUIZ);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to generate quiz. Are quiz questions created for this subject?");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const questionIds = questions.map(q => q.id);
    const answersList = questionIds.map(id => answers[id] || "");
    setLoading(true);
    setError("");
    try {
      const res = await quizService.submit({ subject, question_ids: questionIds, answers: answersList });
      setResult(res.data);
      setPhase(PHASE.RESULT);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to submit quiz.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setPhase(PHASE.CONFIG); setQuestions([]); setAnswers({}); setResult(null); };

  const unanswered = questions.filter(q => !answers[q.id]).length;

  // ── CONFIG screen ──────────────────────────────────────────────────────────
  if (phase === PHASE.CONFIG) return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-900">Quiz Center</h1>
        <p className="text-sm text-gray-400 mt-1">Tailor your learning session with AI-generated challenges.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Config card */}
        <div className="lg:col-span-2 card space-y-5">
          {/* Subject */}
          <div>
            <label className="form-label">Select Subject</label>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSubject(s.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-sm font-semibold transition-all
                             ${subject === s.id
                               ? "border-primary-500 bg-primary-50 text-primary-700 shadow-glow"
                               : "border-gray-200 text-gray-600 hover:border-primary-300"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty + count */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-32">
              <label className="form-label">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="form-input capitalize"
              >
                {DIFFICULTIES.map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-32">
              <label className="form-label">Question Count</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setNumQ(n => Math.max(1, n - 1))}
                        className="w-9 h-9 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 font-bold text-lg flex items-center justify-center transition">
                  −
                </button>
                <span className="w-10 text-center font-bold text-gray-900">{numQ}</span>
                <button onClick={() => setNumQ(n => Math.min(50, n + 1))}
                        className="w-9 h-9 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 font-bold text-lg flex items-center justify-center transition">
                  +
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
          )}

          <button onClick={handleGenerate} className="btn-primary w-full py-3" disabled={loading}>
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Generating…</>
              : <>⚡ Start Learning</>
            }
          </button>
        </div>

        {/* Focus mode card */}
        
      </div>

      {/* Teacher: question bank */}
      {isTeacher && tQuestions.length > 0 && (
        <div className="card">
          <h3 className="font-display font-semibold text-gray-900 mb-4">
            Question Bank — {SUBJECTS.find(s=>s.id===subject)?.label} ({tQuestions.length} questions)
          </h3>
          <div className="space-y-2">
            {tQuestions.map((q, i) => (
              <div key={q.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                <span className="text-xs font-bold text-gray-400 mt-0.5 w-5 shrink-0">{i+1}.</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{q.question}</p>
                  <p className="text-xs text-green-600 font-semibold mt-1">✓ {q.correct_answer}</p>
                </div>
                <span className={`badge shrink-0 ${
                  q.difficulty === "easy" ? "badge-green" : q.difficulty === "hard" ? "badge-red" : "badge-yellow"
                }`}>{q.difficulty}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── QUIZ screen ────────────────────────────────────────────────────────────
  if (phase === PHASE.QUIZ) return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-gray-900">
            {SUBJECTS.find(s=>s.id===subject)?.label} Quiz
          </h1>
          <p className="text-sm text-gray-400">{questions.length} questions · {difficulty}</p>
        </div>
        <button onClick={reset} className="btn-ghost text-gray-400">✕ Exit</button>
      </div>

      {/* Progress */}
      <div className="progress-bar h-2">
        <div className="progress-fill"
             style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }} />
      </div>
      <p className="text-xs text-gray-400 text-right">
        {Object.keys(answers).length}/{questions.length} answered
      </p>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, i) => (
          <QuizCard
            key={q.id}
            question={q.question}
            options={q.options}
            difficulty={q.difficulty}
            index={i}
            total={questions.length}
            selected={answers[q.id]}
            onSelect={(opt) => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
            result={null}
          />
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
      )}

      <div className="flex gap-3 sticky bottom-4">
        <button onClick={reset} className="btn-secondary">← Back</button>
        <button
          onClick={handleSubmit}
          disabled={loading || unanswered > 0}
          className="btn-primary flex-1"
        >
          {loading
            ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Submitting…</>
            : unanswered > 0
              ? `Answer ${unanswered} more question${unanswered > 1 ? "s" : ""}`
              : "Submit Quiz →"
          }
        </button>
      </div>
    </div>
  );

  // ── RESULT screen ──────────────────────────────────────────────────────────
  if (phase === PHASE.RESULT && result) {
    const pct = result.percentage;
    const color = pct >= 80 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-red-600";

    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="font-display font-bold text-2xl text-gray-900">Performance Report</h1>

        {/* Score card */}
        <div className="card bg-gradient-to-br from-primary-50 to-white border-primary-100">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex flex-col items-center">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e0e7ff" strokeWidth="10"/>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#6366f1" strokeWidth="10"
                          strokeDasharray={`${pct * 2.51} 251`} strokeLinecap="round"/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-display font-bold ${color}`}>{pct.toFixed(0)}%</span>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">Mastery</span>
                </div>
              </div>
            </div>
            <div>
              <p className="font-display font-bold text-xl text-gray-900 mb-1">
                {pct >= 80 ? "Great Work!" : pct >= 60 ? "Good Effort!" : "Keep Practicing!"}
              </p>
              <p className="text-sm text-gray-500 mb-3">
                {pct >= 80 ? "You've mastered this topic." : pct >= 60 ? "Review the incorrect answers below." : "More practice with the AI tutor is recommended."}
              </p>
              <div className="flex gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{result.score}</p>
                  <p className="text-xs text-gray-400">Correct</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">{result.total_questions - result.score}</p>
                  <p className="text-xs text-gray-400">Incorrect</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">{result.grade}</p>
                  <p className="text-xs text-gray-400">Grade</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed results */}
        <div className="card">
          <h3 className="font-display font-semibold text-gray-900 mb-4">Question Review</h3>
          <div className="space-y-3">
            {result.detailed_results?.map((r, i) => (
              <div key={i}
                   className={`p-3 rounded-xl border ${
                     r.is_correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                   }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-500">Q{i + 1}</span>
                  {r.is_correct
                    ? <span className="text-xs font-semibold text-green-600">✓ Correct</span>
                    : <span className="text-xs font-semibold text-red-600">✗ Incorrect</span>
                  }
                </div>
                {!r.is_correct && (
                  <div className="text-xs text-gray-600 mt-1">
                    <span className="text-red-600">Your answer: </span>{r.submitted} ·{" "}
                    <span className="text-green-600 font-semibold">Correct: </span>{r.correct}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={reset} className="btn-secondary flex items-center gap-2">
            ↺ Retake Quiz
          </button>
          <button onClick={() => window.location.href = "/tutor"} className="btn-primary flex-1">
            → Next: Ask AI Tutor
          </button>
        </div>
      </div>
    );
  }

  return null;
}