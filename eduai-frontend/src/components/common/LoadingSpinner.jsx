// src/components/common/LoadingSpinner.jsx
import React from "react";

export function LoadingSpinner({ size = "md", text }) {
  const s = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-10 h-10" : "w-6 h-6";
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className={`${s} border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin`} />
      {text && <p className="text-sm text-gray-400">{text}</p>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-64">
      <LoadingSpinner size="lg" text="Loading…" />
    </div>
  );
}

// src/components/common/ErrorMessage.jsx
export function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
      <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <div className="flex-1">
        <span>{message}</span>
        {onRetry && (
          <button onClick={onRetry} className="ml-2 font-semibold underline hover:no-underline">
            Retry
          </button>
        )}
      </div>
    </div>
  );
}