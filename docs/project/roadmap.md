---
summary: 定义从 Phase 0 能力核验到双项目交付的阶段目标、验收边界及真实依赖。
read_when:
  - 选择下一交付切片、调整阶段或判断阶段退出条件
  - 安排 Coordinator、Adapters 和脚手架的实施依赖
---

# 实施路线

来源：[v1.2 基线](../requirements/README.md)。这是阶段目标，不维护逐项进度；当前 checkbox 只在活动切片 `tasks.md`。

| 阶段 | 可交付结果 | 退出条件 |
| --- | --- | --- |
| Phase 0 | 规则适配、能力矩阵、Adapter 方案与验证合同 | 关键真实能力有证据或明确限制；不把帮助声明算通过 |
| Phase 1 | 单 Core、多 MCP、IPC、SQLite、Project/Run/Session、持久化事件及投递 | 双项目隔离、断连独立、重启留存、基础幂等与租约验证 |
| Phase 2 | 单项目 Tester → Leader 复核 → Implementer → PR/CI/Review → 修复 | 当前 SHA 证据有效，失败能回原责任方，Leader 兼容继续 |
| Phase 3 | 多工作包、Contract、Direct/Staged、整体 Gate、原生 Merge Queue | 耦合工作整体交付；实际 merge_group 检查；DAG 正确解锁 |
| Phase 4 | 故障注入、Checkpoint 协议、重建、异常与审计 | 超时已启动、旧 Attempt、丢 Session、Core 重启、重复副作用负例通过 |
| Phase 5 | 幂等初始化 CLI、项目模板、Skill、validate/doctor、使用维护文档 | 新/已有仓库不损坏用户内容，双项目完整 E2E 与人工验收 |

## 实施前提

Phase 1 从一开始就有 Project / Run 归属、事件先持久化、外部操作 ID、版本保护及资源互斥。
Phase 4 扩大故障覆盖，不能成为前面阶段绕过正确性的理由。
所有正式产品实现先有 Tester 验证合同与 Leader 复核；高风险操作还需真实人工门禁。
自动 Desktop 唤醒不作为基础流程必要条件，保留 MCP 领取待办的兼容模式。
实际 Runtime 限流采用背压与有限重试，不引入全局 Worker 池、固定 Agent 配额或公平调度。

## 外部依赖

DSH Headless 创建/恢复、JSON 与权限；Codex Desktop MCP 与可选 Thread 控制；GitHub Review、CI、Merge Queue。
每个不确定能力的状态与下一动作只保留在 [PoC 矩阵](../specs/spike/phase-0/refs/poc-matrix.md)。
不能真实验证的依赖明确阻塞；需要改变需求时交给人类，不静默降级为自研替代系统。
