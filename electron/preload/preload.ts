import { contextBridge, ipcRenderer } from "electron";

const api = {
  listClasses: () => ipcRenderer.invoke("class:list"),
  createClass: (name: string) => ipcRenderer.invoke("class:create", name),
  listStudents: () => ipcRenderer.invoke("student:list"),
  createStudent: (input: { name: string; classId: number; studentNo?: string }) =>
    ipcRenderer.invoke("student:create", input),
  listResources: () => ipcRenderer.invoke("resource:list"),
  submitAssessment: (input: unknown) => ipcRenderer.invoke("assessment:submit", input),
  listAssessments: (studentId?: number) => ipcRenderer.invoke("assessment:list", studentId),
  generateRecommendations: (input: unknown) => ipcRenderer.invoke("recommendation:generate", input),
  listRecommendations: (studentId: number) => ipcRenderer.invoke("recommendation:list", studentId),
  completeRecommendation: (id: number) => ipcRenderer.invoke("recommendation:complete", id),
  classSummary: () => ipcRenderer.invoke("report:classSummary"),
  studentDetail: (studentId: number) => ipcRenderer.invoke("report:studentDetail", studentId),
  exportCsv: () => ipcRenderer.invoke("report:exportCsv"),
  resetDemoData: () => ipcRenderer.invoke("demo:reset")
};

contextBridge.exposeInMainWorld("sbwApi", api);
