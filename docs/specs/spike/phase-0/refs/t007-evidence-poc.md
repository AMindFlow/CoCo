---
summary: 固定 T007 只读 Review/CI 证据分类 PoC 的输入、Oracle 和独立验证边界。
read_when:
  - 实施或复验 T007 的当前 SHA 证据分类
  - 判断机器摘要、Check Run 与 PR 归属是否足以形成局部结论
---

# T007 只读证据合同

## 来源与批准

合同：`T007-readonly-v1`；需求：[Spec R-004 / AC-004](../spec.md)、[T007](../tasks.md)。
追溯：[需求索引](../../../../requirements/README.md) 中原文 11.2、11.3、13.4。
基线：`main@55a3901848850b1e47598ace74015ca759f7afae`。
独立 Tester `t007_validation_plan` 从需求规划，Leader 复核后接受本次隔离实验。
用户本轮要求继续项目，既有 App 安装范围问题暂留；不扩大此前只读认证范围，不审批或合并现有 PR。

仅验证读取结果的关联与离线分类，不实现生产 GitHub Adapter、自动审批、队列或合并。
Review 四态来自需求；CI 同名四态仅为本 PoC 的局部约定，不新增产品验收要求。
JavaScript 标准库与 `node:test` 只用于可丢弃探测，不锁定后续生产 TypeScript / Vitest 工程组织。

## 接口与信任边界

代码位于 [evidence.mjs](../../../../../spikes/github-evidence-poc/evidence.mjs)。
纯函数 `evaluateSnapshot(snapshot, policy)`；CLI 读取含这两个独立对象的 JSON 样本并输出 JSON。
工具不读取凭据、不联网、不执行 Git、不调用任何 GitHub 写 API。
`merge_authorized` 固定为 `false`；分类结果不是 Approval、业务 AC 验收或任何执行授权。
离线样本可被本地编辑；它们不是防伪证据，也不能用作未来可信人工门禁。

| 输入 | 必要内容 |
| --- | --- |
| policy | repository_id/full_name、PR number、head_repository_id、预期完整 Head SHA、可信 reviewer 的 numeric id/login/type、required_checks 的 name/app_id |
| snapshot PR | captured_at；pr_before/pr_after 的 number、base.repo id/full_name、head.repo id/sha |
| comments | source 的 repository_id/pr_number；complete、error；items 保留 id/html_url/updated_at/user/body |
| checks | source 的 repository_id/head_sha；complete、error；items 保留 id/name/head_sha/status/conclusion/started_at/completed_at/app 及可选 pull_requests |

base 与 head repository 分别核对，允许显式绑定的 fork，不将二者混同。
前后读取 Head 不同、归属错误或分页未完整时不能 PASS；快照只反映采集窗口，不承诺之后仍是最新。
明确读取错误归为对应通道 `UNAVAILABLE`；缺评论或缺 check 为 `INCONCLUSIVE`。

## Review Oracle

- 可信来源由 policy 决定，不能由正文的 `trusted` 字段或显示名决定。
- 实际 issue comment 的 URL 和 collection source 同时绑定 repository / PR。
- 当前观察格式为 `codex-pull-request-review-summary` 与 `codex-review-state:v1` HTML 标记。
- 两个机器标记必须位于正文开头两行；不把代码块或引用中的格式示例识别为完成证据。
- `code_review.commit_sha` 必须等于当前完整 Head SHA；“抓取时 Head”不替代摘要自身的 SHA。
- `completed` 且 `has_any_findings=false`、`has_unresolved_findings=false` 才为 `PASS`。
- `completed` 且两个 findings 标志均 true 为 `CHANGES_REQUESTED`。
- 缺字段、未知版本、运行中、矛盾标志或缺可靠关联为 `INCONCLUSIVE`，不回退到旧成功。
- 多个摘要按 updated_at 选最新；不同条目排序不唯一时不 PASS。
- 含任一保留机器标记的更晚可信条目都参与排序，缺另一标记时失败关闭，不能跳过它回退旧 PASS。
- 空评论、只有 👍、普通用户复制正文、错误 bot ID、其他 PR 的摘要均不能 PASS。

上述机器格式为本次真实观察，不是稳定的官方 Schema 承诺；变化时失败关闭并重新核验。
仅分类 Code Review，不将 Security Review 的空值或完成状态混入本结论。

## CI Oracle

- required_checks 必须非空；名称、来源 App、采集 repository 与当前 SHA 全部匹配。
- check 的 pull_requests 若为空，可使用已核验的采集路由关联；存在明确矛盾时拒绝。
- 同一目标 PR 的全部关联记录必须一致；其他 PR 可共存，但正确记录不能掩盖目标 PR 内的矛盾记录。
- 同一名称/App/当前 SHA 的 rerun 按 started_at 选最新，不能取旧成功掩盖新失败或进行中。
- 排序不唯一或必要时间缺失时不 PASS；已完成成功需明确 completed_at。
- `completed/success` 为 `PASS`；明确 `failure` 为局部 `CHANGES_REQUESTED`。
- queued、in_progress、缺项、neutral/skipped/cancelled/timed_out 等均不自动成功。
- 所有必需 checks 通过才为 CI PASS；本轮只有文档 CI，不代表产品行为 CI 完成。

## 验证顺序

独立 Tester 在单独临时目录先编写测试，不读取实现；缺模块阶段记录 EXPECTED_RED。
Leader 集成后运行下列实际入口；失败修实现，不削弱断言。
新会话对固定提交做只读审查和独立复跑；单独报告真实 API 观察与受控反例。

```sh
node --check spikes/github-evidence-poc/evidence.mjs
node --test spikes/github-evidence-poc/evidence.test.mjs
node spikes/github-evidence-poc/evidence.mjs docs/specs/spike/phase-0/artifacts/github-pr2-evidence.json
node spikes/github-evidence-poc/evidence.mjs docs/specs/spike/phase-0/artifacts/github-pr3-evidence.json
node scripts/check-docs.mjs
git diff --check
```

真实样本保留需要的原始标记、ID、完整 SHA、时间、来源 URL 和 Check Run 字段，去除无关正文。
采集前后查询 PR；评论条数小于 per_page 且 Check Run total_count 与返回数一致才标记本次完整。
必需 check 名称/App 来自实时读取的 Ruleset，可信 bot 的稳定 ID 来自真实资源；两者均作为观察策略记录。
至少覆盖当前成功/发现、来源伪造、PR/仓库错配、旧 SHA、运行中、读取失败、分页缺失、Head 漂移及 rerun 冲突。

## 未覆盖范围

不生成真实新 SHA 来触发新 Review，不伪造 GitHub 正式 Approval，不入队、不合并。
旧 SHA 失效的算法反例属于受控模拟；真实 merge_group SHA、失败移队和合并事实仍未验证。
本次不证明同 OS 用户凭据隔离，也不证明两个 App 的写权限边界。
T007 与 AC-004 保持未勾选，Phase 0 保持 `approved / in_progress`；人工最终验收仍待完成。
实际能力结论只在 [PoC 矩阵](poc-matrix.md) 与其证据维护，任务进度只在 tasks。

## 官方来源

- [GitHub Check Runs API](https://docs.github.com/en/rest/checks/runs)：head_sha、App、状态和时间字段。
- [Codex GitHub Review](https://learn.chatgpt.com/docs/third-party/github)：Review 行为；具体机器标记以实测为准。
