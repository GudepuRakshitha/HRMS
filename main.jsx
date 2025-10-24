// main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { ThemeProvider } from "./theme/theme.jsx";
import "./base.css";
import { BrowserRouter } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext";

localStorage.setItem("aepl.theme", "light");

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      {" "}
      {/* Keep Router here */}
      <SessionProvider>
        <ThemeProvider>
          <App /> {/* Remove Router from App.jsx */}
        </ThemeProvider>
      </SessionProvider>
    </BrowserRouter>
  </React.StrictMode>
);
