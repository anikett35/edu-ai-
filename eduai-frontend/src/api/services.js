// src/api/services.js
// All API calls mapped strictly to backend routes — no invented endpoints.
import api from "./axios";

// ══════════════════════════════════════════════════════════════════════════════
// AUTH  →  /auth/*
// ══════════════════════════════════════════════════════════════════════════════
export const authService = {
  register: (data) => api.post("/auth/register", data),
  login:    (data) => api.post("/auth/login",    data),
};

// ══════════════════════════════════════════════════════════════════════════════
// TEACHER  →  /teacher/*
// ══════════════════════════════════════════════════════════════════════════════
export const teacherService = {
  uploadMaterial:     (formData) =>
    api.post("/teacher/upload-material", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  createQuiz:         (data)    => api.post("/teacher/create-quiz", data),
  listMaterials:      ()        => api.get("/teacher/materials"),
  // Both roles can access these:
  materialsBySubject: (subject) => api.get(`/teacher/materials/subject/${subject}`),
  summarize:          (id)      => api.post(`/teacher/summarize/${id}`, {}, { timeout: 180000 }),
  // Quiz bulk upload
  downloadQuizTemplate: ()         => api.get("/teacher/quiz-template", { responseType: "blob" }),
  bulkUploadQuiz:       (formData) => api.post("/teacher/quiz-bulk-upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
};

// ══════════════════════════════════════════════════════════════════════════════
// AI TUTOR  →  /tutor/*
// ══════════════════════════════════════════════════════════════════════════════
export const tutorService = {
  ask:        (data)    => api.post("/tutor/ask",                   data),
  history:    (subject, params) =>
    api.get(`/tutor/history/${subject}`, { params }),
};

// ══════════════════════════════════════════════════════════════════════════════
// QUIZ  →  /quiz/*
// ══════════════════════════════════════════════════════════════════════════════
export const quizService = {
  generate:   (data)      => api.post("/quiz/generate",              data),
  submit:     (data)      => api.post("/quiz/submit",                data),
  history:    (studentId, params) =>
    api.get(`/quiz/history/${studentId}`, { params }),
  questions:  (subject)   => api.get("/quiz/questions",  { params: { subject } }),
};

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS  →  /analytics/*
// ══════════════════════════════════════════════════════════════════════════════
export const analyticsService = {
  performance: (studentId) => api.get(`/analytics/performance/${studentId}`),
  subjects:    (studentId) => api.get(`/analytics/subjects/${studentId}`),
  summary:     (studentId) => api.get(`/analytics/summary/${studentId}`),
  leaderboard: (subject)   => api.get("/analytics/leaderboard", { params: subject ? { subject } : {} }),
};

// ══════════════════════════════════════════════════════════════════════════════
// SUBJECTS  →  /subjects/*
// ══════════════════════════════════════════════════════════════════════════════
export const subjectsService = {
  list:      (semester)   => api.get("/subjects", { params: semester ? { semester } : {} }),
  semesters: ()           => api.get("/subjects/semesters"),
  get:       (id)         => api.get(`/subjects/${id}`),
  myList:    ()           => api.get("/subjects/my/list"),
  create:    (data)       => api.post("/subjects", data),
  update:    (id, data)   => api.put(`/subjects/${id}`, data),
  delete:    (id)         => api.delete(`/subjects/${id}`),
};

// ══════════════════════════════════════════════════════════════════════════════
// ML  →  /ml/*
// ══════════════════════════════════════════════════════════════════════════════
export const mlService = {
  predictScore: (data) => api.post("/ml/predict-score", data),
};