// src/pages/Dashboard/DashboardPage.jsx
import React from "react";
import { useAuth } from "../../context/AuthContext";
import StudentDashboard from "./StudentDashboard";
import TeacherDashboard from "./TeacherDashboard";

export default function DashboardPage() {
  const { user } = useAuth();
  return user?.role === "teacher" ? <TeacherDashboard /> : <StudentDashboard />;
}