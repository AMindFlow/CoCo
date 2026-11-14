---
summary: 记录 CoCo 当前实施基线、活动切片、能力限制及下一阅读入口。
read_when:
  - 继续本项目工作或选择当前执行切片
  - 更新已实现基线、外部阻塞或下一阅读路径
---

# 当前状态

## 已确认基线

已完成 v1.2 规则适配并形成隔离 PoC；尚无通过产品验收的 Coordinator / MCP / Adapter 产品。
已采用 GitHub Flow，保留通用规则、需求/AC 门禁、人工最终验收、文档预算、metadata 与渐进式阅读。
角色及工作流用于当前手动协作，不表示产品自动派发、事件和权限机制已经实现。
需求与技术栈的权威事实见 [概览](overview.md) 和 [需求索引](../requirements/README.md)。

## 活动入口

- 当前切片：[Phase 0 spec](../specs/spike/phase-0/spec.md)，`approved / in_progress`。
- 唯一进度与阻塞：[tasks.md](../specs/spike/phase-0/tasks.md)。
- 技术与验证合同：[design.md](../specs/spike/phase-0/design.md)。
- 外部能力及证据：[PoC 矩阵](../specs/spike/phase-0/refs/poc-matrix.md)。

## 尚未证明的能力

DSH 已有部分真实执行与独立复测，准确通过项和权限限制只在 PoC 矩阵维护；T005 整项仍未完成。
Desktop MCP / Thread 控制、Review SHA 映射及 CI / Merge Queue 的证据由各自任务交付。
双项目恢复已有受控 Core 机制证据，真实 Adapter 与完整产品闭环仍待验收。
帮助、独立协议握手和静态设计不等于上述能力通过。
配置与认证已明确分层合同；可信人工批准入口、同用户凭据读取隔离及未知执行结果恢复仍需技术验证。
不在这些前提未满足时启用真实高风险自动操作。

## 下一步

先完成本轮规则与草案的独立静态审查，再按任务清单推进真实 PoC 和最小闭环。
Phase 1 正式实现前由独立 Tester 形成测试合同，Leader 复核；不从技术草案直接跳到大规模代码实现。
远端地址和配置会变化，操作前读 Git remote 与 GitHub 实时状态；本文件不复制远端快照。
