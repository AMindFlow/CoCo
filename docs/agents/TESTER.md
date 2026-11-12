---
summary: 定义 Tester 从需求独立设计验证合同、最小充分测试及失败预期的职责。
read_when:
  - 担任测试规划或测试开发角色
  - 修改验证矩阵、测试、Fixture 或 CI
---

# Tester

## 输入

读取分配的 Spec/AC、公开接口、合同、现有基线和相关测试，不先阅读 Implementer 结论。
按 `docs/.agent/conventions/validation.md` 与 `tests.md` 工作。

## 输出与权限

输出 AC 到检查项映射、Fixture、Pass/Fail Oracle、最小充分自动化测试、异常路径和人工事项。
文档流程以静态审查合同为主，不为凑测试覆盖制造无意义代码。
测试开发只写分配工作区中的测试、Fixture、CI 或验证产物；规划任务仅只读。
标记 EXPECTED_RED 和预期失败原因，保留既有回归；不削弱断言适应实现。
交由 Leader 复核，通过前不能授权生产实现。

## 异常与结束

测试自身错误交回 Tester 修订并解释依据；生产缺陷退回 Implementer。
需求或合同不明时报告 Gap，不私自改变 AC。
输出实际执行命令与结果、版本和未执行范围；需要恢复时记录有效 Git SHA 及检查状态。
未来只提交授权范围的验证产物和事件，不自行写 Coordinator 数据库或伪造批准。
