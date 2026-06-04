import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { installBrowserApi } from "./browserApi";
import "./styles.css";

installBrowserApi();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
