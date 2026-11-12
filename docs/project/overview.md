---
summary: 定义 CoCo 的目标、范围、领域事实、已批准技术栈和文档所有权。
read_when:
  - 判断需求是否属于 CoCo 的核心范围
  - 修改项目定位、边界、技术方向或架构所有权
---

# 项目概览

## 项目卡

- 名称：CoCo。
- 类型：事件驱动的多 Agent 软件交付协调工具（MCP 服务与规则、Skills 包）。
- 目标：复用 Codex、DeepSeek Harness 和 GitHub，减少中间人工协调，以持久化事件完成可验证、可恢复的软件交付。
- 需求基线：[v1.2 索引](../requirements/README.md)；实施状态：[current-state.md](current-state.md)。

## 核心边界

包含本地非 LLM Core、多 MCP 接入、Runtime/GitHub Adapters、任务/事件/合同/恢复、CLI、项目模板与初始化 Skill。
Leader 负责需求、设计、拆分、授权、测试复核和仲裁；Coordinator 执行确定性计划与门禁。
一个 Core 服务多个隔离 Project / Run；Session 不跨项目复用，Worker 默认不跨 Run。
不实现全局 Worker 池、固定 Agent 数量/项目并发配额、分布式队列或通用工作流平台。
不自研推理 Runtime、GitHub Merge Queue、CI、聊天平台或生产部署平台。
底层限流由背压与有限重试处理，资源互斥服务于正确性，不是配额调度。

## 真相与领域

| 事实 | 权威来源 |
| --- | --- |
| 需求和 AC | 用户需求与已批准 Spec 版本 |
| 工作流、事件与投递 | 产品未来的 Core SQLite |
| 代码与有效 SHA | Git |
| PR、CI、Review、Merge | GitHub 实时核验的记录 |
| 恢复思路 | 与 Git/版本一致的有效 Handoff Checkpoint |

Event、Delivery 和 Attempt 分离；Runtime 接受不代表任务完成。
状态推进依赖有效版本与外部证据，不依赖 Agent 自述或 Desktop Sidebar。
未知执行结果先 reconcile，不能盲目启动第二个写入者。

## 已批准技术栈

用户于初始化时明确批准：

| 区域 | 选择 |
| --- | --- |
| 核心 | TypeScript + Node.js 26 LTS |
| 工程组织 | pnpm workspace，按真实依赖逐步拆包 |
| MCP / 契约 | 官方 TypeScript SDK + Zod，共享协议定义 |
| 存储 | SQLite WAL，由单 Core 管理状态、事件与投递 |
| 规则和 Skills | Markdown / YAML |
| 验证 | Vitest + TypeScript 类型检查；按 AC 使用协议、集成和故障注入测试 |
| 接入 | 独立 DSH / Codex / GitHub Adapters |

具体依赖版本、SQLite 驱动、IPC 和真实 Runtime 能力在 Phase 0 及后续接受的设计中锁定。
Leader 基础模式支持 Desktop 人工继续并通过 MCP 领事件；自动唤醒以真实能力核验为准。

## 文档所有权

[路线](roadmap.md) 管阶段目标；活动 `tasks.md` 管唯一任务进度。
需求索引管来源与 AC 路由；Spec 管切片需求；design 管技术方案与验证合同。
`docs/workflow/` 管重复工作约定，`docs/agents/` 管角色差异，`docs/.agent/` 管发现和执行约束。
当前方案见 [Phase 0 设计](../specs/spike/phase-0/design.md)，不是已交付能力声明。
