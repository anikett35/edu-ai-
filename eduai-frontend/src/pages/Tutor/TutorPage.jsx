// src/pages/Tutor/TutorPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { tutorService } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import ChatBox from "../../components/common/ChatBox";

const SUBJECTS = [
  { id: "full_stack",        label: "Full Stack"       },
  { id: "dbms",              label: "DBMS"             },
  { id: "data_structures",   label: "Data Structures"  },
  { id: "machine_learning",  label: "Machine Learning" },
  { id: "operating_systems", label: "OS"               },
];

function OllamaHelp() {
  return (
    <div className="mx-4 mb-3 p-4 rounded-xl text-sm"
         style={{ background:"#fffbeb", border:"1px solid #fcd34d" }}>
      <p className="font-semibold mb-2" style={{ color:"#92400e" }}>
        ⚠️ AI Tutor Unavailable — Ollama not running
      </p>
      <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color:"#b45309" }}>
        <li>Download Ollama from <strong>ollama.ai</strong></li>
        <li>Open terminal: <code style={{ background:"#fef3c7", padding:"1px 4px", borderRadius:"4px" }}>ollama serve</code></li>
        <li>Pull model: <code style={{ background:"#fef3c7", padding:"1px 4px", borderRadius:"4px" }}>ollama pull mistral</code></li>
        <li>Restart FastAPI and refresh this page</li>
      </ol>
    </div>
  );
}

// ── History Panel (left sidebar) ─────────────────────────────────────────────
function HistoryPanel({ subject, onSelect, currentMessages }) {
  const { user } = useAuth();
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [page,    setPage]      = useState(0);
  const [hasMore, setHasMore]   = useState(true);
  const LIMIT = 15;

  const loadHistory = async (skip = 0, reset = false) => {
    if (!user?.user_id) return;
    setLoading(true);
    try {
      const res = await tutorService.history(subject, { limit: LIMIT, skip });
      const items = res.data.history || [];
      setHistory(prev => reset ? items : [...prev, ...items]);
      setHasMore(items.length === LIMIT);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    setHistory([]);
    setPage(0);
    setHasMore(true);
    loadHistory(0, true);
  }, [subject]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadHistory(nextPage * LIMIT, false);
  };

  const confidenceColor = (v) =>
    v >= 0.7 ? "#16a34a" : v >= 0.4 ? "#d97706" : "#6b7280";

  // If new messages came in, prepend them to history view
  const latestMsg = currentMessages[currentMessages.length - 1];

  return (
    <div style={{
      width:"260px", flexShrink:0, borderRight:"1px solid #f1f5f9",
      display:"flex", flexDirection:"column", height:"100%",
    }}>
      {/* Header */}
      <div style={{ padding:"14px 16px 10px", borderBottom:"1px solid #f1f5f9" }}>
        <p style={{ fontFamily:"Sora,sans-serif", fontWeight:"700", fontSize:"13px",
                    color:"#0f172a", margin:"0 0 2px" }}>
          Chat History
        </p>
        <p style={{ fontSize:"11px", color:"#94a3b8", margin:0 }}>
          {SUBJECTS.find(s => s.id === subject)?.label} 
        </p>
      </div>

      {/* History list */}
      <div style={{ flex:1, overflowY:"auto", padding:"8px" }}>
        {history.length === 0 && !loading && (
          <div style={{ padding:"24px 12px", textAlign:"center" }}>
            <div style={{ fontSize:"28px", marginBottom:"8px" }}>💬</div>
            <p style={{ fontSize:"12px", color:"#94a3b8", margin:0 }}>
              No history yet for this subject.
              <br />Start chatting!
            </p>
          </div>
        )}

        {history.map((item, i) => (
          <button key={item.id || i}
            onClick={() => onSelect(item)}
            style={{
              width:"100%", textAlign:"left", padding:"10px 10px",
              borderRadius:"10px", border:"1px solid transparent",
              background:"transparent", cursor:"pointer",
              marginBottom:"4px", transition:"all 0.12s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "#f8faff";
              e.currentTarget.style.borderColor = "#e0e7ff";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "transparent";
            }}
          >
            {/* Question */}
            <p style={{ fontSize:"12px", fontWeight:"600", color:"#374151",
                        margin:"0 0 4px", lineHeight:"1.3",
                        display:"-webkit-box", WebkitLineClamp:2,
                        WebkitBoxOrient:"vertical", overflow:"hidden" }}>
              {item.question}
            </p>
            {/* Meta */}
            <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
             

              <span style={{ fontSize:"10px", color:"#94a3b8", marginLeft:"auto" }}>
                {item.timestamp
                  ? new Date(item.timestamp).toLocaleDateString("en-US",
                      { month:"short", day:"numeric" })
                  : ""}
              </span>
            </div>
          </button>
        ))}

        {/* Load more */}
        {hasMore && (
          <button onClick={handleLoadMore} disabled={loading}
            style={{ width:"100%", padding:"8px", borderRadius:"10px",
                     border:"1.5px solid #e2e8f0", background:"white",
                     fontSize:"12px", fontWeight:"600", color:"#6366f1",
                     cursor: loading ? "not-allowed":"pointer", marginTop:"4px" }}>
            {loading ? "Loading…" : "Load older chats ↓"}
          </button>
        )}
        {loading && history.length === 0 && (
          <div style={{ display:"flex", justifyContent:"center", padding:"20px 0" }}>
            <span style={{ width:"20px", height:"20px", border:"2px solid #e0e7ff",
                           borderTop:"2px solid #6366f1", borderRadius:"50%",
                           display:"inline-block", animation:"spin 0.8s linear infinite" }} />
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}

// ── Main TutorPage ────────────────────────────────────────────────────────────
export default function TutorPage() {
  const [params]     = useSearchParams();
  const defaultSubj  = params.get("subject") || SUBJECTS[0].id;

  const [subject,    setSubject]    = useState(defaultSubj);
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error,      setError]      = useState("");
  const [ollamaDown, setOllamaDown] = useState(false);
  const [showHistory,setShowHistory]= useState(true);
  const [cache,      setCache]      = useState({});
  const inputRef  = useRef(null);
  const timerRef  = useRef(null);

  useEffect(() => {
    setMessages(cache[subject] || []);
    setError("");
    setOllamaDown(false);
    inputRef.current?.focus();
  }, [subject]);

  const startLoadingMessages = () => {
    const msgs = [
      "Thinking…",
      "Searching course notes…",
      "Generating answer… (Mistral can take 30–60s on CPU)",
      "Almost done…",
    ];
    let i = 0;
    setLoadingMsg(msgs[0]);
    timerRef.current = setInterval(() => {
      i = (i + 1) % msgs.length;
      setLoadingMsg(msgs[i]);
    }, 8000);
  };

  const stopLoadingMessages = () => {
    clearInterval(timerRef.current);
    setLoadingMsg("");
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const q = input.trim();
    if (!q || loading) return;

    setInput("");
    setError("");
    setOllamaDown(false);
    setLoading(true);
    startLoadingMessages();

    const optimistic = { question: q, answer: null, confidence: 0, source: "ai" };
    const withQ = [...messages, optimistic];
    setMessages(withQ);

    try {
      const res = await tutorService.ask({ subject, question: q });
      const finalMsg = res.data;
      const withAnswer = [...messages, finalMsg];
      setMessages(withAnswer);
      setCache(prev => ({ ...prev, [subject]: withAnswer }));
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail || "";
      if (status === 503 || detail.toLowerCase().includes("ollama") || !err.response) {
        setOllamaDown(true);
      } else if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        setError("Request timed out — Mistral is loading. Try again in 30s.");
      } else {
        setError(detail || "Failed to get an answer.");
      }
      setMessages(messages);
    } finally {
      setLoading(false);
      stopLoadingMessages();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // When user clicks a history item → populate the chat window
  const handleHistorySelect = (item) => {
    if (item.question && item.answer) {
      const alreadyInView = messages.some(m => m.question === item.question && m.answer === item.answer);
      if (!alreadyInView) {
        const updated = [...messages, { question: item.question, answer: item.answer,
                                        confidence: item.confidence, source: item.source }];
        setMessages(updated);
        setCache(prev => ({ ...prev, [subject]: updated }));
      }
    }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column",
                  height:"calc(100vh - 56px - 48px)", maxHeight:"860px" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    marginBottom:"14px", flexShrink:0 }}>
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-900">AI Tutor</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Powered by RAG + Ollama · answers from your course notes
          </p>
        </div>
        <button onClick={() => setShowHistory(p => !p)} style={{
          padding:"7px 14px", borderRadius:"10px",
          border:"1.5px solid #e2e8f0", background: showHistory ? "#eef2ff" : "white",
          color: showHistory ? "#4338ca" : "#64748b",
          fontSize:"12px", fontWeight:"600", cursor:"pointer", transition:"all 0.15s",
          display:"flex", alignItems:"center", gap:"6px",
        }}>
          💬 {showHistory ? "Hide History" : "Show History"}
        </button>
      </div>

      {/* Subject tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 shrink-0"
           style={{ scrollbarWidth:"none" }}>
        {SUBJECTS.map((s) => {
          const isActive = subject === s.id;
          return (
            <button key={s.id} onClick={() => setSubject(s.id)} style={{
              padding:"6px 14px", borderRadius:"12px",
              border: isActive ? "1px solid #4f46e5" : "1px solid #e5e7eb",
              background: isActive ? "#4f46e5" : "white",
              color:      isActive ? "#ffffff"  : "#4b5563",
              fontWeight:"600", fontSize:"14px", whiteSpace:"nowrap",
              cursor:"pointer", transition:"all 0.15s",
            }}>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Main chat area + history panel */}
      <div style={{ flex:1, display:"flex", gap:"0", minHeight:0,
                    border:"1px solid #e2e8f0", borderRadius:"20px", overflow:"hidden",
                    background:"white" }}>

        {/* History panel */}
        {showHistory && (
          <HistoryPanel
            subject={subject}
            onSelect={handleHistorySelect}
            currentMessages={messages}
          />
        )}

        {/* Chat column */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
          <ChatBox messages={messages} loading={loading} loadingMsg={loadingMsg} />

          {ollamaDown && <OllamaHelp />}

          {error && !ollamaDown && (
            <div className="mx-4 mb-2 px-3 py-2 rounded-xl text-xs"
                 style={{ background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626" }}>
              {error}
            </div>
          )}

          {/* Input bar */}
          <form onSubmit={handleSend}
                style={{ display:"flex", alignItems:"flex-end", gap:"8px",
                         padding:"12px", borderTop:"1px solid #f3f4f6", flexShrink:0 }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about ${SUBJECTS.find(s => s.id === subject)?.label}…`}
              rows={1}
              style={{
                flex:1, padding:"10px 14px", borderRadius:"12px",
                border:"1px solid #e5e7eb", background:"white",
                fontSize:"14px", resize:"none", outline:"none",
                fontFamily:"DM Sans, sans-serif",
                maxHeight:"120px", overflow:"auto",
              }}
            />
            <button type="submit" disabled={!input.trim() || loading} style={{
              width:"40px", height:"40px", borderRadius:"12px",
              background: (!input.trim() || loading) ? "#c7d2fe" : "#4f46e5",
              border:"none",
              cursor: (!input.trim() || loading) ? "not-allowed" : "pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"background 0.15s", flexShrink:0,
            }}>
              {loading ? (
                <span style={{ width:"16px", height:"16px",
                               border:"2px solid rgba(255,255,255,0.4)",
                               borderTop:"2px solid white", borderRadius:"50%",
                               display:"inline-block", animation:"spin 0.8s linear infinite" }} />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="white" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 mt-2 shrink-0">
        Confidence ≥ 70% → answer from uploaded notes · Enter to send · Shift+Enter for newline
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}