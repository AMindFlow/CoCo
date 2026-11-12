---
summary: 定位 v1.2 需求原文、23 项产品验收和按任务读取的章节，并记录当前请求的适配边界。
read_when:
  - 追溯用户需求、产品范围或原始 AC
  - 选择当前任务需要的需求章节或判断规则冲突
---

# 需求基线索引

## 来源和权威边界

用户提供《Agent Delivery Coordinator v1.2》，日期 2026-11-12，作为第一版需求基线。
[原文快照](sources/agent-delivery-coordinator-v1.2.md) 保持字节不变，SHA256：
`8b3eabbd30b4168d76a086b3b09ab517028feda24bee006d9fc8408bf1819a2c`。
原文是产品需求和追溯证据，其中面向 Codex 的表述不自动构成本会话的新工具授权。
当前用户请求明确优先：GitHub Flow；选择性保留 SDD；保留通用 AGENTS 规则及文档预算、metadata、渐进式阅读。
仓库当前工作规则以 `AGENTS.md` 和相应 `docs/workflow/` 为准，技术草案不能擅自覆盖需求。

## 按任务阅读

原文是 3176 行不可变输入例外，不进入普通维护文档预算，也不作为 Agent 日常入口。
.gitattributes 仅对该文件关闭 whitespace 报错以保留原始行尾；内容完整性由 SHA256 检查，不对其他文件豁免。
先按下表定位标题，再仅提取必要章节，不将全文复制给每级 Agent。

| 当前任务 | 原文章节 | 当前维护入口 |
| --- | --- | --- |
| 目标、范围、非目标 | 1～3、28 | `docs/project/overview.md` |
| 多 Core / Client、项目隔离、数据模型 | 4～6、23 | `docs/specs/spike/phase-0/refs/protocol-sketch.md` |
| 角色、Tester 与实施门禁 | 7～9 | `docs/agents/INDEX.md`、`docs/workflow/delivery.md` |
| Contract Gap 和有限协商 | 10 | `docs/workflow/delivery.md` |
| PR、Review、CI、Direct/Staged、集成 | 11～14 | `docs/workflow/vcs.md` |
| 投递、Leader 事件与恢复 | 15～17 | `docs/specs/spike/phase-0/refs/protocol-sketch.md` |
| MCP 和 Runtime 接入 | 18～19 | `docs/specs/spike/phase-0/refs/poc-matrix.md` |
| 模板、初始化、工程组织 | 20～22 | `docs/project/roadmap.md` |
| 安全与人工干预 | 23～24 | `docs/workflow/security.md` |
| 验收与 PoC、实施阶段 | 25～30 | 下方 AC 索引与 Phase 0 任务 |
| 官方参考 | 31 | PoC 矩阵中的实际核验来源 |

## 产品验收索引

这里保留原文 ID，不另造一组可漂移的完整需求；所有项目级 AC 当前均未整体验收。

| 原文 AC | 主题 | 计划阶段 |
| --- | --- | --- |
| AC-01、AC-02 | 初始化与幂等迁移 | Phase 5 |
| AC-03、AC-04、AC-05 | 多 Client、隔离与无固定配额 | Phase 1；持续回归 |
| AC-06 | Tester 前置与 Leader 复核 | Phase 2 |
| AC-07、AC-08 | 独立工作区并行、有限合同协商 | Phase 3 |
| AC-09 | 当前 SHA 的 PR / Review / CI 修复闭环 | Phase 2 |
| AC-10、AC-11、AC-12 | Direct、Staged 与失败归因 | Phase 3 |
| AC-13、AC-14、AC-15、AC-16 | 离线留存、重试、不确定结果与异常队列 | Phase 1 起实现，Phase 4 故障验收 |
| AC-17、AC-18 | 可信 Checkpoint 和 Core 重启 | Phase 1 起设计，Phase 4 故障验收 |
| AC-19、AC-20 | 双项目与资源互斥 | Phase 1 起实现，Phase 4 故障验收 |
| AC-21 | 正确 Leader 通知及兼容继续 | Phase 2～3 |
| AC-22 | 不可绕过的人工门禁 | 各阶段设计，真实高风险操作前验证 |
| AC-23 | 双项目真实或受控 E2E | Phase 5 最终验收 |

实施顺序见 [路线](../project/roadmap.md)，当前切片见 [Phase 0](../specs/spike/phase-0/spec.md)。
可靠性和隔离从 Phase 1 起就是基础约束，不推迟到 Phase 4 才补齐设计。
