---
summary: 记录 Phase 0 外部能力的实际证据层级、限制、验证 Oracle 与下一动作。
read_when:
  - 核验 Runtime、Desktop、GitHub 或恢复能力是否真实可用
  - 继续 Phase 0 探测或判断能否进入后续正式实现
---

# Phase 0 能力矩阵

日期：2026-11-12。层级：`未测 / 帮助声明 / 隔离协议实测 / 受控模拟 / 真实业务验证 / 阻塞`。
一个层级不能替代另一个；本轮没有任何完整产品 AC 被宣称通过。
本地观测针对 Codex CLI `0.166.0`、DSH Desktop/CLI `0.2.2-rc.1`；升级后复核。

## 实际观察

| 能力 | 层级与结果 | 未证明的范围 / 下一动作 |
| --- | --- | --- |
| Codex app-server | 隔离协议实测：`initialize` 成功，`thread/loaded/list` 返回空列表，退出 0 | 无模型 Turn、无真实 Desktop Thread 操作，不证明接管或自动唤醒 |
| Codex 空参数请求 | 实测：漏 `params` 返回 `-32600`；显式 `params: {}` 后成功 | 客户端按安装版本 Schema 生成，不照抄省略参数的示例 |
| DSH CLI 发现 | 版本和顶层帮助成功；内置 CLI 不在当前 PATH | Adapter 通过配置注入可执行路径，不硬编码本机安装目录 |
| DSH Headless 帮助 | 帮助声明：`--json`、`--session-id`、`--permission-mode`、`--approval-policy`、`--add-dir` | 不能证明成功执行、恢复、沙箱或取消 |
| DSH 不存在 Session | 隔离协议实测：JSON error，退出 1，stdout 可逐行解析 | 只证明未知 Session 拒绝，不证明有效 Session 上下文恢复 |
| DSH 新 Session 错误链 | 隔离协议实测：session / turn / step / final 事件，退出 1，`MISSING_CREDENTIAL` | 探测环境主动未注入凭据；不是对用户 Desktop 凭据是否存在的判断 |
| DSH 真实业务成功 | 阻塞：隔离环境需专用认证，未读取或复制用户 GUI 凭据 | 用本地安全注入的测试凭据再验证；不要把密钥发到聊天、仓库或 Handoff |
| DSH 权限、目录及独占 | 未测 | 无敏感内容 sentinel、跨目录恢复、同 Session 重叠 Turn 负例 |
| Desktop MCP / Leader | 未测 | 双 Client 实连、断连后台仍运行、人工继续领取正确 Run 事件 |
| 自动恢复 Desktop Thread | 未测、可选 | 单独验证归属和可控制范围；基础流程保留人工兼容模式 |
| 组织仓库前提 | API 实测：组织公开仓库，Rulesets 可读且数量 0；空远端已恢复原初始化 main 基线 | 能力前提可用不等于已启用保护或 Merge Queue；实际 PR/CI 记录在远端 |
| Review / SHA | 未测 | 受控 PR 实触发，当前 SHA 与完成证据；无评论不得判 PASS |
| CI / Merge Queue | 未测 | 实际 PR 与 merge_group SHA 检查、失败移队、远端合并事实 |
| 多项目与崩溃恢复 | 未测，依赖最小 Core PoC | 双 Project/Run 标记隔离、超时已启动、丢 Session、Core 重启无重复副作用 |

## 可复现范围

本地探测使用新临时目录作为 HOME / CODEX_HOME / DSH_HOME，未注入模型凭据。
`codex --version`、`dsh --version`、`dsh headless --help` 先记录安装版本与接口。
独立 `codex app-server --listen stdio://` 只发送初始化握手和空参数线程列表请求，没有创建 Thread / Turn。
DSH 先以不存在 ID 验证拒绝，再在空工作区提交“不要用工具，只回复固定标记”的单次任务。
由父进程设置超时并收集退出码，结束自己启动的子进程；未操作用户已有服务或 Session。
原始临时日志含安装/临时路径和运行标识，不提交到公开仓库；下方结构化证据只保留协议事实。
结构化记录：[local-probes.json](../artifacts/local-probes.json)。

## 后续真实验收 Oracle

- DSH：真实任务完成 → 持久化 ID → 退出 → 同目录恢复正确上下文；异目录/preset/权限分别检查。
- 权限：授权目录外的无敏感 sentinel 实际访问被拒绝，不能只凭 Prompt 说“不允许”。
- Runtime 生命周期：成功、可控失败、超时、取消各一例，区分接受、最终结果和未知结果。
- Review：SHA A 通过后推 SHA B，A 结果不能让 B 过门；缺失/过期/运行中都不能当 PASS。
- Queue：真实 merge_group 生成，Required Checks 运行在该 SHA；失败或出队不能报告合并成功。
- 隔离/恢复：两 Client、两 Run、唯一标记事件；重启和未知启动结果不串扰、不重复危险操作。

独立规划：新会话 `validation_plan` 只读需求与公开边界，给出上述 Oracle；没有执行动态测试。
最终静态审查与检查结果记录在 [任务清单](../tasks.md)，不混作 Runtime 能力证据。

## 官方来源

- [Codex app-server](https://learn.chatgpt.com/docs/app-server)：协议与事件；安装版本实测优先。
- [DSH Headless](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/bundle/headless/README.md)：一次任务、JSON、恢复与认证边界。
- [DSH CLI](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cli-help.md)：接口声明，不代替实际执行。
- [GitHub Merge Queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)：组织/套餐前提与 merge_group 检查。
