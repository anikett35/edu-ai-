// src/components/common/StatsCard.jsx
import React from "react";

export default function StatsCard({ icon, label, value, sub, subColor = "text-gray-400", accent = false }) {
  return (
    <div className={`card flex items-start gap-4 ${accent ? "bg-primary-600 border-primary-700 text-white" : ""}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                      ${accent ? "bg-white/20" : "bg-primary-50"}`}>
        <span className={accent ? "text-white" : "text-primary-600"}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold uppercase tracking-widest mb-0.5
                      ${accent ? "text-primary-200" : "text-gray-400"}`}>
          {label}
        </p>
        <p className={`text-2xl font-display font-bold leading-none
                      ${accent ? "text-white" : "text-gray-900"}`}>
          {value}
        </p>
        {sub && (
          <p className={`text-xs mt-1 font-medium ${accent ? "text-primary-200" : subColor}`}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}