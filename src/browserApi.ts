import type { AssessmentSubmitInput, ClassRow, RecommendationRow, StudentRow } from "./vite-env";

type AssessmentRow = {
  id: number;
  student_id: number;
  quiz_score: number;
  operation_score: number;
  total_score: number;
  weak_topics: string[];
  created_at: string;
};

type ResourceRow = {
  id: number;
  topic: string;
  title: string;
  type: string;
  content: string;
  difficulty: string;
};

type RecommendationStoreRow = {
  id: number;
  student_id: number;
  resource_id: number;
  reason: string;
  completed: number;
  created_at: string;
};

type BrowserStore = {
  counters: Record<string, number>;
  classes: ClassRow[];
  students: Array<Omit<StudentRow, "class_name">>;
  assessments: AssessmentRow[];
  resources: ResourceRow[];
  recommendations: RecommendationStoreRow[];
};

const storeKey = "sbw-teaching-sim-browser-store";

const resourceSeeds: ResourceRow[] = [
  {
    id: 1,
    topic: "系统结构",
    title: "线控转向系统结构复习卡",
    type: "结构复习卡",
    content: "复习上位机、CAN、VCU、转向控制器、电机和前轮之间的边界与连接关系。",
    difficulty: "基础"
  },
  {
    id: 2,
    topic: "CAN通信",
    title: "CAN 报文观察练习",
    type: "操作练习任务",
    content: "调整目标角，记录目标角、反馈角、误差和控制状态如何在 CAN 摘要中变化。",
    difficulty: "基础"
  },
  {
    id: 3,
    topic: "VCU功能",
    title: "VCU 指令协调短文",
    type: "短文",
    content: "理解 VCU 如何接收上位机目标、车辆状态和安全约束，再下发控制目标。",
    difficulty: "进阶"
  },
  {
    id: 4,
    topic: "闭环控制",
    title: "转向控制器闭环流程动画建议",
    type: "流程动画建议",
    content: "观察目标角、反馈角、误差和电机输出之间的闭环关系。",
    difficulty: "进阶"
  },
  {
    id: 5,
    topic: "执行机构",
    title: "电机到前轮执行链拓展思考",
    type: "拓展思考题",
    content: "思考电机输出角与上下两个前轮转角为什么需要同步且受限。",
    difficulty: "拓展"
  }
];

function now() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function createInitialStore(): BrowserStore {
  return {
    counters: {
      classes: 1,
      students: 3,
      assessments: 0,
      recommendations: 0
    },
    classes: [{ id: 1, name: "智能底盘 1 班", created_at: now() }],
    students: [
      { id: 1, class_id: 1, name: "张明", student_no: "SBW-001" },
      { id: 2, class_id: 1, name: "李娜", student_no: "SBW-002" },
      { id: 3, class_id: 1, name: "王晨", student_no: "SBW-003" }
    ],
    assessments: [],
    resources: resourceSeeds,
    recommendations: []
  };
}

function loadStore(): BrowserStore {
  const raw = localStorage.getItem(storeKey);
  if (!raw) {
    const initial = createInitialStore();
    saveStore(initial);
    return initial;
  }
  return JSON.parse(raw) as BrowserStore;
}

function saveStore(store: BrowserStore) {
  localStorage.setItem(storeKey, JSON.stringify(store));
}

function nextId(store: BrowserStore, table: keyof BrowserStore["counters"]) {
  store.counters[table] = (store.counters[table] ?? 0) + 1;
  return store.counters[table];
}

function className(store: BrowserStore, classId: number) {
  return store.classes.find((item) => item.id === classId)?.name ?? "未分班";
}

function withClassName(store: BrowserStore, student: Omit<StudentRow, "class_name">): StudentRow {
  return { ...student, class_name: className(store, student.class_id) };
}

function csvEscape(value: string | number) {
  return `"${String(value).replaceAll("\"", "\"\"")}"`;
}

function recommendationsFor(store: BrowserStore, studentId: number): RecommendationRow[] {
  return store.recommendations
    .filter((item) => item.student_id === studentId)
    .map((item) => {
      const resource = store.resources.find((row) => row.id === item.resource_id);
      return { ...item, ...resource } as RecommendationRow;
    })
    .sort((a, b) => a.completed - b.completed || (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}

export function installBrowserApi() {
  if (window.sbwApi) return;

  window.sbwApi = {
    async listClasses() {
      return [...loadStore().classes].sort((a, b) => a.id - b.id);
    },

    async createClass(name: string) {
      const store = loadStore();
      const row = { id: nextId(store, "classes"), name: name.trim(), created_at: now() };
      store.classes.push(row);
      saveStore(store);
      return row;
    },

    async listStudents() {
      const store = loadStore();
      return [...store.students].sort((a, b) => a.id - b.id).map((student) => withClassName(store, student));
    },

    async createStudent(input: { name: string; classId: number; studentNo?: string }) {
      const store = loadStore();
      const row = {
        id: nextId(store, "students"),
        class_id: input.classId,
        name: input.name.trim(),
        student_no: input.studentNo?.trim()
      };
      store.students.push(row);
      saveStore(store);
      return withClassName(store, row);
    },

    async listResources() {
      return loadStore().resources.map((resource) => ({
        ...resource,
        student_id: 0,
        resource_id: resource.id,
        reason: "内置资源",
        completed: 0
      }));
    },

    async submitAssessment(input: AssessmentSubmitInput) {
      const store = loadStore();
      const sessionId = nextId(store, "assessments");
      store.assessments.push({
        id: sessionId,
        student_id: input.studentId,
        quiz_score: input.quizScore,
        operation_score: input.operationScore,
        total_score: input.totalScore,
        weak_topics: input.weakTopics,
        created_at: now()
      });
      await window.sbwApi.generateRecommendations({ studentId: input.studentId, weakTopics: input.weakTopics });
      saveStore(store);
      return { sessionId };
    },

    async listAssessments(studentId?: number) {
      const store = loadStore();
      return store.assessments
        .filter((item) => !studentId || item.student_id === studentId)
        .map((item) => {
          const student = store.students.find((row) => row.id === item.student_id);
          return {
            ...item,
            student_name: student?.name ?? "未知学生",
            class_name: student ? className(store, student.class_id) : "未分班"
          };
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    async generateRecommendations(input: { studentId: number; weakTopics: string[] }) {
      const store = loadStore();
      const topics = input.weakTopics.length > 0 ? input.weakTopics : ["系统结构"];
      const resources = store.resources.filter((resource) => topics.includes(resource.topic));
      const selected = resources.length > 0 ? resources : store.resources.slice(0, 2);
      selected.forEach((resource) => {
        const exists = store.recommendations.some(
          (item) => item.student_id === input.studentId && item.resource_id === resource.id
        );
        if (!exists) {
          store.recommendations.push({
            id: nextId(store, "recommendations"),
            student_id: input.studentId,
            resource_id: resource.id,
            reason: `针对“${resource.topic}”知识点的个性化巩固建议`,
            completed: 0,
            created_at: now()
          });
        }
      });
      saveStore(store);
      return recommendationsFor(store, input.studentId);
    },

    async listRecommendations(studentId: number) {
      return recommendationsFor(loadStore(), studentId);
    },

    async completeRecommendation(id: number) {
      const store = loadStore();
      const item = store.recommendations.find((row) => row.id === id);
      if (item) item.completed = 1;
      saveStore(store);
      return { id, completed: true };
    },

    async classSummary() {
      const store = loadStore();
      return store.classes.map((classRow) => {
        const students = store.students.filter((student) => student.class_id === classRow.id);
        const ids = new Set(students.map((student) => student.id));
        const assessments = store.assessments.filter((item) => ids.has(item.student_id));
        const avgScore = assessments.length
          ? assessments.reduce((sum, item) => sum + item.total_score, 0) / assessments.length
          : 0;
        const topicCounts = new Map<string, number>();
        assessments.forEach((item) => {
          item.weak_topics.forEach((topic) => topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1));
        });
        return {
          ...classRow,
          studentCount: students.length,
          assessmentCount: assessments.length,
          avgScore: Math.round(avgScore),
          completionRate: students.length ? Math.round(Math.min(100, (assessments.length / students.length) * 100)) : 0,
          weakTopics: Array.from(topicCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([topic, count]) => ({ topic, count }))
        };
      });
    },

    async studentDetail(studentId: number) {
      const store = loadStore();
      const student = store.students.find((item) => item.id === studentId);
      return {
        student: student ? withClassName(store, student) : null,
        assessments: await window.sbwApi.listAssessments(studentId),
        recommendations: recommendationsFor(store, studentId)
      };
    },

    async exportCsv() {
      const store = loadStore();
      const rows = store.students.flatMap((student) => {
        const assessments = store.assessments.filter((item) => item.student_id === student.id);
        const base = [className(store, student.class_id), student.name, student.student_no ?? ""];
        if (assessments.length === 0) return [[...base, "", "", "", "", ""]];
        return assessments.map((item) => [
          ...base,
          item.quiz_score,
          item.operation_score,
          item.total_score,
          item.weak_topics.join(" / "),
          item.created_at
        ]);
      });
      const header = ["班级", "姓名", "学号", "测验分", "操作分", "总分", "薄弱知识点", "时间"];
      return [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    },

    async resetDemoData() {
      saveStore(createInitialStore());
      return { ok: true };
    }
  };
}
