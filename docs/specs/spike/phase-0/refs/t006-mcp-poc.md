---
summary: 固定 T006 隔离 MCP PoC 的验证合同、启动接口和证据边界。
read_when:
  - 实施或独立复验 T006 的双 Client 与离线领取探测
  - 区分 SDK 接入实测、合成事件和真实 Desktop 接入
---

# T006 MCP 接入 PoC 合同

## 来源与批准

合同：`T006-v1`；来源：[Spec R-004 / AC-004](../spec.md)、[T006](../tasks.md)。
输入基线：`main@55a3901848850b1e47598ace74015ca759f7afae`；不依赖尚未合并的交接 PR。
需求追溯：[需求索引](../../../../requirements/README.md) 中原文 4.2、16.4、18，以及 AC-03/04/13/21。
独立 Codex Tester 会话 `t006_validation_plan` 从需求与基线只读规划；Leader 复核后接受本合同。
批准只覆盖既有 Phase 0 隔离探测；不引入生产 Core、正式权限体系或新的产品验收标准。
生产实现前仍需单独的正式验证合同。本 PoC 不锁定后续产品依赖、Schema 或 IPC。

## 用户场景与 Oracle

| ID | 场景与通过条件 | 证据边界 |
| --- | --- | --- |
| V1 | 两个真实 MCP SDK stdio Client 同时调用工具，返回相同后台实例标识 | 两个接入进程，不是两个 Core；不等于 Desktop |
| V2 | 后台接受延迟 fixture 操作；所有 Client 断开后操作仍完成并生成事件，再重连可查 | 合成操作，无 Runtime 或业务副作用 |
| V3 | 绑定 A 只领取 P-A/R-A1/L-A 事件；错误项目、同项目其他 Run、跨绑定确认均明确拒绝且目标不变 | 受控绑定检查；不是同 OS 用户的保密边界 |
| V4 | 未确认断开不丢事件；正常 EOF 和接入进程异常退出后可重新领取；确认幂等且不再待处理 | 至少一次展示，不承诺业务 exactly-once |
| V5 | 人类继续真实 Desktop 目标 Thread，经 MCP 领取并确认正确 Run 的 nonce，另一 Thread 不串扰 | 必须单列真实结果；未做则 T006 不完成 |
| V6 | 实际 API 自动恢复正确目标 Thread | 可选；不能用手动继续或新 Thread 冒充 |

额外负例：未知绑定、伪造 leader/token 字段、跨归属混合批确认不得产生部分更新。
后台不可达时 3 秒内返回 `BACKEND_UNAVAILABLE`，不能自动创建第二后台或报告 accepted。
领取不消费；确认前允许同一事件 ID 重投；确认后重复确认不增加副作用。
SDK 握手、合成事件、真实 Desktop 和自动恢复分别报告，不合并成一个 PASS。

## 隔离 Fixture 与启动合同

代码位于 [spikes/mcp-client-poc](../../../../../spikes/mcp-client-poc/package.json)，使用 Node 26 原生 TypeScript 执行与官方 MCP SDK。
测试创建全新私有临时目录；socket、fixture、状态和绑定路径通过启动参数注入。
不读取用户认证、全局配置或已有 Session，不运行模型，不改 Desktop 设置。
后台只处理合成事件；MCP 接入进程不启动后台、不持有后台生命周期。
本机 socket 与 fixture token 仅防止测试串线，不作为生产授权或同用户隔离方案。

```text
node backend.ts --socket <socket> --fixture <fixture.json> --state <state.json>
node stdio.ts --socket <socket> --binding <binding.json>
```

后台就绪 stdout 为一行 `{ready:true,instance_id,pid}`；stdio stdout 仅用于 MCP。
Fixture：`bindings` 含 token/project_id/run_id/leader_id/thread_id；`events` 含 event_id/project_id/run_id/leader_id/nonce。
`operations` 在事件字段外含 operation_id/delay_ms，只有显式启动后后台才计时。
绑定文件仅含 token；A、B 可故意共用原生 Thread 字符串，以排除单凭 Thread ID 路由。
另设同项目不同 Run、未知 token、三个不同 nonce，所有值由测试生成。
状态快照只用于补充观察离线完成时间；最终事件读取与确认必须通过 MCP 验证。
不在本任务验证 Core 崩溃恢复、Runtime Session 创建、写租约或高风险操作。

## 公开探测工具

每个工具显式接收 `project_id/run_id`，拒绝额外字段；token 来自接入进程启动绑定，不能由工具参数覆盖。
响应同时提供 MCP `structuredContent` 与 JSON 文本；失败设 `isError: true`。

| 工具 | 其他参数 | 结果 |
| --- | --- | --- |
| `get_probe_status` | 无 | instance_id、pid |
| `get_pending_events` | 无 | events（含归属、ID、nonce） |
| `acknowledge_events` | event_ids | acknowledged（整批先检查归属，再确认；重复幂等） |
| `start_fixture_operation` | operation_id | accepted、operation_id |
| `get_operation_status` | operation_id | operation_id、status（pending/running/completed） |

错误码：`SCOPE_DENIED`、`RESOURCE_NOT_FOUND`、`BACKEND_UNAVAILABLE`。
`start_fixture_operation` 和 `get_probe_status` 是探测接口，不是未来产品 API 承诺。

## 最小验证与独立性

实现前入口缺失为 EXPECTED_RED；不得将不存在的测试报为通过。
独立 Tester 在单独临时工作区只写测试，依据本公开合同、不读实现；Leader 负责复制集成。
固定最终提交后，新会话使用新 fixture 复验，禁止修改源码与断言。
未修改、删除或弱化既有测试；新断言覆盖本合同及异常路径。

在仓库根目录：

```sh
pnpm --dir spikes/mcp-client-poc install --frozen-lockfile --ignore-scripts
pnpm --dir spikes/mcp-client-poc check
pnpm --dir spikes/mcp-client-poc test
node scripts/check-docs.mjs
git diff --check
```

运行须记录 Node/SDK 版本、提交 SHA、合同版本、命令退出码、层级与未执行范围。
白名单摘要写入能力矩阵关联的结构化证据；不发布临时路径、绑定 token 或原始 nonce。
本文件只管合同；任务进度在 tasks，实际结果在 PoC 矩阵，不复制状态表。
V5 未完成时保持 T006 与 AC-004 未勾选，Phase 0 保持 `approved / in_progress`。

## 接入依据

- [官方 MCP SDK Server](https://ts.sdk.modelcontextprotocol.io/v2/get-started/first-server.html)：工具和 stdio。
- [官方 MCP SDK Client](https://ts.sdk.modelcontextprotocol.io/v2/clients/connect)：stdio Client 生命周期。
- [OpenAI MCP 接入](https://learn.chatgpt.com/docs/extend/mcp?surface=app)：Desktop 配置与接入入口；文档声明不能代替实连。
