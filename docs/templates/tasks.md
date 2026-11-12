---
summary: 提供按依赖和验收组织的任务模板，避免重复进度及无意义的提交拆分。
read_when:
  - 为已批准的 Spec 和技术设计创建执行清单
  - 按阶段拆分大任务集或调整唯一进度入口
---

# <Feature Slice Name> Tasks

## 状态

- Active tasks: T001
- Blockers: none
- Updated: YYYY-MM-DD

## 任务规则

- 遵循 `docs/specs/AGENTS.md` 的 ID 与任务拆分规则。
- 已知时写出精确项目相对路径、依赖、范围和任务级检查。
- `[P]` 仅用于依赖满足、工作区隔离且无文件写入冲突的任务。
- checkbox 是进度权威位置，不另写流水账或复制到索引。
- 检查通过才可完成任务；阶段退出条件与单任务检查分开。
- 提交按 `docs/workflow/git.md` 的逻辑原子变更划分，不强制每个文档 checkbox 一个提交。
- 不以文档状态代替产品可信批准或已执行验证证据。

格式：

```text
- [ ] T001 [P] [R-001, AC-001] 动作 — path: <path/to/file> — depends: none — check: <command or observable condition>
```

## Phase 1: <Outcome>

- [ ] T001 [R-001, AC-001] <Action> — path: <path> — depends: none — check: <command or observable condition>

阶段退出：<observable condition>。

## 最终验证

- [ ] T900 执行 design.md / spec.md 约定验证 — depends: 实现任务 — check: 命令、结果、AC 与未测项可核验
- [ ] T901 对齐需求、AC 和任务状态 — depends: T900 — check: 不提前勾选未完成能力
- [ ] T902 完成适用的独立验证 — depends: T900 — check: 证据、范围及降级明确
- [ ] T903 技术交付达到 complete，等待人工验收 — depends: T901,T902 — check: 不自行设置 verified

## 大任务集

超过软预算前，保留本文件作为执行索引，把独立阶段清单放在 `tasks/<nn>-<phase>.md`。
每个 checkbox 只保存在一个文件，任务 ID 跨整个切片稳定唯一。
只读活动或依赖相关阶段，不默认扫描全部任务文件。
