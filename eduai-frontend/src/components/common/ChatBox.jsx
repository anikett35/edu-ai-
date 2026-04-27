// src/components/common/ChatBox.jsx
import React, { useEffect, useRef } from "react";

function ConfidencePill({ value }) {
  const pct   = Math.round((value || 0) * 100);
  const style = pct >= 70
    ? { background: "#dcfce7", color: "#15803d" }
    : pct >= 40
    ? { background: "#fef9c3", color: "#a16207" }
    : { background: "#f3f4f6", color: "#6b7280" };
  return (
    <span style={{
      ...style,
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "2px 8px", borderRadius: "999px",
      fontSize: "11px", fontWeight: "600",
    }}>
      {pct}% confidence
    </span>
  );
}

function SourcePill({ source }) {
  const isNotes = source === "notes";
  return (
    <span style={{
      background: isNotes ? "#e0e7ff" : "#f3e8ff",
      color:      isNotes ? "#4338ca" : "#7e22ce",
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "2px 8px", borderRadius: "999px",
      fontSize: "11px", fontWeight: "600",
    }}>
      {isNotes ? "📄 From Notes" : "🤖 AI Knowledge"}
    </span>
  );
}

// AI avatar icon
function AIAvatar() {
  return (
    <div style={{
      width: "32px", height: "32px", borderRadius: "10px",
      background: "#eef2ff", display: "flex", alignItems: "center",
      justifyContent: "center", flexShrink: 0, marginTop: "4px",
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
      </svg>
    </div>
  );
}

export default function ChatBox({ messages, loading, loadingMsg }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Empty state
  if (messages.length === 0 && !loading) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: "12px", textAlign: "center", padding: "48px 24px",
      }}>
        <div style={{
          width: "64px", height: "64px", borderRadius: "16px",
          background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
          </svg>
        </div>
        <p style={{ fontFamily: "Sora, sans-serif", fontWeight: "600", color: "#374151", margin: 0 }}>
          Ask your AI Tutor anything
        </p>
        <p style={{ fontSize: "14px", color: "#9ca3af", maxWidth: "280px", margin: 0, lineHeight: "1.5" }}>
          Type a question below. The AI will answer using your uploaded course notes when possible.
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {messages.map((msg, i) => (
        <div key={i}>
          {/* User question bubble — always show */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
            <div style={{
              maxWidth: "70%",
              background: "#4f46e5",
              color: "white",
              padding: "10px 14px",
              borderRadius: "16px 16px 4px 16px",
              fontSize: "14px",
              fontWeight: "500",
              lineHeight: "1.5",
              boxShadow: "0 2px 8px rgba(79,70,229,0.2)",
            }}>
              {msg.question}
            </div>
          </div>

          {/* AI answer — only if we have it */}
          {msg.answer ? (
            <div style={{ display: "flex", justifyContent: "flex-start", gap: "10px" }}>
              <AIAvatar />
              <div style={{ maxWidth: "70%" }}>
                <div style={{
                  background: "white",
                  border: "1px solid #f3f4f6",
                  borderRadius: "4px 16px 16px 16px",
                  padding: "12px 14px",
                  fontSize: "14px",
                  color: "#374151",
                  lineHeight: "1.6",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}>
                  {msg.answer}
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px", paddingLeft: "4px", flexWrap: "wrap" }}>
                  <ConfidencePill value={msg.confidence} />
                  <SourcePill source={msg.source} />
                </div>
              </div>
            </div>
          ) : (
            /* Loading dots while waiting for answer */
            <div style={{ display: "flex", justifyContent: "flex-start", gap: "10px" }}>
              <AIAvatar />
              <div style={{
                background: "white",
                border: "1px solid #f3f4f6",
                borderRadius: "4px 16px 16px 16px",
                padding: "14px 18px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                display: "flex", flexDirection: "column", gap: "6px",
              }}>
                <div style={{ display:"flex", gap:"5px", alignItems:"center" }}>
                  {[0, 0.2, 0.4].map((delay, j) => (
                    <span key={j} style={{
                      width:"8px", height:"8px",
                      borderRadius:"50%", background:"#818cf8",
                      display:"inline-block",
                      animation:`pulse 1.4s ease-in-out ${delay}s infinite`,
                    }} />
                  ))}
                </div>
                {loadingMsg && (
                  <p style={{ fontSize:"11px", color:"#6366f1", margin:0, fontStyle:"italic" }}>
                    {loadingMsg}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Extra loading indicator when sending */}
      {loading && messages.length > 0 && messages[messages.length - 1]?.answer !== null && (
        <div style={{ display: "flex", justifyContent: "flex-start", gap: "10px" }}>
          <AIAvatar />
          <div style={{
            background: "white", border: "1px solid #f3f4f6",
            borderRadius: "4px 16px 16px 16px", padding: "14px 18px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            display: "flex", gap: "5px", alignItems: "center",
          }}>
            {[0, 0.2, 0.4].map((delay, j) => (
              <span key={j} style={{
                width: "8px", height: "8px", borderRadius: "50%", background: "#818cf8",
                display: "inline-block",
                animation: `pulse 1.4s ease-in-out ${delay}s infinite`,
              }} />
            ))}
          </div>
        </div>
      )}

      <div ref={bottomRef} />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}