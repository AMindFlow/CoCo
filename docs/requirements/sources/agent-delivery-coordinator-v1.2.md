## 多 Agent 异步协作与自动软件交付系统需求规格

**版本：** v1.2  
**更新日期：** 2026-11-12  
**状态：** 需求基线，待技术设计与 PoC  
**实施对象：** Codex  
**目标环境：** 本地开发环境，优先 macOS  
**交付范围：** Coordinator Core、MCP Server、Runtime Adapters、项目脚手架、初始化 Skill/Script、测试与使用文档

---

# 1. 项目目标

## 1.1 背景

当前 AI Coding 的主要效率瓶颈已经不完全在于代码生成，而在于 Agent 之间的协作、验证、交付和恢复。

典型问题：

- 人类需要反复检查 Spec、代码、测试和 PR。
    
- 多 Agent 虽然可以并行编码，但跨任务依赖和接口合同难以管理。
    
- Implementer 完成工作后，需要人工触发 Review、检查 CI 并转发失败结果。
    
- Agent 当前执行结束后，无法自然地被外部事件唤醒继续工作。
    
- 不同 Agent 缺乏可靠、有限且可追踪的通信机制。
    
- 多个 PR 的集成顺序、验证和失败归因需要人工协调。
    
- Session 中断或丢失后，工作难以从可信状态恢复。
    
- Leader 需要持续查询子 Agent，浪费上下文和推理成本。
    
- 多个独立项目需要同时运行交付流程，但不应分别部署 Coordinator。
    

现有 Codex、DeepSeek Harness（DSH）、GitHub Actions、Codex Code Review 和 GitHub Merge Queue 已经提供了大部分底层能力。

本项目的目标不是重新开发这些能力，而是通过一个轻量、持久化的本地 Coordinator 组合它们。

## 1.2 最终目标

建立：

**Human → Codex Leader → Coordinator → Tester / Implementers → Review / CI → Integration → Merge Queue → Leader Delivery**

期望达到：

1. 用户主要与 Codex Leader 讨论需求、架构和验收。
    
2. Leader 完成 Spec、AC、架构、Contract 与任务拆分。
    
3. Tester 在实施前编写测试，Leader 复核其正确性和覆盖度。
    
4. Coordinator 根据 Leader 授权的任务计划启动指定 Agent。
    
5. 多个 Implementer 在独立 Worktree 中并行开发。
    
6. Agent 通过持久化事件进行有限的异步协作。
    
7. PR 自动触发 Codex Review 和 GitHub CI。
    
8. 验证失败后，Coordinator 自动通知并恢复原 Implementer。
    
9. 存在耦合的工作包经过集成分支验证。
    
10. 最终 PR 经 Merge Queue 合并。
    
11. 新任务就绪或存在异常决策时，Coordinator 通知 Leader。
    
12. Agent 意外退出时能够从 Session 或 Handoff Checkpoint 恢复。
    
13. 多个 Codex Leader 可以同时使用一个 Coordinator 管理不同项目。
    
14. 人类能够通过 Codex Desktop 和状态工具查看、干预执行过程。
    

核心价值是减少人类在中间执行环节的协调和重复复核工作，同时保持必要的技术验收、风险控制和证据链。

---

# 2. 核心设计原则

## P1. 复用现有工具

优先使用成熟的 Codex、DSH、GitHub 功能。

不重新实现：

- Agent 推理 Runtime。
    
- Git 与 PR 系统。
    
- CI 系统。
    
- Code Review 模型能力。
    
- Merge Queue。
    

## P2. Leader 决策，Coordinator 执行

Leader 负责需要业务或技术推理的决策：

- 需求和架构。
    
- 工作包划分。
    
- 并行边界。
    
- 合同设计及争议。
    
- 测试复核。
    
- 复杂集成问题。
    
- 最终技术验收。
    

Coordinator 负责确定性操作：

- 状态记录与观察。
    
- 事件投递。
    
- 会话启动及恢复。
    
- DAG 依赖门禁。
    
- 外部状态核验。
    
- 受控 Git/GitHub 操作。
    
- 故障处理与重试。
    

Coordinator 不自行决定业务需求应该如何拆分，也不自主判断代码设计是否正确。

## P3. 事件驱动

所有 Agent，包括 Leader，均采用可恢复的异步执行模型。

Agent 完成阶段性工作后可以结束当前 Turn。

收到新的任务事件时，Coordinator 再恢复相应 Session。

不要求 Agent 持续运行或通过同步对话等待其他 Agent。

## P4. 项目隔离

每个 Project 拥有自己的：

- Leader 归属。
    
- Delivery Runs。
    
- Agent Sessions。
    
- Tasks。
    
- Contracts。
    
- Events。
    
- Checkpoints。
    
- Worktrees。
    
- PR 关联记录。
    

**不同 Project 的 Agent Session 不允许交叉复用。**

即使角色相同、Runtime 相同，也不能将 Project A 的 Session 直接指派到 Project B。

## P5. 不管理全局 Agent 资源池

Coordinator 不维护预先启动的 Worker 池，不分配全局 Agent 席位，也不要求用户为每个项目预先设置 Agent 数量。

实际 Agent 数量由 Leader 的任务规划决定。

Coordinator 只负责执行已授权的启动、继续、等待和停止操作。

允许底层 Runtime 或外部 API 根据真实容量施加限制；出现限流时进行背压和重试。

## P6. 保留必要的互斥

取消全局资源调度，不意味着取消一致性控制。

必须保证：

- 同一个 Session 不发生重叠 Turn。
    
- 同一 Worktree 不发生冲突写入。
    
- 同一集成分支只有一个受控写入者。
    
- 旧 Execution Attempt 不能覆盖新 Attempt 状态。
    
- 重复事件不能造成重复的危险操作。
    

这些是正确性约束，而非 Agent 配额管理。

## P7. 单一工作流真相源

Coordinator 保存工作流状态。

GitHub 保存真实的 PR、CI、Review、Merge 状态。

Git 保存代码版本。

Handoff Checkpoint 保存 Agent 工作思路与交接状态。

状态转移必须依据可核验的事实，而不是 Agent 自述。

## P8. 可恢复优先

Session 不是唯一的工作记录。

任何关键执行必须能够从有效 Git SHA、Handoff 和任务状态恢复。

不得将未记录的临时修改直接作为可信的恢复输入。

## P9. 不为并行而并行

Leader 只有在存在真实独立性、明确的共享合同和可以隔离的工作区时才拆分多个 Implementer。

不以增加 Agent 数量作为目标。

## P10. 最小复杂度

本项目是轻量的 Agent 协作工具，不是通用工作流平台。

所有抽象都应服务于确定的交付需求。

---

# 3. 范围与非目标

## 3.1 本期必须实现

- 本地 Coordinator Core。
    
- Coordinator MCP Server。
    
- 多 MCP Client 连接。
    
- 多 Project / Delivery Run 管理。
    
- 项目专属 Agent Session 管理。
    
- 持久化事件系统。
    
- 消息重试、确认与异常留存。
    
- DAG 门禁及 Ready 状态识别。
    
- DSH Runtime Adapter。
    
- Codex Leader 交互适配。
    
- GitHub PR、Review、CI、Merge Queue Adapter。
    
- Contract 协作协议。
    
- Tester 前置验证门禁。
    
- Direct/Staged 集成模式。
    
- Integration Gate。
    
- 故障归因与重新派发。
    
- Session 和 Handoff 恢复。
    
- 项目脚手架。
    
- 初始化 Skill/Script。
    
- CLI 状态与诊断功能。
    
- 协议测试、故障注入测试和端到端测试。
    

## 3.2 明确不做

第一版不实现：

- 全局 Agent Worker 池。
    
- 全局 Agent 并发配额。
    
- Project/Run 级固定 Agent 配额。
    
- 全局公平调度算法。
    
- Agent 资源预留或任务抢占。
    
- 模型供应商容量预测。
    
- 通用 Agent 聊天平台。
    
- 自研 Agent Runtime。
    
- 自研 GitHub 替代方案。
    
- 完整 Jira/Scrum 管理平台。
    
- 通用 BPMN Workflow Engine。
    
- 分布式消息队列。
    
- Kubernetes/Redis/Kafka 基础设施。
    
- 多机协调及分布式高可用。
    
- 复杂的图形化 DAG 编辑器。
    
- 完整替代 Codex Desktop 的 UI。
    
- 生产部署自动化系统。
    
- 未经授权的危险 Git 操作。
    

本地单 Core 足以满足当前需求。

---

# 4. 总体架构

## 4.1 逻辑架构

```
Codex Desktop
│
├── Project A
│   └── Codex Leader A
│       └── MCP Client A
│
└── Project B
    └── Codex Leader B
        └── MCP Client B
                 │
                 ▼
       ┌─────────────────────────┐
       │    Coordinator Core     │
       │                         │
       │  Project Registry       │
       │  Run / DAG State        │
       │  Event Store & Router   │
       │  Session Registry       │
       │  Contract Gate          │
       │  Integration Gate       │
       │  Recovery Manager       │
       │  GitHub Adapter         │
       │                         │
       │  SQLite                │
       └─────────────────────────┘
              │          │
       ┌──────┘          └───────┐
       ▼                         ▼
   Project A                  Project B
   DSH Sessions               DSH Sessions
   ├── Tester                 ├── Tester
   ├── Implementer A1         ├── Implementer B1
   └── Implementer A2         └── Implementer B2
```

不同项目的 Agent Session 完全独立。

Coordinator 不需要决定 Project A 应该获得多少 Agent，或是否优先于 Project B。

它只响应各自 Leader 的已授权任务，并追踪执行状态。

## 4.2 进程模型

采用：

**一个常驻 Coordinator Core + 多个轻量 MCP 接入进程。**

```
Codex Leader A
   └── MCP stdio A ──┐
                     │
                     ├── Local IPC ── Coordinator Core
                     │
Codex Leader B       │
   └── MCP stdio B ──┘
```

MCP 接入进程只负责：

- 接收请求。
    
- 关联客户端授权上下文。
    
- 转发请求。
    
- 返回结果。
    

不启动独立的工作流引擎或事件消费者。

Coordinator Core 负责：

- 持久化状态。
    
- 后台事件处理。
    
- Session 管理。
    
- GitHub 状态同步。
    
- 故障恢复。
    

要求：

- MCP 连接断开不终止后台任务。
    
- Codex Desktop 关闭不终止已接收的任务。
    
- 两个 MCP Client 不会创建两个 Coordinator Core。
    
- Core 重启后可以恢复所有未完成的项目状态。
    
- Core 单实例运行，不要求分布式部署。
    

本地 IPC 可以采用 Unix Domain Socket 或 Loopback HTTP，由技术设计决定。

## 4.3 内部模块

建议划分：

|模块|职责|
|---|---|
|Project Registry|管理项目、仓库身份和配置|
|Run State Manager|管理交付流程的状态|
|DAG Gate|检查依赖并识别 Ready 节点|
|Event Store|持久化事件、投递状态和证据|
|Event Router|将事件送达正确的 Agent|
|Session Manager|启动、继续、观察和恢复 Session|
|Contract Gate|管理合同版本及有限协商|
|Integration Gate|管理分支集成与整体验证|
|Recovery Manager|Checkpoint、重建与回滚|
|GitHub Adapter|PR、Review、CI、Merge Queue|
|Runtime Adapters|Codex、DSH 等|
|MCP Server|Leader 操作接口|
|CLI|初始化、状态、诊断、维护|

这些是逻辑模块，不要求每个模块成为独立服务。

---

# 5. 多项目与 Session 隔离

## 5.1 层级关系

```
Coordinator
├── Project A
│   ├── Run A1
│   │   ├── Leader Session A1
│   │   ├── Tester Session A1
│   │   └── Implementer Sessions
│   └── Run A2
│       └── 独立执行上下文
│
└── Project B
    └── Run B1
        ├── Leader Session B1
        ├── Tester Session B1
        └── Implementer Sessions
```

要求：

- 一个 Coordinator 可以注册多个 Project。
    
- 一个 Project 可以有多个 Delivery Run。
    
- 一个 Delivery Run 只有一个当前有效 Leader 归属。
    
- 每个 Worker Session 必须绑定明确的 Project 和 Run。
    
- 一个 Worker Session 不能跨 Project 复用。
    
- 默认也不跨 Run 复用 Worker Session，以避免历史上下文污染。
    
- 同一 Project 的 Leader 可以顺序管理多个 Run，但每次操作必须显式绑定 Run，且不得存在冲突的管理租约。
    

## 5.2 不存在全局 Worker 池

Coordinator 不执行：

```
全局 Worker Pool
    │
    ├── 分配给 Project A
    └── 空闲后分配给 Project B
```

采用：

```
Project A / Run A1
    └── 专属 Worker Sessions

Project B / Run B1
    └── 专属 Worker Sessions
```

Leader 委派任务时，Coordinator 可以按需创建新的 Session。

任务完成后 Session 可以保留为 IDLE，等待该项目后续事件。

Session 不会因为空闲而被分配到其他项目。

## 5.3 同一 Session 的复用

允许一个 Implementer Session 在同一个 Run 中继续处理：

- 原 PR 的 Review Findings。
    
- CI 失败修复。
    
- Contract 更新后的调整。
    
- 原工作包的补充任务。
    
- 已授权的后续相关节点。
    

但不能同时执行两个独立可写 Attempt。

跨 Work Package 复用必须确保任务上下文和授权范围正确，默认优先沿用原工作包 Session。

## 5.4 跨项目事件隔离

事件投递必须校验：

```
Project ID
   ↓
Run ID
   ↓
Task ID
   ↓
Execution Attempt
   ↓
Session ID
```

GitHub 事件还必须关联：

- Repository ID。
    
- PR Number。
    
- Head SHA。
    
- 外部事件或检查 ID。
    

不得仅凭 PR Number、角色名称或 Thread ID 推断事件归属。

无法唯一匹配的事件进入待核验状态，不得随意投递。

## 5.5 同一 Git 仓库的处理

原则上一个物理 Git 仓库对应一个 Project Registry 记录。

同一仓库可以存在多个 Delivery Run。

如果出现同一仓库被重复注册的情况，初始化工具应识别并拒绝无意的重复注册，或要求显式关联到已有 Project。

多个 Run 操作同一仓库时，仍需要对实际冲突资源实施互斥。

这不构成全局 Agent 调度。

## 5.6 项目生命周期独立

Project A 的 Run 暂停、失败或恢复，不得影响 Project B。

Coordinator 可以同时追踪任意数量的 Project 和 Session，但不承诺底层 Runtime 能无限制同时执行。

本项目不对 Session 总量设置人为固定上限。

---

# 6. 核心数据模型

## 6.1 核心实体

|实体|作用|
|---|---|
|Project|仓库及项目配置|
|Delivery Run|一次需求交付|
|Spec|需求及验收合同|
|Work Package|可交付工作单元|
|DAG Node|有依赖和完成条件的节点|
|Contract|跨工作包约定|
|Agent Session|Runtime 会话|
|Execution Attempt|一次具体执行|
|Resource Lease|独占工作区或资源的租约|
|Event|持久化异步事件|
|Event Delivery|某次事件向目标投递的记录|
|Pull Request|GitHub PR 及关联证据|
|Checkpoint|代码与 Handoff 恢复点|
|Evidence|可验证的执行结果|

## 6.2 Project

至少包含：

```
project_id
name
canonical_repo_path
github_repository_id
github_repository_url
default_target_branch
project_config
created_at
```

## 6.3 Delivery Run

```
run_id
project_id
leader_session_id
spec_ref
spec_version
risk_level
integration_mode
status
created_at
```

## 6.4 DAG Node

```
node_id
run_id
kind
role
owner
status
depends_on
input_version
output_version
evidence_refs
```

## 6.5 Agent Session

```
session_id
runtime
project_id
run_id
role
worktree_path
status
current_attempt_id
last_checkpoint_id
```

Session ID 不能作为跨 Runtime 的唯一标识。

建议同时保存 Runtime Type 和 Runtime 原生 Session ID。

## 6.6 Execution Attempt

```
attempt_id
node_id
session_id
input_sha
status
started_at
finished_at
result_ref
lease_id
```

## 6.7 事件与投递

事件和投递记录应分离。

一个业务事件可以产生一个或多个明确的投递目标，每次投递具有独立状态。

事件至少包含：

```
event_id
schema_version
event_type
project_id
run_id
node_id
source
correlation_id
subject_version
payload_ref
created_at
```

投递至少包含：

```
delivery_id
event_id
target_session_id
target_role
attempt_id
delivery_status
retry_count
next_retry_at
last_error
accepted_at
completed_at
```

具体 Schema 由技术设计确定。

## 6.8 状态真相源

Coordinator SQLite 保存：

- 工作流状态。
    
- Agent 会话映射。
    
- 事件和投递状态。
    
- 依赖关系。
    
- Checkpoint 和证据引用。
    

GitHub/Git 的真实状态应定期或按需核验。

不能将本地缓存当作远端事实。

---

# 7. Agent 角色与 Runtime

## 7.1 角色矩阵

|角色|默认 Runtime|核心职责|
|---|---|---|
|Leader|Codex|需求、架构、拆分、测试复核、异常仲裁、交付|
|Tester|DSH|验证矩阵、测试代码、CI|
|Implementer|DSH|代码、PR、修复、Handoff|
|PR Reviewer|Codex Cloud Review|独立 PR 代码审查|
|Diagnostic Reviewer|DSH/Codex|集成问题诊断与归因|
|Integrator|DSH|复杂冲突及集成修复|
|Coordinator|非 LLM|状态、事件、会话、受控外部操作|

仅强制 Leader 使用 Codex。

其他角色通过 Runtime Adapter 选择具体执行环境。

不要求 Reviewer 或 Integrator 长期运行。

## 7.2 Agent 启动

Coordinator 根据 Leader 提交的 Task Envelope 创建或恢复会话。

Task Envelope 应包含：

```
task:
  project_id: project-a
  run_id: run-a1
  node_id: backend/implement
  role: implementer

context:
  spec_ref: docs/specs/spike/example/spec.md
  contract_version: v2
  handoff_ref: null

workspace:
  branch: work/run-a1/backend
  worktree: <managed-worktree>

permissions:
  allowed_paths:
    - backend/
  git_write: own_branch_only

completion:
  required:
    - commit_sha
    - handoff
    - pr_reference
```

任务信封由 Coordinator 生成或校验。

Agent 根据 `AGENTS.md` 和角色规则逐步读取相关文档。

## 7.3 渐进式文档加载

遵循：

1. 读取仓库根 AGENTS.md。
    
2. 确定当前 Role。
    
3. 按角色和当前操作读取对应文档。
    
4. 读取当前 Spec、Contract、Handoff。
    
5. 仅加载所需代码和任务上下文。
    

项目脚手架应提供明确的路由规则。

DSH Adapter 需要验证是否能够正确遵循该机制；不能简单假设 DSH 具有与 Codex 完全一致的文档自动发现行为。

## 7.4 权限

角色文档只是行为规范，不是安全隔离。

真实限制由 Runtime、工作区、Git 权限和 Coordinator 执行。

Review Agent 原则上只读。

Implementer 只允许修改授权范围及自己的分支。

集成分支由单一 Integration Owner 控制。

---

# 8. 标准交付流程

## 8.1 主流程

```
Human Request
       │
       ▼
Codex Leader
Spec / AC / Architecture / DAG
       │
       ▼
DSH Tester
Validation Matrix / Tests / CI
       │
       ▼
Leader Review
测试覆盖与有效性复核
       │
       ▼
VALIDATION_APPROVED
       │
       ▼
Implementer × N
并行实现
       │
       ▼
GitHub PR
       │
       ├── Codex Code Review
       └── GitHub CI
       │
       ▼
Review / CI Gate
       │
       ├── Failed
       │      └── Event → Original Implementer
       │
       ▼
Direct Merge / Staged Integration
       │
       ▼
Integration Gate（适用时）
       │
       ├── Failed
       │      └── Diagnostic Reviewer
       │             ├── Owner Fix
       │             └── Leader Arbitration
       ▼
GitHub Merge Queue
       │
       ▼
Merged
       │
       ▼
Coordinator 更新 DAG
       │
       ├── 新节点 Ready → 通知 Leader
       └── 所有工作完成 → Leader Delivery
       │
       ▼
Human Verification
```

## 8.2 需求与规划

Leader 负责：

- 需求分析。
    
- Spec 和 AC。
    
- 系统架构。
    
- 技术边界。
    
- Work Package 拆分。
    
- Contract Owner。
    
- Integration Mode。
    
- DAG 依赖。
    
- 并行适用性。
    
- 风险分级和授权要求。
    

Coordinator 负责校验 DAG 结构，不判断拆分方案的业务合理性。

## 8.3 Tester 前置验证

正式实现前，Leader 必须委派 Tester 设计验证合同。

Tester 交付：

- Verification Matrix。
    
- AC 到测试项的映射。
    
- 必要的自动化测试。
    
- 重要边界和异常场景。
    
- CI 基线。
    
- Fixture。
    
- Pass/Fail Oracle。
    
- 无法自动化的人工验收事项。
    

遵循最小充分测试原则。

## 8.4 Leader 复核 Tester

Leader 必须检查：

- 是否覆盖全部关键 AC。
    
- 是否遗漏正常或异常业务路径。
    
- 断言是否真正验证目标行为。
    
- 是否存在错误 Mock 或无效 Fixture。
    
- 是否因测试幻觉产生错误的预期结果。
    
- 测试是否错误地适应了未完成的实现。
    
- CI 是否可运行。
    
- 新功能的 EXPECTED_RED 是否符合预期。
    
- 现有回归测试是否保持通过。
    

复核失败则退回 Tester。

复核通过后记录 `VALIDATION_APPROVED`。

对于 Material/High-risk 需求，仍须满足相应人工审批要求。

EXPECTED_RED 应处于不会错误阻塞主分支 Required Checks 的验证流程中。

## 8.5 实施

通过前置门禁后：

1. Leader 批准工作包执行。
    
2. Coordinator 识别满足依赖的节点。
    
3. 为指定节点创建或恢复专属 Session。
    
4. 启动 Implementer。
    
5. Implementer 在独立 Worktree 工作。
    
6. 完成后提交代码、Handoff 和 PR。
    
7. 结束当前 Turn，等待后续事件。
    

Coordinator 不选择最佳 Worker，也不维护待分配的全局 Worker 池。

## 8.6 验证与修复

PR 创建或更新后：

- GitHub CI 执行测试。
    
- Codex Code Review 独立审查。
    
- Coordinator 收集并关联结果。
    
- 失败时产生修复事件。
    
- 恢复对应 Implementer。
    
- Implementer 修复并推送新 SHA。
    
- 重新验证。
    

此循环可以重复，但必须有失败分类、重试上限和异常升级机制。

---

# 9. DAG 门禁与状态模型

## 9.1 DAG 的作用

DAG 仅描述工作依赖，不作为全局资源调度器。

它决定：

- 哪些任务已经具备执行前置条件。
    
- 哪些任务仍需等待。
    
- 哪些任务因为前驱失败而被阻塞。
    
- 哪些任务成功后解锁下游。
    

Coordinator 可以自动识别 Ready 节点。

是否立即启动新的独立工作包，取决于 Leader 已提交的执行授权。

若已有授权计划明确允许自动派发，则 Coordinator 可按计划执行。

否则应通知 Leader 决定是否委派。

## 9.2 Task 状态

```
PENDING
READY
RUNNING
WAITING
BLOCKED
SUCCEEDED
FAILED
CANCELLED
```

`WAITING` 表示等待事件或外部结果。

`BLOCKED` 表示依赖、合同、授权等前置条件未满足。

`FAILED` 是工作节点失败，不应与单次 Agent 执行失败混淆。

## 9.3 Session 状态

```
IDLE
ACTIVE
UNAVAILABLE
```

Agent 退出当前 Turn 后，Session 可以处于 IDLE。

IDLE Session 不消耗持续模型推理资源，也不应占用某种虚拟 Worker 席位。

## 9.4 Execution Attempt 状态

```
CREATED
STARTING
RUNNING
COMPLETED
FAILED
INTERRUPTED
```

每次实际执行对应一个 Attempt。

重试和恢复必须区分原 Attempt 与新 Attempt。

## 9.5 状态转移条件

Coordinator 在状态转移前校验：

- 必要的前驱状态。
    
- Spec/Contract 版本。
    
- 人工及 Leader 门禁。
    
- Git SHA。
    
- Review/CI 证据。
    
- Session/Attempt 归属。
    
- 独占资源是否冲突。
    

不得因为 Agent 表示“任务完成”就直接推进所有后继。

---

# 10. Contract 协作协议

## 10.1 Contract Owner

每个 Contract 具有唯一 Owner。

由 Leader 在规划阶段指定。

前后端 API 可以默认 Backend Owner，但不是不可变的系统规则。

Consumer 可以提出意见，不能自行发布竞争性的权威版本。

## 10.2 实施中发现 Gap

任何 Implementer、Tester 或 Reviewer 可以发出：

`CONTRACT_GAP`

包含：

```
contract_id
contract_version
reporting_task
description
affected_components
proposed_change
blocking_scope
```

Coordinator 定位 Owner 并通知其处理。

没有 Owner 时升级 Leader 指派。

## 10.3 有限协商

```
CONTRACT_GAP
    ↓
Contract Owner Proposal
    ↓
Consumer Review
    ├── Accepted → Freeze Contract
    └── Rejected
           ↓
       Owner Revision（最多一次）
           ├── Accepted → Freeze
           └── Disputed / Timeout → Leader
```

要求：

- 允许一次集中反馈和一次修订。
    
- 超时或再次争议升级 Leader。
    
- Agent 不进行无限同步对话。
    
- 每次提交事件后允许结束 Turn。
    
- 等待中的任务不占用活跃推理资源。
    

## 10.4 实质性变更

如果 Gap 涉及：

- Spec。
    
- AC。
    
- 重大架构。
    
- 数据模型或兼容性要求。
    
- 工作包范围。
    

则不能仅由 Contract Owner 自动决定。

必须交给 Leader；涉及人工需求门禁时仍需人类批准。

## 10.5 版本与失效

Contract 必须具有版本或内容哈希。

合同更新后：

- 定位受影响任务。
    
- 更新依赖版本。
    
- 对旧实现和测试证据进行影响分析。
    
- 失效必要的旧 SHA/合同验证结果。
    
- 恢复符合新合同的相关任务。
    

其余无关工作不应暂停。

---

# 11. GitHub PR 与 Code Review

## 11.1 默认 Reviewer

默认采用 Codex Cloud Code Review。

优先使用 GitHub 集成的 Automatic Review。

不要求 Coordinator 自己启动常驻 Reviewer Session。

如 Codex Cloud Review 不可用，应提供可替换的独立 Reviewer Adapter。

## 11.2 Review 结果

标准化为：

```
PASS
CHANGES_REQUESTED
INCONCLUSIVE
UNAVAILABLE
```

至少记录：

- Repository ID。
    
- PR Number。
    
- Head SHA。
    
- Reviewer 来源。
    
- Review 完成证据。
    
- Findings。
    
- 时间。
    

没有 Review Comment 不等于 PASS。

Codex Review 不等于 GitHub 正式 Approval，也不能替代 CI 和业务 AC 验证。

具体结果映射必须经过 PoC 验证。

## 11.3 CI 结果

Coordinator 监听：

- PR 创建和更新。
    
- Workflow/Check 结果。
    
- Review 结果。
    
- 合并及队列状态。
    

同一个 PR Head SHA 的同一轮失败应尽可能合并为一个修复事件，避免频繁重复唤醒 Implementer。

## 11.4 修复循环

```
PR Submitted
    ↓
CI + Review
    ↓
Failed
    ↓
Coordinator Event
    ↓
Original Implementer Session
    ↓
Fix & Push
    ↓
New SHA
    ↓
CI + Review
```

修复事件必须关联当前有效 Head SHA。

过期结果不能覆盖新版本的检查状态。

## 11.5 防止无限循环

提供可配置的：

- 最大连续自动修复次数。
    
- 单次执行超时。
    
- 可选的模型或 API 成本预算。
    
- 重复失败检测。
    
- 异常升级规则。
    

达到限制后停止自动修复，通知 Diagnostic Reviewer 或 Leader。

这些限制是单任务故障保护，不是全局 Agent 资源配额。

---

# 12. Git 集成策略

## 12.1 两种模式

支持：

```
direct
staged
```

### Direct

PR 可以独立合并到目标分支。

适用：

- 单 Implementer。
    
- 互不依赖的独立功能。
    
- 向后兼容的增量修改。
    
- 不需要整体 Feature Gate 的任务。
    

### Staged

多个工作包共同构成不可独立交付的 Feature。

先合并至专属集成分支，通过整体验证后，再提交目标分支 PR。

适用：

- 强耦合前后端功能。
    
- 多模块共享接口变更。
    
- 数据库与业务逻辑必须整体配合。
    
- 单个工作包不能独立保持可接受的目标分支状态。
    

默认优先 Direct。

## 12.2 规划阶段决策

Leader 拆分任务时应确定：

- Integration Mode。
    
- Contract Owner。
    
- Integration Owner。
    
- 合并依赖。
    
- 目标分支。
    
- 需要的集成验证。
    

不应仅因为有多个 Agent 就自动创建集成分支。

## 12.3 Staged 分支结构

```
main
  │
  └── task/<RUN_ID>
        ├── work/<RUN_ID>/backend
        ├── work/<RUN_ID>/frontend
        └── work/<RUN_ID>/other
```

集成分支在 Contract 冻结后、正式开发前创建。

记录 Base SHA。

每个 Implementer 独占自己的工作分支和 Worktree。

Integration Owner 负责集成分支的写入。

## 12.4 集成执行

正常且无冲突的确定性 Git/GitHub 操作由 Coordinator 执行。

存在复杂冲突时：

1. Coordinator 记录冲突。
    
2. 启动短期 Integrator。
    
3. Integrator 分析和修复。
    
4. 如涉及合同或架构变更，升级 Leader。
    
5. 重新运行相关验证。
    

Integrator 不必常驻。

## 12.5 中途切换集成模式

如果原 Direct 任务中途发现强耦合：

1. 发出 `INTEGRATION_REQUIRED`。
    
2. 暂停受影响 PR 的自动合并。
    
3. Leader 判断是否需要切换模式。
    
4. 记录现有 PR、Commit、Branch 和 SHA。
    
5. 形成新的集成计划。
    
6. 安全地调整分支关系。
    

不得自动执行破坏性历史改写。

MVP 可以对复杂迁移采用人工辅助。

---

# 13. Integration Gate

## 13.1 局部与整体测试

必须区分：

**Worker 局部验证**

每个 PR 的 Review、CI 和工作包 AC。

**Feature 整体验证**

集成后的：

- API 兼容。
    
- 数据结构兼容。
    
- 跨模块逻辑。
    
- 核心业务 E2E。
    
- 必要回归。
    
- 整体 AC。
    

## 13.2 触发规则

Staged 模式下：

1. 所有必要 Worker PR 完成本地验证。
    
2. 按 DAG 顺序集成。
    
3. 固定集成分支 SHA。
    
4. 运行完整 Integration Gate。
    
5. 通过后提交最终 Feature PR。
    

不要求每合并一个 Worker PR 都执行完整 E2E。

可以在每次集成时运行快速 CI，在完整集成时运行全量验收。

## 13.3 失败归因

|失败|责任方|
|---|---|
|Backend API 不符合合同|Backend Implementer|
|Frontend 调用错误|Frontend Implementer|
|Contract 设计错误|Contract Owner / Leader|
|测试或 Fixture 错误|Tester|
|Git 合并冲突|Integration Owner / Integrator|
|跨模块责任不明确|Diagnostic Reviewer|
|重大架构问题|Leader|
|工具或 CI 平台异常|Coordinator 重试或报告|

Diagnostic Reviewer 输出：

```
failure
suspected_owner
evidence
confidence
suggested_action
```

Coordinator 只在归因明确且符合预定规则时自动重派。

其余情况通知 Leader。

## 13.4 SHA 一致性

所有验证证据必须对应实际代码版本。

代码、合同或集成目标变化时，旧证据需要按影响范围失效或重新核验。

不能复用不同 SHA 的 CI/Review 结果进行错误放行。

---

# 14. Merge Queue 管理

## 14.1 职责

GitHub Merge Queue 负责实际合并队列。

Coordinator 负责：

- 确认 PR 满足入队条件。
    
- 检查 DAG 依赖。
    
- 核验 Review、CI 和必要的人工授权。
    
- 调用 GitHub 入队。
    
- 追踪 Merge Group。
    
- 处理失败和移出队列。
    
- 成功合并后更新任务状态。
    
- 解除下游依赖并通知 Leader。
    

## 14.2 合并顺序

- 有业务依赖的 PR：由 DAG 决定准入顺序。
    
- 独立 PR：由 GitHub Merge Queue 管理。
    
- Staged：先完成集成，再提交整体 Feature PR。
    
- 合并组合失败：执行诊断与归因。
    
- 被移出队列：重新核验最新 GitHub 状态。
    

Coordinator 不需要自己实现另一个完整的 Merge Queue。

## 14.3 Merge Group 验证

GitHub Actions 的 Required Checks 必须支持 `merge_group` 事件。

不能将普通 PR SHA 或集成分支旧 SHA 的通过结果视为 Merge Group 当前 SHA 的通过结果。

## 14.4 GitHub 原生约束

必须尊重：

- Branch Protection。
    
- Repository Rulesets。
    
- Required Checks。
    
- Required Reviews。
    
- Merge Queue 策略。
    
- 实际 GitHub API 权限。
    

不允许绕过保护规则实现所谓自动合并。

---

# 15. 可靠事件投递协议

本章为第一版强制能力。

## 15.1 目标

Agent 意外退出、Runtime 调用失败、Coordinator 重启或网络中断时，事件不能静默丢失。

采用：

**Durable Event Store + At-least-once Delivery + Idempotent Execution**

不要求跨 SQLite、DSH、Codex 和 GitHub 实现严格端到端 Exactly-once。

## 15.2 事件与投递分离

业务事件表示发生了什么。

投递记录表示该事件是否成功送达指定目标。

Execution Attempt 表示 Agent 是否实际执行了工作。

三者不得混为一谈。

## 15.3 投递状态

推荐：

```
PENDING
DISPATCHING
ACCEPTED
RETRY_WAIT
COMPLETED
NEEDS_ATTENTION
CANCELLED
```

含义：

|状态|说明|
|---|---|
|PENDING|已持久化，尚未投递|
|DISPATCHING|正在请求 Runtime 执行|
|ACCEPTED|Runtime 已确认接受请求|
|RETRY_WAIT|暂时性失败，等待再次投递|
|COMPLETED|投递关联的处理结果已核验|
|NEEDS_ATTENTION|自动恢复失败，需要处理|
|CANCELLED|经授权明确取消|

`ACCEPTED` 不代表任务完成。

## 15.4 持久化先于投递

任何会触发 Agent 行为的消息必须先写入持久化存储。

禁止先调用 Runtime，再事后尝试记录事件而不具备恢复协议。

可采用 SQLite 事务及 Transactional Outbox。

## 15.5 消息重试

暂时性失败采用：

- 有限次数自动重试。
    
- 指数退避。
    
- 随机抖动。
    
- 可配置超时。
    
- 失败原因记录。
    

认证失效、权限不足、无效任务定义等确定性错误不能无限重试。

达到自动重试上限后进入 `NEEDS_ATTENTION`。

## 15.6 离线 Agent

Agent 当前不在线或 Session 处于 IDLE 时：

- 消息保留。
    
- Coordinator 尝试恢复 Session。
    
- Session 不能恢复时进入 Recovery 流程。
    
- 不因 Agent 离线而删除消息。
    

## 15.7 Agent 忙碌

同一 Session 已有活动 Turn 时：

- 新消息排队。
    
- 不启动重叠 Turn。
    
- 对可以合并的事件进行聚合。
    
- 按事件版本和依赖关系投递。
    

不同项目的 Session 可以独立执行。

## 15.8 不确定执行结果

最危险的情况是：

Coordinator 发起 Runtime 调用后超时，但 Agent 实际已经开始执行。

此时不得简单重新启动第二个 Agent。

必须先核查：

- 原 Operation ID。
    
- Execution Attempt。
    
- Session 状态。
    
- 进程或 Runtime 状态。
    
- 资源租约。
    
- 可能已经产生的 Git/GitHub 副作用。
    

无法确认时进入受控恢复流程，而不是并发重试。

## 15.9 Agent 执行中崩溃

处理流程：

1. 检测执行异常。
    
2. 保留事件和 Attempt。
    
3. 检查 Session 是否可恢复。
    
4. 可恢复则继续原工作。
    
5. 不可恢复则检查有效 Checkpoint。
    
6. 从可信 Checkpoint 重建新 Session。
    
7. 重新执行未完成部分。
    
8. 无有效恢复点时升级 Leader。
    

## 15.10 失败事件留存

`NEEDS_ATTENTION` 消息必须保存：

- 原始事件及 Payload 引用。
    
- 目标 Session。
    
- Project/Run/Task。
    
- 重试次数。
    
- 最后错误。
    
- 外部操作 ID。
    
- 当前恢复状态。
    

必须支持：

- 查看。
    
- 诊断。
    
- 重新投递。
    
- 取消。
    
- 升级 Leader。
    

不得在达到重试上限后自动删除消息。

## 15.11 消息保留策略

未完成和异常消息长期保留，直到明确处理。

已完成事件保留必要审计元数据和证据引用。

大型 CI 日志可使用 GitHub Artifact 或其他引用，不必完整复制到 SQLite。

历史清理必须有明确的保留策略。

## 15.12 项目隔离

消息必须绑定 Project 和 Run。

Project A 的消息重试不能唤醒 Project B 的 Agent。

即使两个 Session ID 的原生字符串相同，也必须通过 Runtime 和项目归属区分。

## 15.13 Coordinator 崩溃恢复

Core 重启后：

1. 读取未完成事件。
    
2. 识别未完成投递。
    
3. 核查不确定状态的 Attempt。
    
4. 核验 Session 和工作区。
    
5. 必要时重新查询 GitHub。
    
6. 恢复可安全继续的工作。
    
7. 对无法确认的操作进入待处理状态。
    

不得重复执行危险操作。

---

# 16. Leader 事件驱动机制

## 16.1 Leader 生命周期

```
Human Starts Leader
       ↓
Leader Planning
       ↓
Submit Tasks to Coordinator
       ↓
Leader Turn Ends
       ↓
WAITING FOR EVENTS
       ↓
Coordinator Notification
       ↓
Leader Resumes
       ↓
Decision / Dispatch / Delivery
```

Leader 不应持续轮询 Worker。

## 16.2 需要通知 Leader 的事件

包括：

- Tester 提交验证合同。
    
- Contract 无法达成一致。
    
- 新 DAG 节点 Ready。
    
- 集成失败无法归因。
    
- 需要改变 Integration Mode。
    
- 重试达到上限。
    
- 恢复失败。
    
- 重要人工门禁等待。
    
- Delivery Run 完成。
    

多个事件应聚合，避免反复唤醒。

## 16.3 Leader 仍负责委派

Coordinator 可以判断 Ready。

但新工作包如何分配、是否新建 Agent、是否调整角色等由 Leader 的计划决定。

对已经明确批准自动执行的任务，Coordinator 可直接按计划启动或恢复对应 Session。

对新发现的业务工作、未授权的任务或需要重新拆分的工作，必须交给 Leader。

## 16.4 Codex Desktop 兼容性

Leader 必须支持人类从 Codex Desktop 启动和继续。

同时提供两种事件通知模式：

**自动模式**

如果实际 Codex API 能可靠控制目标 Leader Thread，则由 Coordinator 自动恢复。

**兼容模式**

Coordinator 持久化待处理通知。

人类在 Codex Desktop 中继续 Leader，Leader 通过 MCP 领取事件。

自动唤醒不能成为基础架构正常运行的必需条件。

Codex Desktop 侧边栏状态也不能作为任务状态真相源。

---

# 17. Session 与 Handoff 恢复

## 17.1 原则

恢复优先级：

1. 原 Session。
    
2. 有效 Handoff Checkpoint。
    
3. Leader 决策。
    

Agent 的临时上下文不应成为唯一的进度来源。

## 17.2 Checkpoint 内容

至少包含：

```
project_id
run_id
task_id
attempt_id
session_id

spec_version
contract_versions

base_sha
output_sha

completed_work
implementation_decisions
next_steps
known_issues
validation_results

handoff_version
```

必须能够对应到具体代码版本。

## 17.3 Checkpoint 创建时机

至少在以下情况创建：

- 重要逻辑提交后。
    
- 工作包阶段完成。
    
- 等待外部事件前。
    
- 主动交接前。
    
- Agent 正常结束当前工作前。
    

不要求每次很小的代码修改都写一份完整 Handoff。

## 17.4 Session 不可恢复

必须：

1. 找到最近有效 Checkpoint。
    
2. 校验 Git SHA 和 Handoff。
    
3. 隔离超出 Checkpoint 的未知修改。
    
4. 重建独立 Worktree。
    
5. 创建新 Session。
    
6. 注入角色、Spec、Contract 和 Handoff。
    
7. 继续未完成任务。
    

不得将无 Handoff 的未提交修改直接交给新 Agent 反向推断。

## 17.5 Git 状态保护

- 不覆盖人类工作区。
    
- 不执行未经授权的破坏性 reset/rebase。
    
- 不随意改写共享或受保护分支历史。
    
- 不自动回滚已合并到目标分支的代码。
    
- 已合并变更需要撤销时创建独立 Revert 工作流。
    
- Worktree 清理前必须验证归属并保留必要审计信息。
    

## 17.6 Checkpoint 一致性

Git Commit、Handoff 文件与 SQLite 状态无法直接通过一个数据库事务完成。

因此需要可恢复的 Checkpoint 提交协议。

只有经过校验的 Checkpoint 才能标记为有效。

中途崩溃产生的不完整 Checkpoint 不得成为恢复依据。

---

# 18. Coordinator MCP Server

## 18.1 目标

为 Codex Leader 提供结构化的项目、任务、事件和状态操作。

MCP 是访问入口，不是后台任务的生命周期容器。

耗时操作返回 Operation ID，由 Coordinator Core 异步执行。

## 18.2 建议工具

### 项目与 Run

```
register_project
get_project_status
create_run
bind_leader
submit_plan
get_run_status
```

### 任务与事件

```
dispatch_ready_tasks
get_pending_events
acknowledge_events
submit_decision
get_task_status
```

### 集成与恢复

```
request_integration
approve_merge
retry_or_recover_task
pause_run
resume_run
cancel_run
get_delivery_report
```

工具名允许在技术设计时调整或合并。

不要求暴露内部 SQLite 表或无约束系统命令。

## 18.3 MCP 权限

必须校验：

- 调用者授权。
    
- Project 归属。
    
- Run 归属。
    
- 操作所需角色。
    
- 当前状态是否允许操作。
    
- 是否需要人工授权。
    

不能允许 Agent 通过自行提交一个 `approved: true` 字段绕过真实人工门禁。

## 18.4 多 MCP Client

不同 Leader 通过独立 MCP Client 访问同一个 Core。

要求：

- 连接断开不影响后台运行。
    
- 一个 Client 不能读取或修改未获授权的项目。
    
- 不重复消费事件。
    
- 不重复创建 Runtime Session。
    
- 同一 Run 的 Leader 管理权保持单写者语义。
    

本期面向单个本地用户的多个项目，不要求实现多用户 SaaS 身份体系。

## 18.5 返回结构

建议：

```
{
  "operation_id": "op-123",
  "accepted": true,
  "project_id": "project-a",
  "run_id": "run-a1",
  "current_state": "RUNNING",
  "next_action": "WAIT_FOR_EVENTS",
  "requires_human_action": false,
  "evidence_refs": [],
  "error_code": null
}
```

---

# 19. Runtime Adapters

## 19.1 DSH Adapter

默认使用 DSH 承担：

- Tester。
    
- Implementer。
    
- Diagnostic Reviewer。
    
- Integrator。
    

MVP 优先支持 Headless。

必须支持：

- 创建 Session。
    
- 持久化 Session ID。
    
- 恢复已有 Session。
    
- 指定工作目录。
    
- 传递 Task Envelope。
    
- 获取结构化事件和最终结果。
    
- 检测完成、失败、中断。
    
- 超时和取消。
    
- 独立 Worktree 运行。
    

可选的 SDK Adapter 在需要更细粒度会话控制时实现。

## 19.2 DSH 恢复限制

必须验证真实安装版本的：

- Session 持久化。
    
- 工作目录绑定。
    
- Agent Preset。
    
- 权限模式。
    
- Session 独占行为。
    
- Headless/SDK 兼容性。
    

不能假定仅有 Session ID 就能在任意目录恢复。

恢复不满足条件时使用 Handoff 协议。

## 19.3 Codex Adapter

支持：

- Codex Desktop 人工启动 Leader。
    
- MCP 绑定 Leader 与 Run。
    
- 读取待处理事件。
    
- 人工继续。
    
- 可选 App Server 自动恢复。
    

外部 Thread 是否可见、能否被 Desktop 接管、能否自动继续，均应通过 PoC 验证。

## 19.4 Review Adapter

默认 Codex Cloud Review。

必须能关联：

- Repository。
    
- PR。
    
- Head SHA。
    
- Review 完成证据。
    
- Findings。
    
- 审查版本。
    

Cloud Review 不可用时提供独立 Reviewer Fallback。

---

# 20. 项目脚手架

## 20.1 目标

能够为新建或已有 Git 仓库初始化统一的 Agent 协作规范。

脚手架包括：

- AGENTS.md。
    
- Role Docs。
    
- SDD/Workflow Docs。
    
- Contract Templates。
    
- Handoff Templates。
    
- Coordinator 项目配置。
    
- Codex Skill。
    
- 校验及诊断脚本。
    

运行时 SQLite、凭据和临时工作区不应放入业务仓库。

## 20.2 推荐目录

```
project/
├── AGENTS.md
├── .codex/
│   └── config.toml
├── .agents/
│   └── skills/
│       └── agent-delivery/
│           └── SKILL.md
├── docs/
│   ├── project/
│   │   ├── vision.md
│   │   ├── roadmap.md
│   │   └── architecture.md
│   ├── specs/
│   │   ├── spike/
│   │   ├── official/
│   │   ├── archived/
│   │   └── superseded/
│   ├── contracts/
│   ├── agents/
│   │   ├── INDEX.md
│   │   ├── LEADER.md
│   │   ├── IMPLEMENTER.md
│   │   ├── TESTER.md
│   │   ├── REVIEWER.md
│   │   └── INTEGRATOR.md
│   └── workflow/
│       ├── SDD.md
│       ├── SCHEDULING.md
│       ├── VALIDATION.md
│       ├── CONTRACTS.md
│       ├── INTEGRATION.md
│       ├── RECOVERY.md
│       └── GIT.md
├── coordination/
│   ├── project.yaml
│   └── templates/
│       ├── task-envelope.yaml
│       ├── contract.md
│       └── handoff.md
├── scripts/
│   ├── validate-agent-project
│   └── agent-project-doctor
└── .gitignore
```

这是建议结构，具体可根据现有项目规范调整。

不允许仅为遵循模板创建大量重复文档。

## 20.3 文档职责

`AGENTS.md`

公共行为规则及渐进加载入口。

`docs/agents/`

角色职责、输入、输出和异常处理。

`docs/workflow/`

SDD、Contract、测试、集成、恢复、Git 等规则。

`docs/project/`

具体项目事实、架构和路线。

`coordination/project.yaml`

可提交的项目级配置；不包含凭据或运行状态。

## 20.4 角色文档

每个角色文档应明确：

- 职责。
    
- 权限边界。
    
- 必须读取的输入。
    
- 应提交的结果。
    
- 可调用的 Coordinator 操作。
    
- Checkpoint 要求。
    
- 完成条件。
    
- 失败升级规则。
    

不得在每个角色文件中重复复制整套状态机。

---

# 21. 初始化 Skill 与 Script

## 21.1 交付内容

必须提供：

- 初始化 Skill。
    
- 独立 CLI。
    
- 模板生成。
    
- 配置检查。
    
- 已有项目迁移策略。
    
- 安装和故障诊断。
    

Script 必须可以脱离 LLM 独立运行。

## 21.2 CLI

建议：

```
delivery init .
delivery init . --dry-run

delivery validate .
delivery doctor .
delivery status
```

命令名称可调整。

## 21.3 初始化流程

1. 检查目标目录和 Git 仓库。
    
2. 检测已有 AGENTS.md。
    
3. 检测现有 SDD、角色和 CI 文档。
    
4. 检测 Codex、DSH、GitHub 工具。
    
5. 检查 Coordinator Core。
    
6. 检查 MCP 连接配置。
    
7. 生成或补充项目规范。
    
8. 写入 Project 配置。
    
9. 注册 Project。
    
10. 校验目录与文件。
    
11. 输出初始化报告。
    

## 21.4 幂等与安全

重复执行不得：

- 覆盖现有自定义 AGENTS.md。
    
- 删除用户规则。
    
- 重写 GitHub Actions。
    
- 破坏现有分支保护配置。
    
- 删除历史 Handoff。
    
- 创建重复 Project。
    
- 将密钥提交到仓库。
    

存在冲突时输出 Diff 或迁移建议。

## 21.5 初始化 Skill

Skill 应负责指导：

- 何时初始化。
    
- 如何检查已有项目。
    
- 如何读取项目事实。
    
- 如何调用 Script。
    
- 哪些操作需要用户批准。
    
- 如何验证初始化结果。
    
- 如何处理迁移问题。
    

Skill 不应直接猜测项目技术栈或覆盖用户设置。

---

# 22. Coordinator 工程结构

建议：

```
agent-delivery-coordinator/
├── src/
│   ├── core/
│   │   ├── projects/
│   │   ├── runs/
│   │   ├── dag/
│   │   ├── events/
│   │   ├── sessions/
│   │   ├── policies/
│   │   └── persistence/
│   ├── adapters/
│   │   ├── codex/
│   │   ├── dsh/
│   │   └── github/
│   ├── services/
│   │   ├── contracts/
│   │   ├── integration/
│   │   ├── recovery/
│   │   └── notifications/
│   ├── mcp/
│   ├── ipc/
│   ├── daemon/
│   └── cli/
├── templates/
│   └── project/
├── skills/
│   └── agent-delivery-init/
│       ├── SKILL.md
│       ├── references/
│       └── scripts/
├── tests/
│   ├── unit/
│   ├── protocol/
│   ├── integration/
│   └── e2e/
└── docs/
```

不强制使用该文件层级。

Coordinator Core、MCP、CLI 和模板必须共享协议定义，避免同一条规则在多处出现不同版本。

---

# 23. 可靠性与安全

## 23.1 SQLite

首版使用 SQLite。

需要：

- Schema Migration。
    
- 事务。
    
- 必要唯一约束。
    
- 并发写入一致性。
    
- 事件状态持久化。
    
- 崩溃恢复。
    
- 数据备份和诊断。
    

Core 是唯一活动的工作流调度进程。

多个 MCP Client 通过 IPC 访问它。

## 23.2 资源互斥

必须实施：

- Session Turn 互斥。
    
- Worktree 可写租约。
    
- 集成分支独占写入。
    
- 必要的共享 Git 资源互斥。
    
- Execution Attempt 版本保护。
    

不需要：

- 全局 Agent 池。
    
- 固定并发配额。
    
- Project 级公平调度。
    
- 预留执行席位。
    

## 23.3 外部操作幂等

对于以下操作需要重复调用保护：

- 创建 Session。
    
- 创建 Worktree。
    
- 创建 PR。
    
- 提交 Review 请求。
    
- 触发 CI。
    
- 创建集成分支。
    
- 执行合并。
    
- 重试任务。
    
- 恢复 Session。
    
- 发送 Leader 通知。
    

对无法查询执行状态的外部副作用，必须定义失败后的核验和人工处理路径。

## 23.4 最小权限

要求：

- GitHub Token 不写入业务仓库。
    
- Runtime 凭据不写入 Handoff。
    
- Webhook 验签。
    
- Project/Run 归属验证。
    
- 文件路径规范化。
    
- Git 操作范围检查。
    
- 人工批准不可伪造。
    
- Agent 不直接操作 Coordinator 权威数据库。
    

本地单用户部署不自动等于强进程级安全隔离。

如果多个 Agent 共享 OS 用户及凭据，需要在 PoC 中明确实际可实现的隔离级别。

---

# 24. 可观测性与人工干预

## 24.1 查询能力

至少支持：

```
List Projects
List Runs
Get Run Status
Get DAG
Get Sessions
Get Pending Events
Get Failed Deliveries
Get PR / CI / Review Status
Get Integration Status
Get Recovery Checkpoints
Get Delivery Evidence
```

## 24.2 多项目总览

应能展示：

|Project|Run|Leader|当前阶段|待处理事项|
|---|---|---|---|---|
|A|A1|Leader A|Implementation|CI Failure|
|B|B1|Leader B|Integration|None|
|C|C1|Leader C|Waiting|Contract|

不要求首版开发复杂 Web UI。

CLI 和 MCP 状态查询即可。

## 24.3 人工干预

支持：

- 暂停/恢复 Run。
    
- 取消 Run。
    
- 停止进一步自动合并。
    
- 重试事件投递。
    
- 恢复指定 Agent。
    
- 查看失败证据。
    
- 升级 Leader。
    
- 重新绑定 Leader。
    
- 处理人工审批。
    

所有干预操作必须记录审计信息。

---

# 25. 验收标准

## AC-01 初始化

在空 Git 仓库执行初始化，生成有效文档、配置和 Skill。

## AC-02 幂等

在已有项目重复初始化，不覆盖现有用户内容，不重复注册 Project。

## AC-03 多 Leader

两个 Codex Leader 可以同时通过不同 MCP Client 连接同一个 Coordinator Core。

## AC-04 项目隔离

Project A 的 Session 不会被分配到 Project B。

Project A 的事件也不会投递给 Project B。

## AC-05 无全局 Agent 配额

Leader 可按 DAG 和任务计划启动任意数量的独立 Worker Session，不要求预先配置 Project/Run Agent 限额。

若底层 Runtime 拒绝或限流，Coordinator 应保留任务并适当重试，而不是丢失任务。

## AC-06 Tester 门禁

Tester 完成测试矩阵及代码后，Leader 必须复核。

复核通过前，Implementer 不得正式开始实施。

## AC-07 并行开发

两个独立 Implementer 可以在不同 Worktree 并行执行。

## AC-08 Contract Gap

Implementer 可在实施中上报 Gap，Owner 和 Consumer 完成有限协商，争议升级 Leader。

## AC-09 PR 修复循环

PR 触发 CI 和 Review；失败后恢复对应 Session 修复。

新 SHA 重新验证。

## AC-10 Direct Merge

独立 PR 通过门禁后进入 Merge Queue，合并结果正确更新 DAG。

## AC-11 Staged Integration

两个耦合工作包合并至集成分支，整体测试通过后提交最终 PR。

## AC-12 集成失败归因

制造跨模块接口错误，Diagnostic Reviewer 能给出归因；明确问题交回指定 Implementer，否则升级 Leader。

## AC-13 离线消息留存

Agent 离线时消息不丢失。

Agent 恢复后能够处理仍然有效的消息。

## AC-14 投递失败重试

模拟 Runtime 启动失败和临时网络错误，验证事件持久化及自动重试。

## AC-15 执行结果不确定

模拟 Coordinator 调用超时但 Agent 已经启动。

系统不得重复启动冲突的执行实例。

## AC-16 异常队列

模拟持续投递失败。

达到上限后事件进入待处理状态，能够查看、重放或取消。

## AC-17 Session 恢复

模拟 Session 不可恢复。

从最近有效 Handoff 和 Git SHA 创建新 Session。

不得直接接手无记录的未提交修改。

## AC-18 Coordinator 重启

在 Agent 运行、等待 CI、等待 Review 和 Merge Queue 执行等状态下重启 Core。

要求任务和事件得到恢复，不发生重复危险操作。

## AC-19 多项目并发

两个独立 Git 仓库，各自拥有 Leader、Tester 和两个 Implementer。

两个 Run 同时推进，不发生 Session 或事件串扰。

## AC-20 Git 资源互斥

同一 Worktree 或集成分支不能被两个执行实例并发写入。

不同项目及互不冲突的 Worktree 可以正常并行。

## AC-21 Leader 异步通知

PR 合并后如果存在新 Ready 节点，Coordinator 能通知正确的 Leader。

整个 Run 完成时能触发最终技术验收。

## AC-22 人工门禁

无有效人工批准时不能绕过需求、权限或高风险操作门禁。

## AC-23 完整端到端交付

完成：

```
Human
→ Codex Leader
→ DSH Tester
→ Leader Review
→ DSH Implementer × 2
→ PR
→ Codex Review / CI
→ Automatic Fix Loop
→ Integration Gate
→ Merge Queue
→ Leader Delivery
→ Human Verification
```

至少通过一个真实或受控测试仓库验证，并覆盖两个项目同时使用同一个 Core。

---

# 26. 技术 PoC

正式大规模实现前，应验证：

|能力|核验内容|
|---|---|
|Codex MCP|Desktop 与本地 Core 的连接和断开行为|
|Codex Leader|Thread 登记、恢复与事件通知|
|DSH Headless|创建、恢复、会话归属和退出行为|
|DSH 权限|Worktree 与文件访问限制|
|DSH JSON|执行结果和错误事件的可解析性|
|Codex Review|GitHub Review 实际触发和结果格式|
|Review Gate|结果是否能可靠绑定 PR SHA|
|GitHub CI|PR、Check 和 Workflow 事件|
|Merge Queue|`merge_group` 检查及失败行为|
|多项目|双 MCP Client、双 Run 与事件隔离|
|恢复|Runtime 超时、Session 丢失、Core 崩溃|

不能将未经 PoC 证明的接口行为视为已完成能力。

---

# 27. 实施阶段

## Phase 0：技术验证

完成各 Runtime 和 GitHub 能力 PoC。

输出：

- 实际可用能力。
    
- 风险。
    
- Fallback。
    
- Adapter 技术方案。
    

## Phase 1：Coordinator 基础

实现：

- Core Daemon。
    
- IPC。
    
- MCP Server。
    
- SQLite。
    
- Project Registry。
    
- Run/Task 状态。
    
- Session Registry。
    
- Event Store。
    
- 持久化投递与重试。
    
- 项目隔离。
    

## Phase 2：单项目自动闭环

实现：

- Codex Leader MCP 操作。
    
- DSH Adapter。
    
- Tester 前置验证。
    
- Implementer。
    
- PR/CI/Review 适配。
    
- 修复循环。
    
- 基本恢复。
    

完成单项目端到端测试。

## Phase 3：多 Agent 协作与集成

实现：

- 多 Implementer。
    
- Contract Gap 协商。
    
- Direct/Staged。
    
- Integration Gate。
    
- Diagnostic Reviewer。
    
- Merge Queue。
    
- DAG 解锁与 Leader 通知。
    

## Phase 4：可靠性强化

实现：

- Handoff Checkpoint。
    
- Session 重建。
    
- Core 崩溃恢复。
    
- 事件死信/异常处理。
    
- 旧 Attempt 保护。
    
- 多项目并发和隔离故障测试。
    

## Phase 5：初始化与交付

实现：

- 项目模板。
    
- 初始化 Skill。
    
- CLI。
    
- 项目迁移。
    
- 校验与诊断。
    
- 安装及使用文档。
    

阶段可以根据真实工程依赖调整，但不允许通过破坏多项目隔离或牺牲可靠性来提前宣称完成。

---

# 28. 当前已确定的设计决策

1. Codex 是唯一强制使用的 Leader Runtime。
    
2. 其他角色默认使用 DSH，允许通过 Adapter 替换。
    
3. PR Code Review 优先使用 Codex Cloud Review。
    
4. GitHub 负责 CI、PR 和 Merge Queue。
    
5. Coordinator 是非 LLM、本地常驻服务。
    
6. Coordinator 不维护全局 Worker 池。
    
7. Coordinator 不设置固定 Agent 数量或项目并发配额。
    
8. Leader 决定工作包及实际 Agent 委派。
    
9. Coordinator 负责观察状态、执行授权计划和投递事件。
    
10. 每个 Project 的 Agent Session 独立，不跨项目复用。
    
11. Worker Session 默认也不跨 Delivery Run 复用。
    
12. Agent 等待外部事件时不保持活跃推理。
    
13. Tester 在开发前编写测试，Leader 必须复核。
    
14. Contract 拥有唯一 Owner。
    
15. Contract Gap 可以在实施过程中上报。
    
16. Contract 协商轮次有限，无法达成一致则升级 Leader。
    
17. PR、Review、CI 通过 GitHub 事件形成修复闭环。
    
18. 默认 Direct，强耦合任务才采用 Staged。
    
19. 正常集成由 Coordinator 完成。
    
20. 复杂集成使用短期 Agent。
    
21. 集成失败由 Diagnostic Reviewer 进行初步归因。
    
22. GitHub Merge Queue 管理最终合并。
    
23. Session 丢失后依赖可信 Handoff 和 Git Checkpoint。
    
24. 消息采用持久化、至少一次投递与幂等执行。
    
25. 投递失败必须留存并可重试。
    
26. 同 Session、Worktree 和集成分支必须满足必要互斥。
    
27. 多个 MCP Client 共享一个 Coordinator Core。
    
28. Codex Desktop 不是状态真相源。
    
29. 不自研通用工作流引擎。
    
30. 不引入无实际必要的 Agent 或基础设施。
    

---

# 29. 对 Codex 的实施要求

请以本规格为需求基线，而不是直接将所有条款机械转换成代码。

首先：

1. 验证外部工具能力。
    
2. 输出技术架构。
    
3. 定义数据模型。
    
4. 定义事件和投递协议。
    
5. 定义 Session 生命周期。
    
6. 定义 MCP API。
    
7. 定义 Runtime Adapter。
    
8. 定义 GitHub Adapter。
    
9. 定义 Handoff 恢复协议。
    
10. 编写验证矩阵与必要的自动化测试。
    
11. 拆分真实依赖的实施任务。
    
12. 开始最小闭环开发。
    

开发时遵守：

- 不擅自扩展为全局 Agent 调度平台。
    
- 不引入资源配额和 Worker 池作为默认架构。
    
- 不为了并行而增加 Agent 数量。
    
- 不让 Coordinator 进行本应由 Leader 做的业务决策。
    
- 不以 Agent 自述代替 GitHub、Git 或 CI 的实际证据。
    
- 不让不同 Project 的 Session 互相复用。
    
- 不丢弃失败消息。
    
- 不在结果不确定时盲目重复执行危险操作。
    
- 不把 Prompt 当作真实权限边界。
    
- 不静默绕过人工门禁。
    
- 不为未来扩展过度抽象。
    

如发现需求中存在不合理的技术假设，应提出修正方案及其依据，而不是强行实现或隐瞒限制。

最终交付必须包括：

- 可运行的 Coordinator。
    
- MCP Server。
    
- Runtime Adapters。
    
- 初始化 Skill。
    
- 项目脚手架。
    
- CLI。
    
- 单元与协议测试。
    
- 故障注入测试。
    
- 端到端交付演示。
    
- 安装、配置、恢复及维护文档。
    

---

# 30. 最终验收场景

用户在本地安装 Coordinator 后：

1. 在 Codex Desktop 打开 Project A。
    
2. 使用初始化 Skill 配置项目。
    
3. 与 Leader A 讨论需求。
    
4. Leader A 完成规划并启动 Tester、Implementers。
    
5. 各 Agent 异步运行，按需接受事件并继续工作。
    
6. PR 经 Review、CI、集成和 Merge Queue 完成交付。
    
7. Leader A 收到交付通知并向人类报告。
    

同时：

1. 用户打开独立的 Project B。
    
2. 启动 Leader B。
    
3. Leader B 通过另一个 MCP Client 连接同一 Coordinator。
    
4. Project B 创建自己的 Run 和 Agent Sessions。
    
5. Project A 和 Project B 独立执行。
    
6. 任一 Project 的 CI、Session 或 Agent 出现故障，不导致另一个 Project 状态错乱。
    
7. Coordinator 重启后能够恢复两个 Project 的未完成事件和执行记录。
    

整个过程不要求人工持续转发消息、轮询 CI 或手工唤醒每个 Implementer。

**最终交付目标：一个轻量本地 Coordinator，同时服务多个相互隔离的 Codex 项目，让 Leader 与各自的 Agent 团队通过持久化事件完成异步、可验证、可恢复的软件交付。**

---

# 31. 技术参考

实施时优先核实实际安装版本的官方资料：

- [OpenAI Codex App Server](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server)
    
- [OpenAI Codex Code Review Rules](https://developers.openai.com/blog/custom-code-review-rules-for-codex)
    
- [DeepSeek Harness Headless](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/bundle/headless/README.md)
    
- [DeepSeek Harness CLI](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cli-help.md)
    
- [GitHub Merge Queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)
    
- [GitHub Webhook Validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
    

**文档结束。**