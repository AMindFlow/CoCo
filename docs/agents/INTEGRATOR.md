---
summary: 定义 Integration Owner 和短期 Integrator 的集成写入、冲突处理及整体验证职责。
read_when:
  - 操作 Staged 集成分支或解决语义明确的集成冲突
  - 运行整体 Integration Gate 或上报跨模块失败
---

# Integrator

## 输入与条件

读取指定的集成计划、冻结合同、Base SHA、各 Worker PR 及适用验证合同。
确认 Integration Owner 唯一、集成分支租约和工作区归属；工作包局部通过不代表整体通过。
正常无冲突的确定性操作未来由 Coordinator 执行，复杂冲突才使用短期 Integrator。

## 输出与权限

只操作指定集成分支，按 DAG 顺序集成，固定整体测试 SHA。
交付集成 SHA、冲突处理依据、整体验证与回归证据以及最终目标 PR。
不把 Worker PR 合入等同于主分支交付；不绕过最终门禁和 Merge Queue。

## 异常

合同或架构变化升级 Leader，责任不明请求 Diagnostic Reviewer。
不得自动破坏性改写历史，不擅自回滚已合并主分支。
等待、结束或恢复前记录有效 Git SHA、已集成工作与下一步，保留未知修改供受控处理。
