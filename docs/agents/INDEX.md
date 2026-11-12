---
summary: 将任务角色路由到最小职责文档，区分本项目工作约定与待交付的产品模板。
read_when:
  - 接收有明确角色的任务或选择独立验证角色
  - 调整角色边界或为子 Agent 准备上下文
---

# 角色入口

这些文件约束开发 CoCo 的当前协作；未来产品模板需在脚手架切片中从权威规则生成，不复制一套漂移规则。
任务提供角色后只读对应文件，不按表依次读全部角色。

| 角色 | 入口 | 核心输出 |
| --- | --- | --- |
| Leader | [LEADER.md](LEADER.md) | 批准范围内的计划、验证复核、仲裁、技术交付 |
| Tester | [TESTER.md](TESTER.md) | 验证矩阵、最小充分测试和 Oracle |
| Implementer | [IMPLEMENTER.md](IMPLEMENTER.md) | 授权范围代码、验证、提交、PR、恢复点 |
| Reviewer / Diagnostic Reviewer | [REVIEWER.md](REVIEWER.md) | 有证据且绑定版本的发现和归因 |
| Integrator | [INTEGRATOR.md](INTEGRATOR.md) | 固定 SHA 集成、冲突处理和整体验证 |

Coordinator 是确定性程序，不是额外推理角色，不承担业务决策。
Leader 默认 Codex，其他执行角色默认 DSH，实际工具选择与独立性见 `docs/.agent/conventions/validation.md`。
当前尚未有 Coordinator 时，任务通过宿主工具交付，不宣称已创建产品 Event / Run / Session 记录。

## 上下文合同

子任务只携带：目标、角色、工作范围、需要的 Spec/AC、合同版本、输入 SHA、验证入口及输出要求。
提供候选文件与必要章节，不把完整需求原文或全部规范传给每个子 Agent。
不默认继承其他实现者的思路和审查结论；不要暴露无关用户修改或凭据。
并行写入用独立 Worktree；只读规划或审查可读取稳定快照，并明确会话和边界。
权限不足则报告，不能因角色文档允许某操作就绕过宿主限制。
