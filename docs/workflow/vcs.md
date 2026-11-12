---
summary: 定义 CoCo 的 GitHub Flow、Direct 与 Staged 集成边界以及远端合并门槛。
read_when:
  - 创建分支、决定 PR 目标或选择集成模式
  - 调整合并策略、发布方式或远端分支保护
---

# GitHub Flow

## 分支与生命周期

`main` 是唯一长期交付基线。短分支从最新已核验的 `main` 创建，通过 PR 返回 `main`。
原初始化的 `dev` 仅是历史分支，不作为后续源或合并目标；不自动删除历史分支。
不再要求 `dev → release/* → main`，不维持常规版本维护分支。

| 分支 | 来源 | 目标与职责 |
| --- | --- | --- |
| `feature/*`、`fix/*`、`chore/*`、`docs/*` | `main` | 单项变更，经 PR 返回 `main` |
| `spike/*` | `main` | 可丢弃实验；交付时整理为可审查 PR |
| `task/<run>` | `main` 的已记录 Base SHA | Staged 集成分支，最终 PR 到 `main` |
| `work/<run>/<package>` | 计划指定的 `main` 或 `task/<run>` SHA | 独立 Worktree，PR 到计划中的目标 |

开始工作前核对工作区和分支；获取远端失败时，不声称本地 `main` 最新。
不直接向 `main` 提交或推送，不重写受保护或已共享分支历史。
全新空远端可普通推送现有、已批准的初始化提交建立 `main` 基线；不夹带后续工作或重写已存在分支。
紧急修复同样从 `main` 创建短分支并经过 PR，不能以 hotfix 为由跳过门禁。

## Direct 与 Staged

默认 Direct：独立可交付 PR 直接以 `main` 为目标。
Leader 明确工作包、Contract Owner、依赖、授权和目标；并行数量不决定集成模式。

只有耦合工作无法独立保持目标分支可交付时使用 Staged：

1. 冻结合同并记录 Base SHA，创建 `task/<run>`。
2. Implementer 独占工作分支和 Worktree，Worker PR 指向集成分支。
3. 按 DAG 集成，集成分支始终只有一个 Integration Owner。
4. 以固定集成 SHA 完成整体 AC 和 Integration Gate。
5. 最终 PR 指向 `main`；排队与合并后确认实际合并事实。

Worker PR 合入集成分支不代表 Feature 交付，也不解除要求最终交付的下游依赖。
切换模式先停止受影响自动合并，由 Leader 修订计划；不自动 rebase 或改写历史。

## PR 与 Merge Queue

- PR 标题与 squash 提交采用 Conventional Commits；命令规则见 [Git 操作](git.md)。
- 默认 squash merge；确需保留历史时由计划说明。
- 门禁包含当前 SHA 的 CI、有效独立 Review、适用 AC、合同版本和授权。
- Codex 无评论不等于通过，Code Review 不等于 GitHub 正式 Approval。
- 支持 Merge Queue 的验收仓库，最终 PR 必须原生入队；不自建队列冒充 GitHub。
- Required Checks 响应 `pull_request` 与 `merge_group`，验证各自实际 SHA。
- 队列不可用、保护缺失或权限不足时报告阻塞；降级验收需明确批准并标记差异。
- 不因具备 admin 凭据而绕过规则、直接合并或伪造审批。

## 发布、撤销与保护

发布从已验收 `main` SHA 出发；tag、远端发布或部署按明确授权操作。
已合并变更采用独立 revert PR 撤销并重新验证；不自动回退共享主分支。
短分支或 Worktree 清理须核对归属、合并事实和恢复证据。
本文件是工作约定，实际 GitHub 保护须管理员配置并核验，见 [安全与人工门槛](security.md)。

参考：[GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)、[Merge Queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)。
