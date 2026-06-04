# 汽车线控底盘转向系统教学仿真

这是一个基于 Electron、React 和 TypeScript 的桌面教学仿真软件，用于帮助学生理解汽车线控底盘转向系统的结构、控制流程和学习效果。

## 功能

- 线控转向系统仿真图：上位机、CAN 线束、VCU、转向控制器、转向电机、前轮和后轮。
- 转向操作：通过方向盘/滑杆输入目标角，前轮实时转向。
- CAN 报文观察：显示目标角、反馈角、误差、状态帧等信息。
- 模块识别：点击模块查看功能、输入、输出和常见故障。
- 测评与推荐：完成知识题和操作任务后生成评价结果和个性化学习建议。
- 教师后台：查看班级汇总、学生详情、测评记录和 CSV 导出。

## 本地运行

项目内已支持使用便携 Node.js 安装依赖。若尚未安装依赖，可运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-dependencies.ps1
```

启动软件：

```cmd
set PATH=%cd%\.tools\node;%PATH%
.tools\node\npm.cmd run start
```

开发模式：

```cmd
set PATH=%cd%\.tools\node;%PATH%
.tools\node\npm.cmd run dev
```

## 验证

```cmd
.tools\node\npm.cmd run typecheck
.tools\node\npm.cmd run build
```
