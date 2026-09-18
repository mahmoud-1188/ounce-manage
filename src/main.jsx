import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import CentralApp from "./app/CentralApp.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CentralApp />
  </React.StrictMode>
);
