---
summary: 为接手 CoCo 的新 Codex 会话提供已核验基线、授权边界、下一任务和最小阅读及验证入口。
read_when:
  - 在新 Codex 会话中继续推进 CoCo
  - 恢复本轮已合并规则及 Phase 0 之后的工作上下文
---

# CoCo 下一会话交接

核验日期：2026-11-12。请先确认当前 Git 状态，再直接推进下述任务；无需重新询问项目名称、文档语言或已批准技术栈。
本文件是启动资料，不替代 Spec、任务清单或真实外部授权；动态状态须重新核验。

## 目标与边界

CoCo 用一个本地、非 LLM 的 Coordinator 服务多个隔离项目，连接 Codex Leader、DSH 执行角色与 GitHub。
交付 Core、MCP、Runtime/GitHub Adapters、CLI、项目脚手架、角色规则和初始化 Skills。
Leader 做需求/架构/拆分/授权/测试复核，Core 执行确定性计划、事件、门禁和恢复。
不做全局 Worker 池、固定 Agent 配额、通用工作流引擎或自研 Merge Queue。

已批准：TypeScript、Node.js 26 LTS、pnpm workspace、官方 MCP TypeScript SDK、Zod、SQLite WAL、Vitest、Markdown/YAML。
文档用中文；依赖具体版本、SQLite 驱动和 IPC 尚未锁定。完整项目事实见 [overview.md](overview.md)。

## Git 与当前交付状态

- 仓库：[AMindFlow/CoCo](https://github.com/AMindFlow/CoCo)，组织公开仓库。
- [PR #1](https://github.com/AMindFlow/CoCo/pull/1) 已合并，远端 main 核验基线：`55a3901848850b1e47598ace74015ca759f7afae`。
- `c073285` 是规则/Phase 0 准备提交，`ffecf41` 是 DSH 配置与真实 PoC 证据提交，均已包含在上述基线。
- 本交接工作分支：`docs/session-handoff`，从该 `origin/main` 创建；开始交接前工作区干净。
- 本地旧 `main`、`dev` 或旧 PR 分支可能仍保留，不假定它们最新，不自动删除或重写。
- 使用 GitHub Flow，新产品工作分支从最新 `origin/main` 创建；本交接分支不作为产品集成基线。
- 若交接文档尚未合并，先读取它再切分支；可用 `gh pr list --repo AMindFlow/CoCo --head docs/session-handoff` 定位对应 PR。

当前没有可运行的 Coordinator、MCP Daemon、生产 Adapter、产品初始化 CLI 或产品测试套件。
当前可执行脚本主要是文档检查器，不代表完整技术栈已安装或产品已实现。
Phase 0 仍为 `Review: approved / Implementation: in_progress`；PR 合并没有将其变成 `verified`。

## GitHub / Codex 设置

main Ruleset 已 API 核验：Active、无 bypass、禁止强推/删除、必须 PR、1 个 Approval、旧批准随新推送失效、讨论需解决。
只允许 Squash，要求原生 Merge Queue，Required Check 为 `docs-integrity`，绑定 GitHub Actions（App ID 15368）。
GitHub Connector 已能读取本仓库和组织安装记录，用户已确认在 Codex 关联仓库。
这不证明 Automatic review 已触发，也不证明 Review、Approval 与 Merge Queue 的端到端流程已通过。
准确配置快照和能力状态见 [PoC 矩阵](../specs/spike/phase-0/refs/poc-matrix.md)；后续操作前重新查远端。

仍需验证独立审批身份：此前 PR 通过 `secretpot` 创建，同账号不能批准自己的 PR。
用户询问过自建 Reviewer App，但未验证其已创建/安装；不能假定这个 Approval 门槛已有自动满足路径。
官方 Codex Review 评论、独立子 Agent 审查、GitHub 正式 `APPROVE` 和人工最终验收是不同证据。
以上不阻止本地设计/PoC；真正入队合并前必须满足服务端门禁，不关闭规则或自行绕过。

## 需求如何进入 Specs

产品主体仍在 [v1.2 需求索引](../requirements/README.md) 关联的不可变原文中，原产品 AC 为 AC-01～AC-23。
目前只有 [Phase 0 Spec](../specs/spike/phase-0/spec.md) 已规范化，尚未把全部用户故事拆成正式产品切片。
开始某个产品切片前，将其用户故事、范围、约束、失败行为及 AC 写入对应 `spec.md`，原文保留作追溯。
不要把 3176 行原文整份复制给每个 Agent，也不要一次机械生成全产品的庞大 Spec。
新需求或实质边界变化需要人类批准；对已批准范围内的常规调查无需反复确认。

## 下一会话立即做什么

1. 运行下方 Git 检查，核对本文件与远端是否漂移；保留用户和其他 Agent 新增改动。
2. 最小顺序阅读：根 `AGENTS.md` → [current-state.md](current-state.md) → [Phase 0 tasks](../specs/spike/phase-0/tasks.md)。
3. 再选读 [design.md](../specs/spike/phase-0/design.md) 和 PoC 矩阵中与选定任务有关的内容，不遍历所有规范或原文。
4. 建议先准备 T006 的最小 MCP 接入 PoC：明确用户故事/AC与独立 Tester 验证合同，由 Leader 复核后再实施。
5. T006 验证双 Client、断开不终止后台、正确 Project/Run 待办领取；区分模拟协议、真实 Desktop 接入与可选自动唤醒。
6. T007 可利用后续真实 PR 核验 Codex Review、当前 Head SHA、Required Check 和真实 merge_group；先解决审批身份，不伪造 PASS。
7. T005 的取消、同 Session 跨进程互斥、preset/权限切换及读取隔离仍待核验；不要重跑已有成功项凑数量。
8. T008 需要最小 Core PoC，验证双项目隔离、未知启动结果与重启恢复；不提前宣称生产 Core 完成。

任务 checkbox 只在活动 `tasks.md` 维护。本文件给启动顺序，不另复制一套进度清单。
不能满足的外部前提写明阻塞和兼容方案，继续独立工作；新增高风险授权再向用户提出具体请求。
生产实现之前先形成合适切片的 Spec/AC、测试和失败 Oracle；不要从技术草案直接进入大规模实现。

## DSH：可以复用什么，不能假定什么

用户已授权复用现有 DSH 配置做受控 PoC，明确要求配置不硬编码、与凭据解耦。
先按 [DSH 接入合同](../specs/spike/phase-0/refs/dsh-binding.md) 发现实际安装与本机绑定，不向项目写入安装路径、私有模型或端点。
上轮使用隔离 DSH_HOME / 工作区，外部 overlay 引用已有 credential store；未把凭据值复制进任务、配置副本或发布证据。
实际 DSH 版本为 `0.2.2-rc.1`，Codex CLI 为 `0.166.0`；这是核验版本，不是无需复核的永久默认。

已经有独立动态证据：创建成功、无 nonce 提示的同 Session 上下文恢复、跨 cwd 原生拒绝。
native write 在 read-only 下拒绝，但 native read 能读取工作区外 sentinel，不能作为凭据或跨项目的强读取隔离。
SIGTERM 后进程可能退出 0 却没有 final：结果为 unknown，不判成功或原生取消，不盲目重派冲突写入者。
生产 resolver、配置替换/无效引用、原生取消、远端推理取消和 Handoff 重建仍未证明。
原认证与用户 patch 的内容/mtime 未变；原 Desktop 派生配置内容未变但 mtime 变化未归因，完整范围以证据为准。

原始日志、探测脚本和运行目录只在旧会话临时区，不是可靠持久依赖；新会话按合同重建 fixture，不依赖旧 Agent 或 Session ID。
发布证据只使用白名单摘要；不要输出完整配置、认证摘要、原始错误、final text 或本机路径。
授权不包含修改原认证、全局 Runtime 配置、扩大权限或访问其他真实用户数据。

## 立即可执行的检查

在仓库根目录运行：

```sh
git status --short --branch
git remote -v
git fetch origin
git log -3 --oneline
git rev-parse origin/main
node scripts/check-docs.mjs
node --check scripts/check-docs.mjs
git diff --check
```

暂存后还应运行 `git diff --cached --check`。无产品 package/test 入口时不能虚构 `pnpm test` 已通过。
本轮交接只做状态与文档检查，不重新执行模型或 Merge Queue；下一会话如需动态结论须记录实际命令、版本和 SHA。
普通文档预算 150 行，Agent 规范 300 行，metadata/相对链接机制继续保留。

## 新会话预期产出

先说明所选任务、已有证据和待证事项，然后交付可评审的小切片、验证合同和真实结果。
只有人类可设 `verified`；未实现的 Coordinator 事件、审批或派发记录不能以宿主工具调用冒充。
不得擅自发外部评论/消息、提交 Approval、合并 PR、修改 Ruleset 或创建/更换凭据；按实际用户授权执行。
管理员 Token 不交给 Worker；配置引用的分层也不等于 OS 级隔离。
