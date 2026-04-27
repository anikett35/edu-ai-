# EduAI Frontend — Vite + React 18

React 18 + Vite frontend for the EduAI AI Teaching Assistant backend.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (optional for local dev)
cp .env.example .env
# VITE_API_URL is empty by default — Vite proxy handles backend routing

# 3. Start development server
npm run dev
# Opens at http://localhost:3000

# 4. Build for production
npm run build

# 5. Preview production build locally
npm run preview
```

---

## Why Vite over CRA?

| | CRA (react-scripts) | Vite |
|---|---|---|
| Dev server start | ~10–15s | ~300ms |
| HMR (hot reload) | Slow (webpack) | Instant (ESM native) |
| Build output | Larger | Tree-shaken, chunked |
| Config | Hidden (react-scripts) | Full control (vite.config.js) |
| Env prefix | `REACT_APP_` | `VITE_` |
| Entry point | `src/index.js` | `src/main.jsx` |
| HTML template | `public/index.html` | `index.html` (project root) |

---

## Key Differences from CRA

### Entry point
```
CRA:  src/index.js  →  ReactDOM.render()
Vite: src/main.jsx  →  ReactDOM.createRoot()  (already React 18)
```

### Environment variables
```
CRA:   process.env.REACT_APP_API_URL
Vite:  import.meta.env.VITE_API_URL
```

### index.html location
```
CRA:   public/index.html  (static, injected by webpack)
Vite:  index.html         (project root, Vite transforms it directly)
```

### Dev proxy (replaces CORS config)
Configured in `vite.config.js → server.proxy`.  
All `/auth`, `/tutor`, `/quiz`, `/teacher`, `/analytics`, `/ml` requests
are automatically forwarded to `http://localhost:8000` — no CORS header changes needed on the backend.

---

## Project Structure

```
eduai-frontend/
├── index.html              ← Vite HTML template (project root)
├── vite.config.js          ← Vite config: plugins, proxy, build, aliases
├── tailwind.config.js
├── postcss.config.js
├── .eslintrc.cjs
├── .env.example
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx            ← Vite entry point
    ├── App.jsx             ← Router + AuthProvider
    ├── index.css           ← Tailwind + Google Fonts + custom classes
    ├── api/
    │   ├── axios.js        ← Axios instance (uses import.meta.env)
    │   └── services.js     ← All backend API calls
    ├── context/
    │   └── AuthContext.jsx
    ├── components/
    │   ├── layout/         ← AppLayout, Sidebar, Navbar
    │   └── common/         ← ChatBox, QuizCard, FileUpload, StatsCard…
    └── pages/
        ├── Auth/
        ├── Dashboard/      ← Student + Teacher dashboards
        ├── Subjects/
        ├── Tutor/
        ├── Quiz/
        ├── Upload/
        ├── Analytics/
        └── Profile/
```

---

## Tech Stack

| Library | Version | Purpose |
|---|---|---|
| Vite | 5.3 | Build tool + dev server |
| @vitejs/plugin-react | 4.3 | React JSX transform + HMR |
| React | 18.3 | UI framework |
| React Router DOM | 6.x | Client-side routing |
| Axios | 1.7 | HTTP client + JWT interceptor |
| Recharts | 2.12 | Analytics charts |
| Tailwind CSS | 3.4 | Utility-first styling |

---

## Production Deployment

```bash
npm run build
# Output: /dist — deploy to Vercel, Netlify, S3, or any static host
```

Set `VITE_API_URL=https://your-backend.com` in your hosting platform's environment variables.