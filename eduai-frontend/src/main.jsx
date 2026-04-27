// src/main.jsx
// Vite entry point — replaces CRA's src/index.js
// Must be .jsx (not .js) since it contains JSX and Vite's plugin-react needs it.
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);