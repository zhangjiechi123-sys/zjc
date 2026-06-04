import type React from "react";
import { useEffect, useState } from "react";
import {
  Activity,
  BookOpen,
  CheckCircle2,
  Database,
  Download,
  GraduationCap,
  Gauge,
  Pause,
  Play,
  Plus,
  RotateCcw,
  School,
  Users
} from "lucide-react";
import type { AssessmentSubmitInput, ClassRow, RecommendationRow, StudentRow } from "./vite-env";

type ViewMode = "student" | "teacher";
type TopicScore = Record<string, number>;
type ModuleId = "host" | "can" | "vcu" | "controller" | "motor" | "wheels";

type QuizQuestion = {
  id: string;
  topic: string;
  question: string;
  options: string[];
  answer: number;
};

const quizQuestions: QuizQuestion[] = [
  {
    id: "q-structure",
    topic: "系统结构",
    question: "线控转向链路中，哪个模块位于底盘外并下发转向目标？",
    options: ["上位机", "转向电机", "左前轮", "转向控制器"],
    answer: 0
  },
  {
    id: "q-can",
    topic: "CAN通信",
    question: "转向目标在 VCU 与控制器之间主要通过什么通道传递？",
    options: ["液压管路", "CAN 总线", "机械拉杆", "轮胎接地力"],
    answer: 1
  },
  {
    id: "q-vcu",
    topic: "VCU功能",
    question: "VCU 在教学模型中的主要作用是什么？",
    options: ["直接旋转前轮", "协调目标角与安全状态", "存储学生答案", "显示雷达图"],
    answer: 1
  },
  {
    id: "q-loop",
    topic: "闭环控制",
    question: "转向控制器闭环调节关注的关键量是？",
    options: ["车身颜色", "目标角与反馈角误差", "学生姓名", "班级人数"],
    answer: 1
  },
  {
    id: "q-actuator",
    topic: "执行机构",
    question: "转向电机输出变化后，最直接可观察的执行结果是？",
    options: ["前轮转角改变", "上位机位置改变", "数据库清空", "CAN 总线消失"],
    answer: 0
  }
];

const operationTasks = [
  { id: "left-20", label: "左转 20 度并观察 CAN 摘要", targetAngle: -20, topic: "CAN通信" },
  { id: "right-25", label: "右转 25 度并让控制器进入跟踪状态", targetAngle: 25, topic: "闭环控制" },
  { id: "center", label: "回正至 0 度，确认前轮同步", targetAngle: 0, topic: "执行机构" }
];

const topicOrder = ["系统结构", "CAN通信", "VCU功能", "闭环控制", "执行机构"];

const moduleDetails: Record<ModuleId, {
  name: string;
  role: string;
  input: string;
  output: string;
  faults: string[];
}> = {
  host: {
    name: "上位机",
    role: "位于底盘外，用来下发教学转向目标、显示系统状态并记录实验过程。",
    input: "学生设定的方向盘角度、实验模式、故障开关。",
    output: "目标转角指令、状态查询指令。",
    faults: ["指令超范围", "通信超时", "目标角变化过快"]
  },
  can: {
    name: "CAN 总线",
    role: "在线控系统中传递目标角、反馈角、控制状态和故障状态。",
    input: "上位机指令、VCU 校验结果、控制器反馈帧。",
    output: "周期报文、事件报文、故障报文。",
    faults: ["丢帧", "延迟增大", "报文 ID 冲突"]
  },
  vcu: {
    name: "VCU",
    role: "负责目标协调和安全校验，判断转向请求是否允许下发。",
    input: "上位机目标角、车辆状态、CAN 报文。",
    output: "校验后的目标角、降级或禁止指令。",
    faults: ["安全策略触发", "状态量异常", "目标协调失败"]
  },
  controller: {
    name: "转向控制器",
    role: "比较目标角和反馈角，执行闭环控制并驱动转向电机。",
    input: "VCU 目标角、前轮/电机反馈角。",
    output: "电机驱动命令、控制状态、误差信息。",
    faults: ["闭环振荡", "跟踪误差过大", "控制器降级"]
  },
  motor: {
    name: "转向电机",
    role: "把控制器的电信号转化为执行机构的机械输出。",
    input: "电机驱动命令、限幅/限扭策略。",
    output: "电机输出角、执行扭矩状态。",
    faults: ["限扭", "过热", "输出受限"]
  },
  wheels: {
    name: "前轮与转向执行机构",
    role: "将电机输出转化为左右前轮同步转角，是学生最直观看到的执行结果。",
    input: "电机输出、转向机构传动。",
    output: "左右前轮实际转角、反馈角。",
    faults: ["左右轮不同步", "转角受限", "反馈传感器偏差"]
  }
};

export function App() {
  const [view, setView] = useState<ViewMode>("student");
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void load();
  }, [refreshKey]);

  async function load() {
    const [classRows, studentRows] = await Promise.all([window.sbwApi.listClasses(), window.sbwApi.listStudents()]);
    setClasses(classRows);
    setStudents(studentRows);
    setSelectedStudentId((current) => current ?? studentRows[0]?.id ?? null);
  }

  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? students[0];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">Steer-by-Wire Teaching Lab</div>
          <h1>汽车线控底盘转向系统教学仿真</h1>
        </div>
        <nav className="mode-switch" aria-label="视图切换">
          <button className={view === "student" ? "active" : ""} onClick={() => setView("student")}>
            <GraduationCap size={18} /> 学生学习
          </button>
          <button className={view === "teacher" ? "active" : ""} onClick={() => setView("teacher")}>
            <School size={18} /> 教师后台
          </button>
        </nav>
      </header>

      {view === "student" ? (
        <StudentSimulator
          students={students}
          selectedStudent={selectedStudent}
          onSelectStudent={setSelectedStudentId}
          onChanged={() => setRefreshKey((value) => value + 1)}
        />
      ) : (
        <TeacherDashboard
          classes={classes}
          students={students}
          onChanged={() => setRefreshKey((value) => value + 1)}
        />
      )}
    </div>
  );
}

function StudentSimulator({
  students,
  selectedStudent,
  onSelectStudent,
  onChanged
}: {
  students: StudentRow[];
  selectedStudent?: StudentRow;
  onSelectStudent: (id: number) => void;
  onChanged: () => void;
}) {
  const [steerAngle, setSteerAngle] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [faultMode, setFaultMode] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [operationDone, setOperationDone] = useState<Record<string, boolean>>({});
  const [selectedModuleId, setSelectedModuleId] = useState<ModuleId>("host");
  const [evaluation, setEvaluation] = useState<{
    totalScore: number;
    quizScore: number;
    operationScore: number;
    weakTopics: string[];
    topicScores: TopicScore;
  } | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationRow[]>([]);

  useEffect(() => {
    if (!selectedStudent) return;
    void window.sbwApi.listRecommendations(selectedStudent.id).then(setRecommendations);
  }, [selectedStudent?.id]);

  const actualAngle = faultMode ? Math.round(steerAngle * 0.55) : steerAngle;
  const motorAngle = Math.round(actualAngle * 14);
  const signalStep = playing ? Math.min(5, Math.floor((Math.abs(steerAngle) / 36) * 5) + 1) : 0;
  const controllerState = faultMode
    ? "降级跟踪：执行角受限"
    : Math.abs(steerAngle - actualAngle) <= 2
      ? "闭环稳定"
      : "跟踪调整中";

  function reset() {
    setSteerAngle(0);
    setPlaying(true);
    setFaultMode(false);
    setOperationDone({});
    setEvaluation(null);
  }

  function tryCompleteTask(taskId: string, targetAngle: number) {
    const completed = Math.abs(actualAngle - targetAngle) <= 3;
    setOperationDone((current) => ({ ...current, [taskId]: completed }));
  }

  async function submitAssessment() {
    if (!selectedStudent) return;
    const answerDetails = quizQuestions.map((question) => ({
      questionId: question.id,
      topic: question.topic,
      correct: answers[question.id] === question.answer
    }));
    const quizScore = Math.round((answerDetails.filter((answer) => answer.correct).length / quizQuestions.length) * 100);
    const operationDetails = operationTasks.map((task) => ({
      taskId: task.id,
      targetAngle: task.targetAngle,
      achievedAngle: actualAngle,
      completed: Boolean(operationDone[task.id])
    }));
    const operationScore = Math.round(
      (operationDetails.filter((operation) => operation.completed).length / operationTasks.length) * 100
    );
    const topicScores = scoreTopics(answerDetails, operationDetails);
    const weakTopics = topicOrder.filter((topic) => topicScores[topic] < 70);
    const totalScore = Math.round(quizScore * 0.6 + operationScore * 0.4);
    const payload: AssessmentSubmitInput = {
      studentId: selectedStudent.id,
      quizScore,
      operationScore,
      totalScore,
      weakTopics,
      answers: answerDetails,
      operations: operationDetails
    };
    await window.sbwApi.submitAssessment(payload);
    const nextRecommendations = await window.sbwApi.generateRecommendations({
      studentId: selectedStudent.id,
      weakTopics
    });
    setEvaluation({ totalScore, quizScore, operationScore, weakTopics, topicScores });
    setRecommendations(nextRecommendations);
    onChanged();
  }

  return (
    <main className="workspace">
      <section className="sim-column">
        <div className="panel toolbar-panel">
          <label>
            学生
            <select value={selectedStudent?.id ?? ""} onChange={(event) => onSelectStudent(Number(event.target.value))}>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.class_name} / {student.name}
                </option>
              ))}
            </select>
          </label>
          <div className="sim-actions">
            <button onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={17} /> : <Play size={17} />}</button>
            <button onClick={reset}>
              <RotateCcw size={17} />
            </button>
            <label className="toggle">
              <input type="checkbox" checked={faultMode} onChange={(event) => setFaultMode(event.target.checked)} />
              故障/延迟观察
            </label>
          </div>
        </div>

        <section className="sim-board">
          <SystemDiagram
            steerAngle={steerAngle}
            actualAngle={actualAngle}
            motorAngle={motorAngle}
            signalStep={signalStep}
            controllerState={controllerState}
            selectedModuleId={selectedModuleId}
            onSelectModule={setSelectedModuleId}
          />
        </section>

        <section className="panel control-panel">
          <div>
            <h2>转向操作台</h2>
            <p>拖动目标角，观察 CAN 信号、控制器、电机和前轮同步变化。</p>
          </div>
          <div className="steering-console">
            <div className="wheel-dial" style={{ transform: `rotate(${steerAngle * 3}deg)` }}>
              <div className="wheel-spoke" />
            </div>
            <div className="slider-block">
              <input
                aria-label="目标转向角"
                type="range"
                min="-36"
                max="36"
                value={steerAngle}
                onChange={(event) => setSteerAngle(Number(event.target.value))}
              />
              <div className="readouts">
                <span>目标角 {steerAngle}°</span>
                <span>前轮角 {actualAngle}°</span>
                <span>电机输出 {motorAngle}°</span>
              </div>
            </div>
          </div>
        </section>
      </section>

      <aside className="learning-column">
        <ModuleDetailPanel moduleId={selectedModuleId} />
        <OperationGuide steerAngle={steerAngle} actualAngle={actualAngle} motorAngle={motorAngle} controllerState={controllerState} />
        <CanMessagePanel steerAngle={steerAngle} actualAngle={actualAngle} controllerState={controllerState} faultMode={faultMode} />
        <AssessmentPanel
          answers={answers}
          onAnswer={(questionId, optionIndex) => setAnswers((current) => ({ ...current, [questionId]: optionIndex }))}
          operationDone={operationDone}
          actualAngle={actualAngle}
          onTryCompleteTask={tryCompleteTask}
          onSubmit={submitAssessment}
          evaluation={evaluation}
          recommendations={recommendations}
          onRecommendationDone={async (id) => {
            await window.sbwApi.completeRecommendation(id);
            if (selectedStudent) {
              setRecommendations(await window.sbwApi.listRecommendations(selectedStudent.id));
            }
          }}
        />
      </aside>
    </main>
  );
}

function SystemDiagram({
  steerAngle,
  actualAngle,
  motorAngle,
  signalStep,
  controllerState,
  selectedModuleId,
  onSelectModule
}: {
  steerAngle: number;
  actualAngle: number;
  motorAngle: number;
  signalStep: number;
  controllerState: string;
  selectedModuleId: ModuleId;
  onSelectModule: (moduleId: ModuleId) => void;
}) {
  const active = (step: number) => signalStep >= step;
  const direction = steerAngle < 0 ? "左转" : steerAngle > 0 ? "右转" : "回正";
  const nodeClass = (moduleId: ModuleId) => `icon-node ${selectedModuleId === moduleId ? "selected" : ""}`;
  return (
    <svg className="system-svg chassis-svg" viewBox="0 0 980 540" role="img" aria-label="线控底盘转向系统结构示意图">
      <defs>
        <marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="2.5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,5 L6,2.5 z" fill="#2d6cdf" />
        </marker>
        <marker id="feedbackArrow" markerWidth="7" markerHeight="7" refX="6" refY="2.5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,5 L6,2.5 z" fill="#30a46c" />
        </marker>
      </defs>

      <path className="chassis-outline" d="M146 80 L738 80 C842 80 914 172 936 270 C914 368 842 460 738 460 L146 460 C88 460 48 416 48 356 L48 184 C48 124 88 80 146 80 Z" />
      <path className="chassis-nose" d="M846 126 C902 188 924 238 932 270 C924 302 902 352 846 414" />
      <path className="chassis-center" d="M136 164 L760 164 M136 376 L760 376 M300 100 L300 440 M600 100 L600 440" />
      <path className="front-subframe" d="M760 138 L760 402" />
      <path className="rear-subframe" d="M122 170 L122 370" />

      <path d="M210 270 C270 270 326 270 370 270" className={active(1) ? "flow active" : "flow"} markerEnd="url(#arrow)" />
      <path d="M488 252 C544 218 586 190 622 178" className={active(2) ? "flow active" : "flow"} markerEnd="url(#arrow)" />
      <path d="M682 220 C700 270 700 314 682 364" className={active(3) ? "flow active" : "flow"} markerEnd="url(#arrow)" />
      <path d="M748 374 C786 350 808 324 822 296" className={active(4) ? "flow active" : "flow"} markerEnd="url(#arrow)" />
      <path d="M884 270 C910 222 902 176 874 146" className={active(5) ? "flow active" : "flow"} markerEnd="url(#arrow)" />
      <path d="M884 270 C910 318 902 364 874 394" className={active(5) ? "flow active" : "flow"} markerEnd="url(#arrow)" />
      <path d="M836 114 C660 52 398 76 246 182" className="feedback-flow" markerEnd="url(#feedbackArrow)" />
      <path d="M836 426 C660 492 398 470 246 350" className="feedback-flow" markerEnd="url(#feedbackArrow)" />

      <g className={nodeClass("host")} onClick={() => onSelectModule("host")} tabIndex={0} role="button" aria-label="上位机">
        <path d="M82 228 L196 228 C204 228 210 234 210 242 L210 302 L76 302 L76 242 C76 234 82 228 82 228 Z" className="host-lid" />
        <rect x="101" y="240" width="88" height="50" rx="5" className="screen-fill" />
        <path d="M76 302 L210 302 L186 328 L100 328 Z" className="host-keyboard" />
        <path d="M102 312 L176 312 M114 320 L164 320" className="keyboard-line" />
        <path d="M116 255 L174 255 M116 268 L158 268 M116 281 L181 281" className="screen-line" />
        <text x="145" y="354" textAnchor="middle">上位机</text>
      </g>

      <g className={nodeClass("can")} onClick={() => onSelectModule("can")} tabIndex={0} role="button" aria-label="CAN 总线">
        <path d="M396 286 C416 242 468 242 488 286 C466 326 416 326 396 286 Z" className="harness-shadow" />
        <path d="M400 268 C424 244 462 244 484 268" className="can-wire can-wire-a" />
        <path d="M400 288 C426 262 462 262 484 288" className="can-wire can-wire-b" />
        <path d="M400 308 C424 284 462 284 484 308" className="can-wire can-wire-ground" />
        <rect x="382" y="258" width="30" height="27" rx="6" className="connector-shell" />
        <rect x="476" y="298" width="34" height="29" rx="6" className="connector-shell" />
        <circle cx="398" cy="270" r="5" className="connector-dot" />
        <circle cx="494" cy="312" r="5" className="connector-dot" />
        <text x="438" y="352" textAnchor="middle">CAN 线束</text>
      </g>

      <g className={nodeClass("vcu")} onClick={() => onSelectModule("vcu")} tabIndex={0} role="button" aria-label="VCU">
        <path d="M638 126 L734 126 L748 140 L748 194 L734 208 L638 208 L624 194 L624 140 Z" className="ecu-body vcu-body" />
        <path d="M648 140 L648 194 M662 140 L662 194 M676 140 L676 194 M690 140 L690 194 M704 140 L704 194 M718 140 L718 194" className="cooling-ribs" />
        <rect x="656" y="166" width="60" height="28" rx="5" className="ecu-connector" />
        <path d="M632 150 L610 150 M632 170 L610 170 M632 190 L610 190 M740 150 L766 150 M740 170 L766 170 M740 190 L766 190" className="pin-line" />
        <text x="686" y="160" textAnchor="middle" className="ecu-small-text">VCU</text>
        <text x="686" y="236" textAnchor="middle">整车控制器</text>
      </g>

      <g className={nodeClass("controller")} onClick={() => onSelectModule("controller")} tabIndex={0} role="button" aria-label="转向控制器">
        <path d="M634 346 L740 346 L756 364 L756 414 L740 430 L634 430 L618 414 L618 364 Z" className="ecu-body steering-ecu-body" />
        <path d="M634 362 L740 362 M634 378 L740 378 M634 394 L740 394 M634 410 L740 410" className="cooling-ribs controller-ribs" />
        <rect x="646" y="378" width="62" height="32" rx="5" className="ecu-connector" />
        <path d="M628 366 L600 366 M628 392 L600 392 M750 366 L778 366 M750 392 L778 392" className="pin-line" />
        <text x="688" y="454" textAnchor="middle">转向控制器</text>
      </g>

      <g className={nodeClass("motor")} onClick={() => onSelectModule("motor")} tabIndex={0} role="button" aria-label="转向电机">
        <path d="M786 246 L858 246 C874 246 886 258 886 270 C886 282 874 294 858 294 L786 294 Z" className="motor-body" />
        <ellipse cx="786" cy="270" rx="18" ry="32" className="motor-cap" />
        <ellipse cx="858" cy="270" rx="18" ry="32" className="motor-nose" />
        <path d="M804 252 L846 252 M800 264 L850 264 M800 276 L850 276 M804 288 L846 288" className="motor-ribs" />
        <path d="M830 294 L830 322 M812 322 L848 322" className="motor-mount" />
        <path d="M876 270 L906 270" className="motor-shaft" />
        <circle cx="906" cy="270" r="5" className="shaft-tip" />
        <text x="830" y="222" textAnchor="middle">电机 {motorAngle}°</text>
      </g>

      <g className={nodeClass("wheels")} onClick={() => onSelectModule("wheels")} tabIndex={0} role="button" aria-label="前轮与转向执行机构">
        <g className="rear-wheels">
          <rect x="72" y="136" width="92" height="38" rx="13" className="rear-wheel" />
          <line x1="82" y1="155" x2="154" y2="155" className="rear-wheel-line" />
          <rect x="72" y="366" width="92" height="38" rx="13" className="rear-wheel" />
          <line x1="82" y1="385" x2="154" y2="385" className="rear-wheel-line" />
        </g>
        <path d="M760 146 L846 146 M760 394 L846 394 M804 146 L804 394" className="steering-rack" />
        <g transform={`translate(846 146) rotate(${actualAngle})`}>
          <rect x="-52" y="-21" width="104" height="42" rx="13" className="wheel" />
          <line x1="-62" y1="0" x2="62" y2="0" className="wheel-line" />
        </g>
        <g transform={`translate(846 394) rotate(${actualAngle})`}>
          <rect x="-52" y="-21" width="104" height="42" rx="13" className="wheel" />
          <line x1="-62" y1="0" x2="62" y2="0" className="wheel-line" />
        </g>
        <text x="846" y="510" textAnchor="middle">前轮 {actualAngle}°</text>
      </g>

      <g className="live-readout">
        <text x="120" y="32">目标角 {steerAngle}° / {direction}</text>
        <text x="120" y="60">状态：{controllerState}</text>
        <text x="590" y="32">反馈角 {actualAngle}°</text>
        <text x="590" y="60">误差 {Math.abs(steerAngle - actualAngle)}°</text>
      </g>
    </svg>
  );
}

function ModuleDetailPanel({ moduleId }: { moduleId: ModuleId }) {
  const detail = moduleDetails[moduleId];
  return (
    <section className="panel learning-module module-identify">
      <div className="module-header">
        <span className="module-index">01</span>
        <div>
          <h2>模块识别</h2>
          <p>点击底盘图中的图标，查看模块功能与故障点。</p>
        </div>
      </div>
      <div className="module-detail-card">
        <h3>{detail.name}</h3>
        <dl>
          <dt>功能</dt>
          <dd>{detail.role}</dd>
          <dt>输入</dt>
          <dd>{detail.input}</dd>
          <dt>输出</dt>
          <dd>{detail.output}</dd>
          <dt>常见故障</dt>
          <dd>{detail.faults.join(" / ")}</dd>
        </dl>
      </div>
    </section>
  );
}

function OperationGuide({
  steerAngle,
  actualAngle,
  motorAngle,
  controllerState
}: {
  steerAngle: number;
  actualAngle: number;
  motorAngle: number;
  controllerState: string;
}) {
  return (
    <section className="panel learning-module operation-module">
      <div className="module-header">
        <span className="module-index">02</span>
        <div>
          <h2>转向操作</h2>
          <p>拖动底部方向盘或滑杆，观察目标角、实际角和电机输出。</p>
        </div>
      </div>
      <div className="operation-status-grid">
        <Metric label="目标角" value={steerAngle} suffix="°" />
        <Metric label="前轮角" value={actualAngle} suffix="°" />
        <Metric label="电机输出" value={motorAngle} suffix="°" />
      </div>
      <div className="status-note">控制器状态：{controllerState}</div>
    </section>
  );
}

function CanMessagePanel({
  steerAngle,
  actualAngle,
  controllerState,
  faultMode
}: {
  steerAngle: number;
  actualAngle: number;
  controllerState: string;
  faultMode: boolean;
}) {
  const error = Math.abs(steerAngle - actualAngle);
  return (
    <section className="panel learning-module can-module">
      <div className="module-header">
        <span className="module-index">03</span>
        <div>
          <h2>CAN 报文观察</h2>
          <p>查看目标角、反馈角、误差和状态帧如何随操作变化。</p>
        </div>
      </div>
      <div className="can-table">
        <div><span>ID</span><strong>0x214</strong></div>
        <div><span>目标角</span><strong>{steerAngle}°</strong></div>
        <div><span>反馈角</span><strong>{actualAngle}°</strong></div>
        <div><span>误差</span><strong>{error}°</strong></div>
        <div><span>周期</span><strong>10 ms</strong></div>
        <div><span>状态</span><strong>{faultMode ? "DEGRADED" : "OK"}</strong></div>
      </div>
      <div className={faultMode ? "can-frame warning" : "can-frame"}>
        {`ID:214 DLC:8 TARGET:${steerAngle} FB:${actualAngle} ERR:${error} STATE:${controllerState}`}
      </div>
    </section>
  );
}

function AssessmentPanel({
  answers,
  onAnswer,
  operationDone,
  actualAngle,
  onTryCompleteTask,
  onSubmit,
  evaluation,
  recommendations,
  onRecommendationDone
}: {
  answers: Record<string, number>;
  onAnswer: (questionId: string, optionIndex: number) => void;
  operationDone: Record<string, boolean>;
  actualAngle: number;
  onTryCompleteTask: (taskId: string, targetAngle: number) => void;
  onSubmit: () => void;
  evaluation: {
    totalScore: number;
    quizScore: number;
    operationScore: number;
    weakTopics: string[];
    topicScores: TopicScore;
  } | null;
  recommendations: RecommendationRow[];
  onRecommendationDone: (id: number) => void;
}) {
  return (
    <section className="panel assessment-panel learning-module">
      <div className="module-header">
        <span className="module-index">04</span>
        <div>
          <h2>测评</h2>
          <p>完成知识题与操作任务，生成图形化评价和学习建议。</p>
        </div>
      </div>
      <div className="quiz-list">
        {quizQuestions.map((question) => (
          <div className="quiz-item" key={question.id}>
            <div className="question-topic">{question.topic}</div>
            <p>{question.question}</p>
            <div className="option-grid">
              {question.options.map((option, index) => (
                <button
                  className={answers[question.id] === index ? "option selected" : "option"}
                  key={option}
                  onClick={() => onAnswer(question.id, index)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="task-list">
        <h3>操作任务</h3>
        {operationTasks.map((task) => (
          <div className="task-row" key={task.id}>
            <span>{task.label}</span>
            <button onClick={() => onTryCompleteTask(task.id, task.targetAngle)}>
              {operationDone[task.id] ? <CheckCircle2 size={16} /> : <Gauge size={16} />}
              {operationDone[task.id] ? "已完成" : `检测 ${actualAngle}°`}
            </button>
          </div>
        ))}
      </div>
      <button className="primary-action" onClick={onSubmit}>提交测评并生成建议</button>
      <EvaluationDashboard
        evaluation={evaluation}
        recommendations={recommendations}
        onRecommendationDone={onRecommendationDone}
      />
    </section>
  );
}

function EvaluationDashboard({
  evaluation,
  recommendations,
  onRecommendationDone
}: {
  evaluation: {
    totalScore: number;
    quizScore: number;
    operationScore: number;
    weakTopics: string[];
    topicScores: TopicScore;
  } | null;
  recommendations: RecommendationRow[];
  onRecommendationDone: (id: number) => void;
}) {
  const scores = evaluation?.topicScores ?? Object.fromEntries(topicOrder.map((topic) => [topic, 60]));
  return (
    <div className="evaluation-panel">
      <div className="section-title">
        <BookOpen size={19} />
        <h2>图形化评价与推荐</h2>
      </div>
      <div className="score-strip">
        <Metric label="总分" value={evaluation?.totalScore ?? 0} suffix="分" />
        <Metric label="测验" value={evaluation?.quizScore ?? 0} suffix="分" />
        <Metric label="操作" value={evaluation?.operationScore ?? 0} suffix="分" />
      </div>
      <RadarChart scores={scores} />
      <div className="weak-topic">
        薄弱点：{evaluation?.weakTopics.length ? evaluation.weakTopics.join(" / ") : "提交测评后自动生成"}
      </div>
      <ResourceLibrary recommendations={recommendations} onDone={onRecommendationDone} />
    </div>
  );
}

function RadarChart({ scores }: { scores: TopicScore }) {
  const center = 90;
  const radius = 68;
  const points = topicOrder.map((topic, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / topicOrder.length;
    const scoreRadius = (scores[topic] / 100) * radius;
    return {
      topic,
      x: center + Math.cos(angle) * scoreRadius,
      y: center + Math.sin(angle) * scoreRadius,
      labelX: center + Math.cos(angle) * (radius + 24),
      labelY: center + Math.sin(angle) * (radius + 24)
    };
  });
  return (
    <svg className="radar" viewBox="0 0 180 180" aria-label="知识点雷达图">
      {[0.35, 0.7, 1].map((scale) => (
        <polygon
          key={scale}
          points={topicOrder
            .map((_, index) => {
              const angle = -Math.PI / 2 + (Math.PI * 2 * index) / topicOrder.length;
              return `${center + Math.cos(angle) * radius * scale},${center + Math.sin(angle) * radius * scale}`;
            })
            .join(" ")}
          className="radar-grid"
        />
      ))}
      {points.map((point) => (
        <line key={point.topic} x1={center} y1={center} x2={point.labelX} y2={point.labelY} className="radar-axis" />
      ))}
      <polygon points={points.map((point) => `${point.x},${point.y}`).join(" ")} className="radar-fill" />
      {points.map((point) => (
        <text key={point.topic} x={point.labelX} y={point.labelY} textAnchor="middle" className="radar-label">
          {point.topic}
        </text>
      ))}
    </svg>
  );
}

function ResourceLibrary({
  recommendations,
  onDone
}: {
  recommendations: RecommendationRow[];
  onDone: (id: number) => void;
}) {
  return (
    <div className="resource-list">
      {recommendations.length === 0 ? (
        <div className="empty-state">完成一次测评后会出现个性化学习资源。</div>
      ) : (
        recommendations.map((item) => (
          <article className={item.completed ? "resource-card done" : "resource-card"} key={item.id}>
            <div>
              <span className="badge">{item.type}</span>
              <h3>{item.title}</h3>
              <p>{item.content}</p>
              <small>{item.reason} / {item.difficulty}</small>
            </div>
            <button disabled={Boolean(item.completed)} onClick={() => onDone(item.id)}>
              {item.completed ? "已完成" : "标记完成"}
            </button>
          </article>
        ))
      )}
    </div>
  );
}

function TeacherDashboard({
  classes,
  students,
  onChanged
}: {
  classes: ClassRow[];
  students: StudentRow[];
  onChanged: () => void;
}) {
  const [summary, setSummary] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(students[0]?.id ?? null);
  const [detail, setDetail] = useState<any>(null);
  const [newClassName, setNewClassName] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentNo, setNewStudentNo] = useState("");
  const [newStudentClassId, setNewStudentClassId] = useState<number | null>(classes[0]?.id ?? null);
  const [csvPreview, setCsvPreview] = useState("");

  useEffect(() => {
    void window.sbwApi.classSummary().then(setSummary);
  }, [students.length]);

  useEffect(() => {
    if (!newStudentClassId && classes[0]?.id) {
      setNewStudentClassId(classes[0].id);
    }
  }, [classes, newStudentClassId]);

  useEffect(() => {
    const id = selectedStudentId ?? students[0]?.id;
    if (!id) return;
    setSelectedStudentId(id);
    void window.sbwApi.studentDetail(id).then(setDetail);
  }, [selectedStudentId, students.length]);

  async function addClass() {
    if (!newClassName.trim()) return;
    await window.sbwApi.createClass(newClassName);
    setNewClassName("");
    onChanged();
  }

  async function addStudent() {
    if (!newStudentName.trim() || !newStudentClassId) return;
    await window.sbwApi.createStudent({ name: newStudentName, classId: newStudentClassId, studentNo: newStudentNo });
    setNewStudentName("");
    setNewStudentNo("");
    onChanged();
  }

  async function exportCsv() {
    setCsvPreview(await window.sbwApi.exportCsv());
  }

  async function resetDemoData() {
    await window.sbwApi.resetDemoData();
    setCsvPreview("");
    onChanged();
  }

  const totalStudents = summary.reduce((sum, item) => sum + item.studentCount, 0);
  const avgScore = summary.length
    ? Math.round(summary.reduce((sum, item) => sum + item.avgScore, 0) / summary.length)
    : 0;

  return (
    <main className="teacher-grid">
      <section className="panel dashboard-hero">
        <Metric icon={<Users size={18} />} label="学生总数" value={totalStudents} suffix="人" />
        <Metric icon={<Gauge size={18} />} label="班级均分" value={avgScore} suffix="分" />
        <Metric icon={<Database size={18} />} label="班级数量" value={classes.length} suffix="个" />
        <button className="download-button" onClick={exportCsv}>
          <Download size={17} /> 导出 CSV
        </button>
      </section>

      <section className="panel class-summary">
        <div className="section-title">
          <School size={19} />
          <h2>班级汇总</h2>
        </div>
        {summary.map((item) => (
          <div className="class-card" key={item.id}>
            <div>
              <h3>{item.name}</h3>
              <p>{item.studentCount} 名学生 / {item.assessmentCount} 次测评</p>
            </div>
            <div className="bar-group">
              <Progress label="平均分" value={item.avgScore} />
              <Progress label="完成率" value={item.completionRate} />
            </div>
            <div className="topic-tags">
              {item.weakTopics.length === 0
                ? <span>暂无薄弱点</span>
                : item.weakTopics.map((topic: any) => <span key={topic.topic}>{topic.topic} x{topic.count}</span>)}
            </div>
          </div>
        ))}
      </section>

      <section className="panel roster-panel">
        <div className="section-title">
          <GraduationCap size={19} />
          <h2>学生列表</h2>
        </div>
        <div className="roster">
          {students.map((student) => (
            <button
              key={student.id}
              className={selectedStudentId === student.id ? "student-row active" : "student-row"}
              onClick={() => setSelectedStudentId(student.id)}
            >
              <span>{student.name}</span>
              <small>{student.class_name} / {student.student_no || "未编号"}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel student-detail">
        <h2>学生详情</h2>
        {detail?.student ? (
          <>
            <div className="detail-heading">
              <div>
                <h3>{detail.student.name}</h3>
                <p>{detail.student.class_name} / {detail.student.student_no || "未编号"}</p>
              </div>
              <Metric label="测评次数" value={detail.assessments.length} suffix="次" />
            </div>
            <div className="history-list">
              {detail.assessments.length === 0 ? (
                <div className="empty-state">暂无测评记录</div>
              ) : (
                detail.assessments.map((item: any) => (
                  <div className="history-row" key={item.id}>
                    <span>{item.created_at}</span>
                    <strong>{Math.round(item.total_score)} 分</strong>
                    <small>{item.weak_topics.join(" / ") || "无明显薄弱点"}</small>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">请选择学生</div>
        )}
      </section>

      <section className="panel manage-panel">
        <h2>班级与学生管理</h2>
        <div className="form-row">
          <input value={newClassName} onChange={(event) => setNewClassName(event.target.value)} placeholder="新班级名称" />
          <button onClick={addClass}><Plus size={16} /> 新增班级</button>
        </div>
        <div className="form-row three">
          <select
            value={newStudentClassId ?? ""}
            onChange={(event) => setNewStudentClassId(Number(event.target.value))}
          >
            {classes.map((classRow) => (
              <option key={classRow.id} value={classRow.id}>{classRow.name}</option>
            ))}
          </select>
          <input value={newStudentName} onChange={(event) => setNewStudentName(event.target.value)} placeholder="学生姓名" />
          <input value={newStudentNo} onChange={(event) => setNewStudentNo(event.target.value)} placeholder="学号" />
          <button onClick={addStudent}><Plus size={16} /> 新增学生</button>
        </div>
        <button className="reset-demo" onClick={resetDemoData}>重置示例数据</button>
        {csvPreview && <textarea className="csv-preview" value={csvPreview} readOnly />}
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  suffix,
  icon
}: {
  label: string;
  value: number;
  suffix: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}{suffix}</strong>
    </div>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div className="progress-row">
      <span>{label}</span>
      <div className="progress-track"><div style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
      <strong>{value}%</strong>
    </div>
  );
}

function scoreTopics(
  answers: Array<{ topic: string; correct: boolean }>,
  operations: Array<{ taskId: string; completed: boolean }>
) {
  const scores: TopicScore = Object.fromEntries(topicOrder.map((topic) => [topic, 50]));
  topicOrder.forEach((topic) => {
    const topicAnswers = answers.filter((answer) => answer.topic === topic);
    if (topicAnswers.length > 0) {
      scores[topic] = topicAnswers.every((answer) => answer.correct) ? 88 : 42;
    }
  });
  operationTasks.forEach((task) => {
    const op = operations.find((operation) => operation.taskId === task.id);
    if (op?.completed) {
      scores[task.topic] = Math.max(scores[task.topic], 90);
    } else {
      scores[task.topic] = Math.min(scores[task.topic], 62);
    }
  });
  return scores;
}
