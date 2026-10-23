import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import CentralApp from "./app/CentralApp.jsx";
import { applyUiLang, readUiLang } from "./core/i18n.js";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CentralApp />
  </React.StrictMode>
);

// اللغة تفضيلٌ للجهاز: تُطبَّق بعد أول رسم فيمشي المترجم على الشاشة كاملةً
applyUiLang(readUiLang());
