---
summary: 定义本项目采用的角色协作、Tester 前置、有限协商与证据驱动交付约定。
read_when:
  - 拆分、委派、验证或恢复 Agent 交付任务
  - 处理 Contract Gap、CI 失败或集成异常
---

# 交付协作

需求依据见 [v1.2 索引](../requirements/README.md)；产品接口尚在 Phase 0，以下先作为本项目工作约定。
不能将当前工具调用描述为尚未实现的 Coordinator 事件或持久化证据。

## 职责与门禁

Leader 做需求、架构、任务拆分、合同、测试复核、授权、异常仲裁及技术验收。
Coordinator 只做确定性状态、事件、门禁、观察、受控外部操作和恢复，不做业务推理。
角色入口见 [角色索引](../agents/INDEX.md)，不为增加并行数量而拆分工作。

1. Human 提供需求及必要的风险授权；Leader 固定 Spec / AC 版本。
2. Tester 独立设计验证矩阵、最小充分测试、Fixture 和 Pass/Fail Oracle。
3. Leader 复核，记录验证合同的批准依据，才允许正式实施。
4. Implementer 在授权路径与独占 Worktree 中实现、局部验证、提交及 PR。
5. Review / CI 绑定实际 PR Head SHA；失败返回原责任方，限制自动修复次数并保留失败。
6. 依 [GitHub Flow](vcs.md) 完成 Direct 或 Staged 整体验证，满足门禁后原生入队。
7. 远端实际合并后更新依赖；Leader 做最终技术验收，Human 做最终确认。

文档工作采用静态验证合同，无需为无产品行为的改动伪造测试代码或 EXPECTED_RED。
Coordinator 未可用时，验证合同由本轮执行计划和独立规划结果承载。

## 任务上下文

任务信封最小包含 Project / Run / Node / Attempt、角色、Spec 与合同版本、输入 SHA、路径、分支、权限、结果和 Checkpoint 要求。
路径是范围约定，不能替代真实沙箱；未经验证不承诺 DSH 自动发现全部规则。
同 Session 不重叠 Turn，同 Worktree 不并发写，同集成分支只有一个 Owner。
独立工作区仍共享 Git 元数据，必要写操作需要资源互斥。
多项目 Session 不复用，Worker 默认不跨 Run；不能用角色名或原生 Session ID 单独确定归属。

## 有限协商

Contract 由 Leader 指定唯一 Owner，消费者不发布竞争性权威版本。
Gap → Owner 提案 → 一次集中反馈 → 最多一次修订；再次争议或超时升级 Leader。
Spec、AC、架构、兼容性、数据模型或工作包范围实质变化，不能由 Owner 单独批准。
合同变更按影响范围使旧实现或验证证据失效，其他无关任务继续。

## 等待、恢复与证据

等待外部结果可以结束 Turn，不要求 Agent 持续轮询或空转。
未来 Coordinator 采用持久化 Event、独立 Delivery、独立 Attempt，至少一次投递及幂等执行。
Runtime 接受不等于任务完成；调用超时而结果不确定时，先核验原 Operation / Session / Lease / GitHub 副作用，不盲目启动第二个写入者。
失败达到限制后保留异常记录并升级，不静默丢弃或无限自动重试。
Session 不可恢复时只从有效 Git SHA、Handoff、合同版本及验证状态重建。
不直接接管来源未知的未提交修改；不自动回滚已合并代码。

Leader 通知先支持持久化待领取事件与人工继续；自动恢复目标 Desktop Thread 必须经真实 PoC 验证。
Review 无评论不等于通过；静态审查、测试通过、正式 Approval 和业务 AC 是不同证据。

## 使用本套规则开发 CoCo

当前用宿主工具执行角色职责，不等待产品先实现自身。
Material 文档流程修改使用独立只读审查；生产实现再建立独立 Tester 测试和运行时门禁。
所有技术探测按 [Phase 0 计划](../specs/spike/phase-0/tasks.md) 记录能力层级和未测事项。
