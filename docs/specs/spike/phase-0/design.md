# Phase 0 技术设计与验证合同

## 来源与状态

- Requirements: [spec.md](spec.md)
- Planning source: direct
- Updated: 2026-11-12
- 技术草案：Leader 候选方案，未声明实现或真实 Runtime 能力；新增权限边界在实施前需单独批准。

## 规则适配

根 AGENTS 保留通用安全、任务分级、渐进式阅读及交付证据。
VCS 使用 GitHub Flow，Git 文档只管理命令安全；角色文档只管理职责，不重复产品状态机。
保留 SDD 的需求/AC、职责分离、审批与生命周期，简化内部任务审批和无意义文档。
保留既有 docs / metadata / workspace / test-integrity 规范，通过现有索引路由。
原文仅保存为不可变需求证据，独立索引按章节定位；不默认全量加载。

## 候选架构

```text
Codex Desktop Leader A/B
  → MCP stdio A/B（身份绑定、参数校验、转发）
  → 本地受控 IPC
  → 单 Core（命令处理、状态机、Outbox、恢复、Adapter）
  → SQLite WAL / Git / GitHub / DSH / Codex
```

MCP 进程退出不拥有后台任务生命周期；Core 是唯一活动调度者。
候选 IPC 为 macOS Unix socket；同 OS 用户的授权边界仍须验证，不能只靠 socket 文件权限。
pnpm workspace 按职责逐步引入 `protocol/core/mcp/cli/adapters`，不为逻辑模块全部创建独立服务。
CLI 和 MCP 共享协议定义；脚手架与 Skills 从已接受的权威合同生成，不各维护一套规则。

## 数据与事件

关系、操作和状态边界见 [协议草案](refs/protocol-sketch.md)，尚不锁定生产 Schema。
关键约束：Project / Run 外键及授权、Session Turn 互斥、Worktree/集成写租约、Attempt 版本保护、Outbox 原子写入。
SQLite 事务覆盖本地状态与待投递意图；外部调用以持久化 Operation ID 核验，不承诺跨系统 exactly-once。
调用超时或 Core 崩溃后先 reconcile，不盲目重放写操作。
Checkpoint 只有在 Git SHA、Handoff 和状态提交协议校验后有效，未知修改不能自动接管。

## Runtime 与 GitHub

DSH 默认承担执行角色，先用隔离 DSH_HOME 做帮助和错误探测；真实模型、恢复与沙箱分别验证。
Codex 先验证独立 app-server 的协议握手，不能据此承诺 Desktop Thread 接管或自动唤醒。
Leader 基础模式是人工继续后经 MCP 领取持久化事件，自动恢复作为能力协商结果。
GitHub Adapter 以 repository ID、PR、当前 Head SHA、外部事件 ID 关联证据；没有 Review 评论不推出 PASS。
新仓库建立基线后，先有真实 CI 和 Review，再请求管理员配置准确 Required Checks 与原生 Merge Queue。

## 验证合同

| AC | 检查与 Oracle | 证据 / 限制 |
| --- | --- | --- |
| AC-001 | 对照根规则、VCS、Git、任务模板，无生效的旧 dev/release 路线 | 静态 diff；不删除历史 dev |
| AC-002 | metadata schema、相对文件链接、行预算、原文 SHA256 | 自动静态检查与人工阅读路径演练 |
| AC-003 | 各角色能定位输入/输出/权限/升级；Tester 先于正式实施 | 独立规划和只读审查 |
| AC-004 | 各能力分层记录；握手只判协议响应，不判 Session 或模型成功 | 具体 Oracle 见 PoC 矩阵 |
| AC-005 | 对照原文第4～6、15～19、23章审查隔离和恢复边界 | 草案静态审查，不算生产验收 |
| AC-006 | 新会话 Reviewer 只读独立复核，不修改产物；处理阻塞发现 | 记录会话、范围与未测内容 |

静态命令：`node scripts/check-docs.mjs`、`git diff --check`、暂存后 `git diff --cached --check`；标准库脚本检查 metadata、文件链接和来源哈希，预算只警告。
CI 使用只读权限、固定 checkout 提交、不保留凭据，响应 pull_request / merge_group；远端实际通过另行核验，不作为产品 CI 验收。
CLI 版本与 `--help` 为只读接口证据；握手仅使用隔离配置、无任务生成和无真实仓库写入。
动态 PoC 明确预期：真实完成事件/错误、正确退出码、同目录恢复与越权拒绝、同 Session 不重叠。
测试代码和故障注入必须在生产实现前由 Tester 形成独立合同，再由 Leader 复核；本轮文档检查不冒充该门禁。

## 独立验证

本轮由独立会话规划文档与 PoC 的验收 Oracle，再用新会话做最终只读静态审查。
规划者不能宣称已执行测试；Reviewer 只读 Spec / diff / 原始证据，不继承实现者结论。
产品高风险权限与自动合并能力需额外独立动态验证，本轮不启用。

## 尚未定案

DSH Headless 真实认证与权限约束；人类批准如何从 Agent 不可伪造的入口提交；Desktop Thread 可控制范围。
Codex Review 的真实完成格式和 SHA 关联；Merge Queue / merge_group 的仓库级配置及端到端行为。
依赖版本、生产 SQLite 驱动、迁移方式和 IPC 协议在能力证据充分后锁定。
