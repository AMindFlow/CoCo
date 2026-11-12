---
summary: 定义角色规则与真实权限的边界、人工审批来源和 GitHub 管理员硬门槛。
read_when:
  - 设计授权、凭据、Runtime 沙箱或人工批准机制
  - 准备启用真实 GitHub 自动操作或配置远端规则
---

# 权限与人工硬门槛

## 当前边界

角色 Prompt、allowed_paths、文档中的审批状态是行为合同，不能单独形成安全隔离。
共享 OS 用户及凭据时，Agent 可能通过 shell 绕过工具层；不承诺强进程隔离。
真实隔离需 Runtime 沙箱、文件系统权限、凭据分离及 GitHub 服务端规则共同支持。
实际核验结果统一放在 [PoC 矩阵](../specs/spike/phase-0/refs/poc-matrix.md)，不在多份文档复制状态。

## 人工批准来源

产品设计必须将批准与 Project / Run、操作、范围、Spec/Contract 版本及有效期关联。
Agent 不能通过 MCP 的布尔字段自行声称人类已批准，也不能只靠模型读取一条本地记录判定有效。
审批入口、身份和一次性校验机制需在实现前定案，并测试伪造、重放、过期与跨项目使用。
如果审批凭据或存储对 Agent 可写，则没有可信人工门禁，真实高风险自动操作保持禁用。

## Runtime 与本地资源

- Reviewer 默认只读；测试开发仅写约定的测试、Fixture 和验证产物。
- Implementer 独占自己的 Worktree / Branch，不能取得 Coordinator 权威数据库写权限。
- Core 单实例拥有 SQLite，MCP 进程只经受控 IPC 访问；调用绑定真实授权上下文。
- IPC socket 权限只能隔离其他 OS 用户，不能自动区分同一用户的 Agent。
- Spec / Contract / SHA 变化使相关旧批准或证据失效，旧 Attempt 不得覆盖新状态。
- 运行状态、SQLite、凭据和临时工作区放在业务仓库之外；日志与 Handoff 不含密钥。
- 路径校验解析真实路径和符号链接，Git 操作核验实际仓库与归属。
- Webhook 使用签名校验及事件去重；外部副作用先保存意图，结果不确定时先核验。

## 管理员配置清单

启用真实自动交付前，由人类在目标仓库配置并提供可核验证据：

1. 保护 `main`：要求 PR，禁止强推和删除，限制直接写入及 bypass（包括管理员/Agent 凭据）。
2. 配置独立 Review 和 required checks；单个人类账号不能用自己的 Approval 充当独立复核。
3. Required checks 必须实际存在并在 `pull_request` / `merge_group` 上执行，使用准确 check 名称。
4. 在支持的仓库启用原生 Merge Queue；CI 不把旧 PR SHA 的通过复用到 Merge Group SHA。
5. Code Review 自动触发、完成证据和 SHA 关联需独立核验；不把“没有评论”设为通过。
6. Coordinator、Implementer 与管理员凭据分离，只给必要仓库和操作权限。

这是一份待配置要求，不代表策略已生效。Agent 不擅自改变规则、visibility、套餐或关闭门禁。
当前只准备 `docs-integrity` 文档 CI，远端成功运行后才将该准确名称作为候选 Required Check。
它不替代后续类型、行为、协议、故障或产品验收检查；没有 CI 时不能将不存在的 check 配成必需项并宣称可交付。
不可用能力进入阻塞或人类明确接受的降级，不自动自建替代 Merge Queue。

## 外部条件

GitHub 原生 Merge Queue 支持组织公开仓库，组织私有仓库需 Enterprise Cloud；规则可用性还需 API/界面确认。
需求文档、工作约定与人工授权均不能替代账号套餐和服务端限制。
参考：[GitHub Merge Queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)。
