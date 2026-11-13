---
summary: 记录 Phase 0 外部能力的实际证据层级、限制、验证 Oracle 与下一动作。
read_when:
  - 核验 Runtime、Desktop、GitHub 或恢复能力是否真实可用
  - 继续 Phase 0 探测或判断能否进入后续正式实现
---

# Phase 0 能力矩阵

更新：2026-11-13。层级：`未测 / 帮助声明 / 隔离协议实测 / 受控模拟 / 真实业务验证 / 阻塞`。
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
| DSH 真实创建 | 真实任务实测：父/独立会话均退出 0、final completed、精确标记匹配、0 工具调用 | 仅验证现有 API-key route 引用，不代表所有模型或认证后端 |
| DSH 同目录恢复 | 独立动态复测：新提示不含原 nonce，原 Session 精确恢复标记，退出 0 | preset/权限切换恢复和不可恢复 Session 的 Handoff 重建未测 |
| DSH 跨目录恢复 | 独立动态复测：原生 error、退出 1，无模型 Turn，明确拒绝目录错配 | 不替代 Coordinator 的 Project/Run 归属校验 |
| DSH 只读原生写保护 | 父/独立 native write 均返回 FS_SANDBOX_DENIED，内外 fixture 字节未变 | 只证明已测试 write 工具的拒绝；未测试任意 shell/子进程写入 |
| DSH 目录外读取 | 父/独立 native read 都能读取外部 sentinel | 默认只读 preset 不提供工作区读取隔离，不能作为凭据保密边界 |
| DSH 宿主进程终止 | 独立探测：turn_start 后 SIGTERM，退出 0、进程已回收，但无 final | 结果 unknown；不证明原生 cancel、远端推理已停或可安全重派 |
| DSH 配置与认证分层 | 本机绑定和 overlay 引用现有 store；用户 patch 与认证内容/mtime 未变，全部 5 个源文件字节未变 | 原 Desktop 派生配置 mtime 有变化，来源未归因；无原始凭据副本，生产 resolver 未实现 |
| DSH Session 独占 | 未测 | 同 Session 跨进程互斥、旧实例停机与租约保护仍需验证 |
| Desktop MCP / Leader | 未测 | 双 Client 实连、断连后台仍运行、人工继续领取正确 Run 事件 |
| 自动恢复 Desktop Thread | 未测、可选 | 单独验证归属和可控制范围；基础流程保留人工兼容模式 |
| 组织仓库前提 | API 只读实测：main Ruleset Active，要求 Approval、原生队列和 docs-integrity/GitHub Actions；无 bypass | 配置不等于队列端到端通过；远端操作前重查，不改规则 |
| Review / SHA | 真实只读 API 观察 + 离线分类：PR #2/#3 均有当前 SHA、可信 bot 与明确完成的无 findings 机器摘要 | 旧 SHA 失效和错误来源仅受控反例；未生成真实新 SHA 触发 Review；不是正式 Approval |
| CI / Merge Queue | PR #2/#3 的 docs-integrity Check Run 均为当前 Head SHA 的 success，App ID 与实时 Required Check 匹配 | 只有文档 CI；真实 merge_group、失败移队与远端合并仍未测 |
| 多项目与崩溃恢复 | 未测，依赖最小 Core PoC | 双 Project/Run 标记隔离、超时已启动、丢 Session、Core 重启无重复副作用 |

## 可复现范围

第一批无认证探测使用新临时目录作为 HOME / CODEX_HOME / DSH_HOME，未注入模型凭据。
`codex --version`、`dsh --version`、`dsh headless --help` 先记录安装版本与接口。
独立 `codex app-server --listen stdio://` 只发送初始化握手和空参数线程列表请求，没有创建 Thread / Turn。
DSH 先以不存在 ID 验证拒绝，再在空工作区提交“不要用工具，只回复固定标记”的单次任务。
由父进程设置超时并收集退出码，结束自己启动的子进程；未操作用户已有服务或 Session。
原始临时日志含安装/临时路径和运行标识，不提交到公开仓库；下方结构化证据只保留协议事实。
结构化记录：[local-probes.json](../artifacts/local-probes.json)。

第二批获用户授权后，由外部本机配置文件传入 executable/profile/patch/runtimeHome/workspace，隔离 DSH_HOME，并由 DSH 解析现有认证引用。
没有把凭据值放进 launch 文件、Prompt 或发布证据，未把私有路由、模型或本机路径固化到项目源码。
父/独立会话使用不同工作区及运行目录，顺序验证 create、resume、wrong-cwd；恢复提示不含旧标记。
独立权限证据逐一关联 native tool_call/result，不采用模型对自己权限的自述。
原始错误和 final text 含本机路径/Session ID，只留私有目录；结构化白名单记录：[existing-config-probes.json](../artifacts/existing-config-probes.json)。
配置合同与安全限制见 [dsh-binding.md](dsh-binding.md)，不把本轮接入合同当作已实现的生产 Adapter。

T007 的 [只读分类合同](t007-evidence-poc.md) 使用真实资源的最小白名单样本：[PR #2](../artifacts/github-pr2-evidence.json)、[PR #3](../artifacts/github-pr3-evidence.json)。
采集前后 Head 一致；评论页未满且 Check Run total_count 与返回条数一致；样本保留具体来源与证据 ID。
必需 check 从实时 Ruleset 读取，检查名称与 App ID 分开绑定；机器摘要必须以正文开头两行的已观察格式关联当前 SHA。
分类器没有网络、凭据、审批或合并能力；算法反例为受控模拟，不视为真实推送/队列验收。
执行与源码版本见 [github-evidence-probes.json](../artifacts/github-evidence-probes.json)，不将两次读取包装为未来持续有效的门禁。
独立新会话在固定源码上复跑分类测试及额外反例，修复后未留相关阻塞；没有请求本地分支的 Cloud Review，不据此声称远端审查完成。

## 后续真实验收 Oracle

- DSH：真实任务完成 → 持久化 ID → 退出 → 同目录恢复正确上下文；异目录/preset/权限分别检查。
- 权限：强读取隔离的外部 sentinel 拒绝尚未满足；本轮证明确实可读。后续强化措施须重新做负例，不凭 Prompt 声明通过。
- Runtime 生命周期：成功、可控失败、超时、取消各一例，区分接受、最终结果和未知结果。
- Review：SHA A 通过后推 SHA B，A 结果不能让 B 过门；缺失/过期/运行中都不能当 PASS。
- Queue：真实 merge_group 生成，Required Checks 运行在该 SHA；失败或出队不能报告合并成功。
- 隔离/恢复：两 Client、两 Run、唯一标记事件；重启和未知启动结果不串扰、不重复危险操作。

独立规划：新会话 `validation_plan` 只读需求与公开边界，给出上述 Oracle；没有执行动态测试。
第二批由 `dsh_poc_plan` 独立规划，Leader 复核后执行，`dsh_verify` 使用独立 fixture 真实复测；T005 整项仍为 INCONCLUSIVE。
最终静态审查与检查结果记录在 [任务清单](../tasks.md)，不混作 Runtime 能力证据。

## 官方来源

- [Codex app-server](https://learn.chatgpt.com/docs/app-server)：协议与事件；安装版本实测优先。
- [DSH Headless](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/bundle/headless/README.md)：一次任务、JSON、恢复与认证边界。
- [DSH CLI](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cli-help.md)：接口声明，不代替实际执行。
- [GitHub Merge Queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)：组织/套餐前提与 merge_group 检查。
