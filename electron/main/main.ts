import { BrowserWindow, app, ipcMain } from "electron";
import path from "node:path";
import { initDatabase, store } from "./database";

const isDev = process.env.npm_lifecycle_event === "dev" || Boolean(process.env.VITE_DEV_SERVER_URL);

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    title: "汽车线控底盘转向系统教学仿真",
    backgroundColor: "#f5f7fb",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5173");
  } else {
    win.loadFile(path.join(__dirname, "../../dist-renderer/index.html"));
  }
}

app.whenReady().then(() => {
  initDatabase();
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function registerIpc() {
  ipcMain.handle("class:list", () => store.listClasses());
  ipcMain.handle("class:create", (_event, name: string) => store.createClass(name));
  ipcMain.handle("student:list", () => store.listStudents());
  ipcMain.handle("student:create", (_event, input) => store.createStudent(input));
  ipcMain.handle("resource:list", () => store.listResources());
  ipcMain.handle("assessment:submit", (_event, input) => store.submitAssessment(input));
  ipcMain.handle("assessment:list", (_event, studentId?: number) => store.listAssessments(studentId));
  ipcMain.handle("recommendation:generate", (_event, input) => store.generateRecommendations(input));
  ipcMain.handle("recommendation:list", (_event, studentId: number) => store.listRecommendations(studentId));
  ipcMain.handle("recommendation:complete", (_event, id: number) => store.completeRecommendation(id));
  ipcMain.handle("report:classSummary", () => store.classSummary());
  ipcMain.handle("report:studentDetail", (_event, studentId: number) => store.studentDetail(studentId));
  ipcMain.handle("report:exportCsv", () => store.exportCsv());
  ipcMain.handle("demo:reset", () => store.resetDemoData());
}
