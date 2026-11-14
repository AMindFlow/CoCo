---
summary: 固定 T008 受控 Core 机制探测的接口、故障点、Fixture 与独立验证边界。
read_when:
  - 实施或独立验证 T008 的 SQLite、隔离、超时及重启探测
  - 判断受控 Core 机制结果能否用于后续真实 Adapter 设计
---

# T008 受控 Core 探测合同

## 来源与范围

合同 `T008-core-fixture-v1`；来源：[Spec R-004 / AC-004](../spec.md)、[T008](../tasks.md)。
输入基线：本地集成 `b2072e70f1e7930176d588551015a1ceb81b3beb`；Spec 仍为 `approved / in_progress`。
独立 Tester `t008_validation_plan` 前置规划并复核接口候选；Leader 接受其四组定值建议及仅本地机制的技术分离，按下述合同固定。
T008 整项仍 `depends: T005,T006`，本子集不能代替 T005 限制、人类接受降级或 Phase 0 退出。
仅独立进程、私有临时 DB/socket/fixture；不调用 DSH、GitHub、业务仓库、凭据或真实高风险操作。
PoC 位于 [spikes/core-recovery-poc](../../../../../spikes/core-recovery-poc/package.json)；不锁定生产 Schema、权限、SQLite 驱动或 API。

## 进程与启动接口

```text
node core.ts --socket <core.sock> --db <state.sqlite> --bindings <bindings.json> --fixture-socket <fixture.sock> --tick-ms <positive-int> --deadline-ms <positive-int> --start-limit <positive-int> [--pause-at <point>]
node stdio.ts --socket <core.sock> --binding <binding.json> --deadline-ms <positive-int>
```

Core 唯一持有 SQLite 连接，实际启用 WAL、foreign_keys 与 synchronous=FULL；同一 DB 第二 Core 必须启动失败，stderr 输出 `CORE_ALREADY_RUNNING`，退出 1，不碰原 socket。
候选使用已安装 Node 26 的 `node:sqlite`；两个连接的预检不替代真实双进程与崩溃测试。
Core 就绪仅输出一行 `{ready:true,instance_id,pid}`；命名故障屏障输出 `{barrier:<point>,operation_id}`，其后不得越过该故障点。
屏障仅支持 `before_commit`、`after_commit`、`after_completion_observed`；Tester 命中后只终止自己启动的 Core，再在原 DB/socket 路径重启。
三个点分别为初始三记录已写入但未提交、初始事务已提交但未领取/占预算/发送、completed 已核对身份版本但完成事务尚未提交；每次启动只命中首个适用操作，挂起至终止。
崩溃遗留 socket 只能在取得 DB 独占后，核对类型、连接拒绝及 inode 未变，再改名保留到同私有目录；活动端点或普通文件必须拒绝，不删除未知文件。
SDK stdio 不启动 Core，不持有后台生命周期；不可达返回 `BACKEND_UNAVAILABLE`，不能自行启动第二 Core。
测试不得删除或重置外部 fixture 日志，不直接写 Core DB；运行目录与绑定由参数注入，无仓库内运行状态。

绑定文件为 `{token}`；Core bindings 文件为 `{bindings:[{token,project_id,run_id,leader_id,native_session_id}]}`，token 唯一。
相同原生 Session 字符串可用于不同项目，不能用其单独匹配 Run；绑定只防止 fixture 串线，不提供同 OS 用户保密或可信人工审批。
每次 IPC 请求为 `{token,method,params}`，Core 重验作用域；MCP 从启动绑定读取 token，参数不能覆盖身份。
所有工具参数均 strict，必须包含 `project_id/run_id`，不接受自报 owner、leader、token 或额外字段。

## 公开探测工具

| 工具 | scope 外参数 | 成功结果 |
| --- | --- | --- |
| `get_probe_status` | 无 | instance_id、pid、journal_mode、synchronous、foreign_keys、sqlite_version、当前 scope 的 operations/events/deliveries 数组 |
| `submit_operation` | key、object_version（正整数）、resource_key | operation_id、attempt_id、object_version、status |
| `get_operation_status` | operation_id | operation_id、attempt_id、object_version、status |
| `reconcile_operation` | operation_id | 同上；最多一次 inspect，不直接盲重派 |
| `get_pending_events` | 无 | events：仅当前绑定 Leader 未确认的完成事件 |
| `acknowledge_events` | event_ids（最多100个） | acknowledged；整批归属/可投递性检查后更新，重复确认幂等 |

所有响应同时含一致的 JSON text 与 structuredContent；错误 `isError:true`、`{error_code}`。
ID、key、resource_key、token 为非空字符串；event_ids 是非空字符串数组，允许空数组并幂等返回 `{acknowledged:[]}`。
诊断实际值必须为 `journal_mode:"wal"/synchronous:2/foreign_keys:1`，sqlite_version 为字符串；参数不是配置已生效的证明。
错误码为 `BAD_REQUEST/SCOPE_DENIED/RESOURCE_NOT_FOUND/IDEMPOTENCY_CONFLICT/RESOURCE_BUSY/INJECTED_FAILURE/BACKEND_UNAVAILABLE`。
格式/额外参数 BAD_REQUEST，未知绑定或跨 scope SCOPE_DENIED，本 scope 未知 ID 为 RESOURCE_NOT_FOUND；幂等/资源冲突分别为 IDEMPOTENCY_CONFLICT/RESOURCE_BUSY。
混合 ack 任一项不合法则整批失败不更新；跨 scope 优先于该 scope 的 ID 查询。reconcile 请求完成返回已持久化状态，needs_attention 不冒充外部完成或安全重派。
Operation 状态：`queued/dispatched/running/unknown/needs_attention/completed`；status 中不含绑定 token。
幂等域为 Project/Run/key/object_version，相同内容重试返回同一 Operation；同键版本不同内容拒绝，不同 scope 不合并。
resource_key 在本 fixture 的 Project/Run 内互斥；未知/运行中操作占有该资源，独立项目可继续。这不是物理 Git 资源的生产租约。

## 事务与事件 Oracle

提交同一事务写 Operation、`operation_requested` Event、指向 fixture 的 pending Delivery（Outbox）；失败则三者全无。
派发前持久化同一 Operation/Attempt 的 dispatched 及 start 计数，再调用外部；MCP 接受不等于外部完成。
完成观察经身份/版本核验后，同事务补记 completed、`operation_completed` Event 及 Leader pending Delivery；每 Operation 只生成一个完成事件。
Event 最小字段为 event_id/project_id/run_id/leader_id/operation_id/type；完成事件另含 fixture 的 effect_marker。
Delivery 独立持有 delivery_id/event_id/target（fixture 或 leader）/status；确认只更新 Leader Delivery，不删除 Event。
Delivery 状态为 `pending/dispatched/accepted/unknown/needs_attention/completed/acknowledged`；Leader 只有 pending/acknowledged，fixture 接受与完成分开。
诊断 operations 含 operation_id/attempt_id/object_version/key/resource_key/status/start_count；events/deliveries 仅返回当前 scope。
返回集合中的每个 Event/Delivery 必须含上述最小字段及关联；空集合为数组，acknowledged 是输入事件 ID 数组，不是数量。

只有 `queued` 或得到权威未启动证明的操作可派发；start-limit 是每 Operation 跨重启的派发预算，不是全局上限。
start_count 是发送前持久化的预算占用数，崩溃可使其大于 fixture 实收数；达到上限则 needs_attention，不调用 start。安全继续也不清零计数或创建新 Operation/Attempt。
超时、连接中断或不明应答进入 unknown；重启先 inspect 已 dispatched/unknown/running 操作，不因超时、租约到期或新请求再 start。
inspect running 继续等待；completed 补记结果；unknown/unavailable/not_found 进入 needs_attention 并冻结冲突资源。
只有显式 `not_started` 且 `authoritative:true` 允许同一持久化 Operation 安全继续；fixture 能力不能推定真实 Adapter 有相同能力。
所有外部正向观察必须匹配 operation_id/project_id/run_id/attempt_id/object_version；错配/旧版本保持 needs_attention，不写完成结果或错误归属事件。
needs_attention 不无限后台重查；人工受控的 reconcile_operation 可再 inspect 一次，仍不能跳过上述安全条件。
deadline-ms 同时限定 start/inspect；tick 调度 queued 并复核 dispatched/unknown/running，每 Operation 最多一个在途外部请求，显式 reconcile 可等待已有请求但不能新增并发。
needs_attention 不自动 inspect/start；reconcile 的权威未启动结果转 queued，下一轮调度才派发。queued/completed 无需 inspect，直接返回当前状态。
匹配的 start running 使 Operation running、fixture Delivery accepted；start 超时使两者 unknown；完成核验后两者 completed。

## 独立外部 Fixture 合同

Tester 独立编写 fixture 进程及其控制接口；实现不读取或改变计数/Oracle 逻辑。
fixture 独立于 Core 生命周期，日志持久化保留每次 start/inspect、实际启动数、完成效果数及 effect_marker。
Core 只调用 Unix socket HTTP POST `/start`、`/inspect`，JSON 字段为 operation_id/project_id/run_id/attempt_id/object_version。
成功 start 返回同样身份与 `{status:"running"}`；inspect 返回同样身份及上述状态，completed 含 effect_marker，not_started 必含 authoritative。
测试控制可在外部接受 start 前后丢应答、完成操作、切换 inspect 为未知/不可用/not_found/权威未启动及覆写旧 Attempt/版本观察。
Fixture 可用屏障挂起 inspect 应答，以便稳定观察 unknown；释放、完成与状态切换只经 Tester 控制接口，不靠长 sleep。
控制接口不属于生产 Core；fixture 本身必须允许记录重复 start，不能用其去重掩盖 Core 的重复派发。
实际启动/效果次数只对本 fixture 有意义，不形成跨系统 exactly-once 承诺。

## 最小验证与停止条件

| ID | 通过条件 |
| --- | --- |
| C1 | 两真实 SDK Client 同 Core；全部断开后操作继续，重连领取/确认；第二 Core 同 DB 明确拒绝 |
| C2 | 双 Project/Run、同原生 Session/幂等键不串线；错 Run、跨绑定/混合 ack、旧 Attempt/版本均拒绝且无部分更新 |
| C3 | WAL 与实际配置可查；before_commit 崩溃后三者全无/外部零启动；after_commit 崩溃后意图留存并安全处理 |
| C4 | start 已接受但应答丢失：unknown、重复请求/调度/重启均不二次 start；inspect running 等待、completed 只补记；启动/效果各1 |
| C5 | inspect 未知/不可用/not_found 不盲重派；冲突资源冻结而独立项目继续；只有权威未启动可安全再派，次数受限 |
| C6 | 外部完成但本地未记账时崩溃，重启 inspect 补同一结果；事件未确认同 ID 重投，已确认不复活 |

全部仅映射 R-004 / AC-004 的机制证据子集，T008 与产品 AC 不提前勾选。
命名屏障控制故障时序，禁止用长 sleep 碰概率；无命中/日志缺失/环境拒绝为 INCONCLUSIVE，不记 PASS。
串 scope、部分提交、重复危险派发、旧 Attempt 覆盖、双 Core 调度或丢已提交事件为 FAIL；保留现场，不靠重置 fixture 修复结果。
未知外部结果不得当失败后盲重试；出现真实凭据/外部写入需求立即停止受影响部分，回到 Leader/人类授权。
独立 Tester 先只写测试与 fixture，入口缺失为 EXPECTED_RED；Leader 复核后才授权实现，最终新会话在固定 SHA/新 fixture 复跑。
在 PoC 目录运行固定入口：

```sh
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run core.test.ts
node fixture.ts --self-check
```

依赖按 package/lockfile 安装；后续在同主机空临时目录以 Node 26、新 store、frozen-lockfile/ignore-scripts 安装并复跑，不等同于全新 OS 验证。
独立回归先复现 start 身份错配，修复后由独立最终验证会话固定 SHA、新 fixture 复跑；实际结果及限制只在矩阵和 [core-recovery-probes.json](../artifacts/core-recovery-probes.json) 维护。

参考：[Node SQLite API](https://nodejs.org/api/sqlite.html)、[SQLite 锁模式](https://www.sqlite.org/pragma.html#pragma_locking_mode)；实际安装与双进程故障测试优先。
