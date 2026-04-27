// src/components/layout/AppLayout.jsx
import React from "react";
import Sidebar from "./Sidebar";
import Navbar  from "./Navbar";

export default function AppLayout({ children }) {
  return (
    <div className="flex h-screen bg-surface">
      <Sidebar />
      <div className="flex flex-col flex-1 ml-56 min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}