import path from "node:path";
import fs from "node:fs";
import { app } from "electron";

export type StudentInput = {
  name: string;
  classId: number;
  studentNo?: string;
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

export type RecommendationInput = {
  studentId: number;
  weakTopics: string[];
};

type ClassRecord = { id: number; name: string; created_at: string };
type StudentRecord = { id: number; class_id: number; name: string; student_no?: string; created_at: string };
type AssessmentRecord = {
  id: number;
  student_id: number;
  quiz_score: number;
  operation_score: number;
  total_score: number;
  weak_topics: string[];
  created_at: string;
};
type QuizAnswerRecord = { id: number; session_id: number; question_id: string; topic: string; correct: number };
type OperationRecord = {
  id: number;
  session_id?: number;
  student_id: number;
  task_id: string;
  target_angle: number;
  achieved_angle: number;
  completed: number;
  created_at: string;
};
type ResourceRecord = {
  id: number;
  topic: string;
  title: string;
  type: string;
  content: string;
  difficulty: string;
};
type RecommendationRecord = {
  id: number;
  student_id: number;
  resource_id: number;
  reason: string;
  completed: number;
  created_at: string;
};
type DataFile = {
  counters: Record<string, number>;
  classes: ClassRecord[];
  students: StudentRecord[];
  assessment_sessions: AssessmentRecord[];
  quiz_answers: QuizAnswerRecord[];
  operation_logs: OperationRecord[];
  learning_resources: ResourceRecord[];
  resource_recommendations: RecommendationRecord[];
};

let dataPath = "";
let data: DataFile | null = null;

const resourceSeeds = [
  {
    topic: "系统结构",
    title: "线控转向系统结构复习卡",
    type: "结构复习卡",
    content: "复习上位机、CAN、VCU、转向控制器、电机和前轮之间的职责边界。",
    difficulty: "基础"
  },
  {
    topic: "CAN通信",
    title: "CAN 报文观察练习",
    type: "操作练习任务",
    content: "调整方向盘输入，记录目标角、实际角和控制状态如何在 CAN 摘要中变化。",
    difficulty: "基础"
  },
  {
    topic: "VCU功能",
    title: "VCU 指令协调短文",
    type: "短文",
    content: "理解 VCU 如何接收上位机目标、整车状态和安全约束，再下发控制目标。",
    difficulty: "进阶"
  },
  {
    topic: "闭环控制",
    title: "转向控制器闭环动画建议",
    type: "流程动画建议",
    content: "观察目标角、反馈角、误差和电机输出之间的闭环关系。",
    difficulty: "进阶"
  },
  {
    topic: "执行机构",
    title: "电机到前轮执行链拓展题",
    type: "拓展思考题",
    content: "思考电机输出角与左右前轮转角为什么需要同步且受限。",
    difficulty: "拓展"
  }
];

export function initDatabase() {
  const userData = app.getPath("userData");
  fs.mkdirSync(userData, { recursive: true });
  dataPath = path.join(userData, "steer-by-wire-learning.json");
  data = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath, "utf8")) : emptyData();
  seed();
  save();
  return dataPath;
}

function emptyData(): DataFile {
  return {
    counters: {},
    classes: [],
    students: [],
    assessment_sessions: [],
    quiz_answers: [],
    operation_logs: [],
    learning_resources: [],
    resource_recommendations: []
  };
}

function now() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function getData() {
  if (!data) throw new Error("Data store has not been initialized.");
  return data;
}

function nextId(table: keyof Omit<DataFile, "counters">) {
  const state = getData();
  state.counters[table] = (state.counters[table] ?? 0) + 1;
  return state.counters[table];
}

function save() {
  fs.writeFileSync(dataPath, JSON.stringify(getData(), null, 2), "utf8");
}

function seed() {
  const state = getData();
  if (state.classes.length === 0) {
    const classId = nextId("classes");
    state.classes.push({ id: classId, name: "智能底盘 1 班", created_at: now() });
    state.students.push(
      { id: nextId("students"), class_id: classId, name: "张明", student_no: "SBW-001", created_at: now() },
      { id: nextId("students"), class_id: classId, name: "李娜", student_no: "SBW-002", created_at: now() },
      { id: nextId("students"), class_id: classId, name: "王晨", student_no: "SBW-003", created_at: now() }
    );
  }
  if (state.learning_resources.length === 0) {
    resourceSeeds.forEach((resource) => {
      state.learning_resources.push({ id: nextId("learning_resources"), ...resource });
    });
  }
}

function className(classId: number) {
  return getData().classes.find((item) => item.id === classId)?.name ?? "未分班";
}

function studentById(studentId: number) {
  return getData().students.find((student) => student.id === studentId);
}

function assessmentRows(studentId?: number) {
  const state = getData();
  return state.assessment_sessions
    .filter((item) => !studentId || item.student_id === studentId)
    .map((item) => {
      const student = studentById(item.student_id);
      return {
        ...item,
        student_name: student?.name ?? "未知学生",
        class_name: student ? className(student.class_id) : "未分班"
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export const store = {
  listClasses() {
    return [...getData().classes].sort((a, b) => a.id - b.id);
  },

  createClass(name: string) {
    const state = getData();
    const row = { id: nextId("classes"), name: name.trim(), created_at: now() };
    state.classes.push(row);
    save();
    return row;
  },

  listStudents() {
    return [...getData().students]
      .sort((a, b) => a.id - b.id)
      .map((student) => ({ ...student, class_name: className(student.class_id) }));
  },

  createStudent(input: StudentInput) {
    const state = getData();
    const row = {
      id: nextId("students"),
      class_id: input.classId,
      name: input.name.trim(),
      student_no: input.studentNo?.trim(),
      created_at: now()
    };
    state.students.push(row);
    save();
    return { ...row, class_name: className(row.class_id) };
  },

  listResources() {
    return [...getData().learning_resources].sort((a, b) => a.id - b.id);
  },

  submitAssessment(input: AssessmentSubmitInput) {
    const state = getData();
    const sessionId = nextId("assessment_sessions");
    state.assessment_sessions.push({
      id: sessionId,
      student_id: input.studentId,
      quiz_score: input.quizScore,
      operation_score: input.operationScore,
      total_score: input.totalScore,
      weak_topics: input.weakTopics,
      created_at: now()
    });
    input.answers.forEach((answer) => {
      state.quiz_answers.push({
        id: nextId("quiz_answers"),
        session_id: sessionId,
        question_id: answer.questionId,
        topic: answer.topic,
        correct: answer.correct ? 1 : 0
      });
    });
    input.operations.forEach((operation) => {
      state.operation_logs.push({
        id: nextId("operation_logs"),
        session_id: sessionId,
        student_id: input.studentId,
        task_id: operation.taskId,
        target_angle: operation.targetAngle,
        achieved_angle: operation.achievedAngle,
        completed: operation.completed ? 1 : 0,
        created_at: now()
      });
    });
    generateRecommendations({ studentId: input.studentId, weakTopics: input.weakTopics });
    save();
    return { sessionId };
  },

  listAssessments(studentId?: number) {
    return assessmentRows(studentId);
  },

  generateRecommendations,

  listRecommendations(studentId: number) {
    const state = getData();
    return state.resource_recommendations
      .filter((item) => item.student_id === studentId)
      .map((item) => {
        const resource = state.learning_resources.find((row) => row.id === item.resource_id);
        return { ...item, ...resource };
      })
      .sort((a, b) => a.completed - b.completed || b.created_at.localeCompare(a.created_at));
  },

  completeRecommendation(id: number) {
    const item = getData().resource_recommendations.find((row) => row.id === id);
    if (item) item.completed = 1;
    save();
    return { id, completed: true };
  },

  resetDemoData() {
    data = emptyData();
    seed();
    save();
    return { ok: true };
  },

  classSummary() {
    const state = getData();
    return state.classes.map((classRow) => {
      const students = state.students.filter((student) => student.class_id === classRow.id);
      const studentIds = new Set(students.map((student) => student.id));
      const assessments = state.assessment_sessions.filter((item) => studentIds.has(item.student_id));
      const avgScore = assessments.length
        ? assessments.reduce((sum, item) => sum + item.total_score, 0) / assessments.length
        : 0;
      const completionRate = students.length ? Math.min(100, (assessments.length / students.length) * 100) : 0;
      const topicCounts = new Map<string, number>();
      assessments.forEach((item) => {
        item.weak_topics.forEach((topic) => topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1));
      });
      return {
        ...classRow,
        studentCount: students.length,
        assessmentCount: assessments.length,
        avgScore: Math.round(avgScore),
        completionRate: Math.round(completionRate),
        weakTopics: Array.from(topicCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([topic, count]) => ({ topic, count }))
      };
    });
  },

  studentDetail(studentId: number) {
    const student = studentById(studentId);
    return {
      student: student ? { ...student, class_name: className(student.class_id) } : null,
      assessments: assessmentRows(studentId),
      recommendations: store.listRecommendations(studentId)
    };
  },

  exportCsv() {
    const rows: any[] = [];
    getData().students.forEach((student) => {
      const assessments = assessmentRows(student.id);
      const base = {
        class_name: className(student.class_id),
        student_name: student.name,
        student_no: student.student_no ?? ""
      };
      if (assessments.length > 0) {
        assessments.forEach((item) => rows.push({ ...base, ...item }));
      } else {
        rows.push({
          ...base,
          id: "",
          student_id: student.id,
          quiz_score: "",
          operation_score: "",
          total_score: "",
          weak_topics: [],
          created_at: ""
        });
      }
    });
    const header = ["班级", "姓名", "学号", "测验分", "操作分", "总分", "薄弱知识点", "时间"];
    const lines = rows.map((row: any) =>
      [
        row.class_name,
        row.student_name,
        row.student_no,
        row.quiz_score,
        row.operation_score,
        row.total_score,
        Array.isArray(row.weak_topics) ? row.weak_topics.join(" / ") : "",
        row.created_at
      ]
        .map(csvEscape)
        .join(",")
    );
    return [header.map(csvEscape).join(","), ...lines].join("\n");
  }
};

function generateRecommendations(input: RecommendationInput) {
  const state = getData();
  const topics = input.weakTopics.length > 0 ? input.weakTopics : ["系统结构"];
  const resourcesForTopics = state.learning_resources.filter((resource) => topics.includes(resource.topic));
  const selected = resourcesForTopics.length > 0 ? resourcesForTopics : state.learning_resources.slice(0, 2);
  selected.forEach((resource) => {
    const exists = state.resource_recommendations.some(
      (item) => item.student_id === input.studentId && item.resource_id === resource.id
    );
    if (!exists) {
      state.resource_recommendations.push({
        id: nextId("resource_recommendations"),
        student_id: input.studentId,
        resource_id: resource.id,
        reason: `针对“${resource.topic}”知识点的个性化巩固建议`,
        completed: 0,
        created_at: now()
      });
    }
  });
  save();
  return store.listRecommendations(input.studentId);
}

function csvEscape(value: string | number) {
  const text = String(value);
  return `"${text.replaceAll("\"", "\"\"")}"`;
}
