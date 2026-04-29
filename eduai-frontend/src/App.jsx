// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import AppLayout     from "./components/layout/AppLayout";

// Pages
import AuthPage       from "./pages/Auth/AuthPage";
import DashboardPage  from "./pages/Dashboard/DashboardPage";
import SubjectsPage   from "./pages/Subjects/SubjectsPage";
import TutorPage      from "./pages/Tutor/TutorPage";
import QuizPage       from "./pages/Quiz/QuizPage";
import AnalyticsPage  from "./pages/Analytics/AnalyticsPage";
import UploadPage     from "./pages/Upload/UploadPage";
import ProfilePage    from "./pages/Profile/ProfilePage";
import MaterialsPage      from "./pages/Materials/MaterialsPage";
import ManageSubjectsPage  from "./pages/Subjects/ManageSubjectsPage";
import InterventionPage    from "./pages/Intervention/InterventionPage";

// ── Redirect root based on auth state ────────────────────────────────────────
function RootRedirect() {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

// ── Wrap a page in AppLayout + ProtectedRoute ─────────────────────────────────
function Page({ children, allowedRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />

          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Protected — both roles */}
          <Route path="/dashboard" element={<Page><DashboardPage /></Page>} />
          <Route path="/subjects"  element={<Page><SubjectsPage /></Page>} />
          <Route path="/analytics" element={<Page><AnalyticsPage /></Page>} />
          <Route path="/profile"   element={<Page><ProfilePage /></Page>} />

          {/* Students only */}
          <Route path="/tutor"
            element={
              <Page allowedRoles={["student"]}>
                <TutorPage />
              </Page>
            }
          />

          {/* Quiz — both roles (teacher can view questions, student takes quiz) */}
          <Route path="/quiz" element={<Page><QuizPage /></Page>} />

          {/* Materials — both roles */}
          <Route path="/materials" element={<Page><MaterialsPage /></Page>} />

          {/* Intervention — both roles */}
          <Route path="/intervention" element={<Page><InterventionPage /></Page>} />

          {/* Manage subjects — teacher only */}
          <Route path="/manage-subjects"
            element={
              <Page allowedRoles={["teacher"]}>
                <ManageSubjectsPage />
              </Page>
            }
          />

          {/* Teachers only */}
          <Route path="/upload"
            element={
              <Page allowedRoles={["teacher"]}>
                <UploadPage />
              </Page>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}