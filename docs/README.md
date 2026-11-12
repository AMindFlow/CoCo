---
summary: 按任务定位项目事实、需求、角色、工作流和 SDD 的权威入口。
read_when:
  - 为当前任务定位权威文档和角色规则
  - 调整文档结构、所有权或读取路由
---

# 文档地图

这是候选地图，不是按顺序加载的清单。先选任务相关路径，再看 metadata。

| 需要 | 入口 | 职责 |
| --- | --- | --- |
| 稳定项目事实 | [项目概览](project/overview.md) | 目标、边界、技术栈和所有权 |
| 当前进度与下一步 | [当前状态](project/current-state.md) | 活动切片、阻塞、下一阅读入口 |
| 新会话继续工作 | [会话交接](project/next-session.md) | 启动基线、授权边界、立即任务与检查 |
| 阶段规划 | [实施路线](project/roadmap.md) | 阶段目标和依赖，不复制任务进度 |
| 需求追溯 | [需求索引](requirements/README.md) | v1.2 章节、原 AC 和适配边界 |
| 角色任务 | [角色入口](agents/INDEX.md) | 只加载分配角色的规则 |
| 分支、PR、集成 | [GitHub Flow](workflow/vcs.md) | Direct / Staged、合并和发布策略 |
| Git 操作 | [Git 规则](workflow/git.md) | 命令安全、提交、冲突与历史 |
| Spec 状态 | [SDD](workflow/sdd.md) | 批准、实现、人工验收和生命周期 |
| Tester 与事件协作 | [交付约定](workflow/delivery.md) | 当前如何协作，不冒充已实现产品 |
| 权限与硬门槛 | [安全规则](workflow/security.md) | 真实权限、审批来源、管理员配置 |
| 当前 Spec | [Phase 0](specs/spike/phase-0/spec.md) | 当前需求与切片 AC |

## 目录职责

- `docs/project/`：稳定事实、当前状态与阶段路线。
- `docs/requirements/`：用户需求输入与章节索引，原文不进入日常全量加载。
- `docs/agents/`：角色职责与输入输出，不能复制全部状态机。
- `docs/workflow/`：共享的人类可读工作流权威规范。
- `docs/.agent/conventions/`：按文件名与 metadata 匹配的 Agent 约束。
- `docs/specs/`：按生命周期与切片组织的 Spec / design / tasks / decisions。
- `docs/templates/`：通用复用模板，不保存项目实现状态。

## 阅读与增长

根 AGENTS 已提供通用规则，不把长流程回塞根文件。
普通维护文档先读 metadata；标准 SDD 按文件名选读，无 discovery frontmatter。
保留 150 行普通文档、300 行 `docs/.agent/` 软预算，超出先拆分或路由。
不可变原文属于来源证据例外，仅定向提取章节；不整份注入子 Agent。
预算与唯一权威位置由 `docs/.agent/conventions/docs.md` 定义，metadata schema 由同目录 `metadata.md` 定义。

当前检查命令：`node scripts/check-docs.mjs`。文件链接检查不验证远端 URL、标题锚点或所有行内代码路径；角色入口另做静态复核。
