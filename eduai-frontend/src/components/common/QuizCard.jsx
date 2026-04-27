// src/components/common/QuizCard.jsx
import React from "react";

const difficultyColors = {
  easy:   "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  hard:   "bg-red-100 text-red-700",
};

export default function QuizCard({
  question,
  options,
  difficulty,
  index,
  total,
  selected,
  onSelect,
  result,         // null | { correct: bool, correct_answer: string }
}) {
  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Question {index + 1} of {total}
          </span>
          <span className={`badge ${difficultyColors[difficulty] || "badge-purple"}`}>
            {difficulty}
          </span>
        </div>
        {result && (
          result.correct
            ? <span className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Correct
              </span>
            : <span className="flex items-center gap-1 text-red-500 text-sm font-semibold">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Incorrect
              </span>
        )}
      </div>

      {/* Question text */}
      <p className="font-display font-semibold text-gray-900 text-base mb-4 leading-snug">
        {question}
      </p>

      {/* Options */}
      <div className="space-y-2.5">
        {options.map((opt, i) => {
          const isSelected = selected === opt;
          const isCorrect  = result?.correct_answer === opt;
          const isWrong    = result && isSelected && !isCorrect;

          let base = "flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer";
          let style = "";

          if (result) {
            if (isCorrect) style = "border-green-400 bg-green-50 text-green-800";
            else if (isWrong) style = "border-red-400 bg-red-50 text-red-700";
            else style = "border-gray-100 text-gray-500 cursor-default";
          } else {
            style = isSelected
              ? "border-primary-500 bg-primary-50 text-primary-800 shadow-glow"
              : "border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-primary-50/40";
          }

          return (
            <button
              key={i}
              className={`${base} ${style}`}
              onClick={() => !result && onSelect(opt)}
              disabled={!!result}
            >
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                               ${isSelected || isCorrect ? "border-primary-500" : "border-gray-300"}`}>
                {(isSelected || (result && isCorrect)) && (
                  <span className={`w-2.5 h-2.5 rounded-full ${isCorrect ? "bg-green-500" : isWrong ? "bg-red-500" : "bg-primary-600"}`} />
                )}
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {/* Post-submit explanation */}
      {result && !result.correct && result.correct_answer && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-xs font-semibold text-blue-700 mb-0.5">Correct Answer</p>
          <p className="text-sm text-blue-800">{result.correct_answer}</p>
        </div>
      )}
    </div>
  );
}