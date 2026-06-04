/// <reference types="vite/client" />

export type ClassRow = {
  id: number;
  name: string;
  created_at: string;
};

export type StudentRow = {
  id: number;
  class_id: number;
  class_name: string;
  name: string;
  student_no?: string;
};

export type RecommendationRow = {
  id: number;
  student_id: number;
  resource_id: number;
  reason: string;
  completed: number;
  topic: string;
  title: string;
  type: string;
  content: string;
  difficulty: string;
  created_at?: string;
};

export type AssessmentSubmitInput = {
  studentId: number;
  quizScore: number;
  operationScore: number;
  totalScore: number;
  weakTopics: string[];
  answers: Array<{ questionId: string; topic: string; correct: boolean }>;
  operations: Array<{ taskId: string; targetAngle: number; achievedAngle: number; completed: boolean }>;
};

declare global {
  interface Window {
    sbwApi: {
      listClasses: () => Promise<ClassRow[]>;
      createClass: (name: string) => Promise<ClassRow>;
      listStudents: () => Promise<StudentRow[]>;
      createStudent: (input: { name: string; classId: number; studentNo?: string }) => Promise<StudentRow>;
      listResources: () => Promise<RecommendationRow[]>;
      submitAssessment: (input: AssessmentSubmitInput) => Promise<{ sessionId: number }>;
      listAssessments: (studentId?: number) => Promise<any[]>;
      generateRecommendations: (input: { studentId: number; weakTopics: string[] }) => Promise<RecommendationRow[]>;
      listRecommendations: (studentId: number) => Promise<RecommendationRow[]>;
      completeRecommendation: (id: number) => Promise<{ id: number; completed: boolean }>;
      classSummary: () => Promise<any[]>;
      studentDetail: (studentId: number) => Promise<any>;
      exportCsv: () => Promise<string>;
      resetDemoData: () => Promise<{ ok: boolean }>;
    };
  }
}
