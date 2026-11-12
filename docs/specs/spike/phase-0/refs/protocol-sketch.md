---
summary: 描述待评审的最小数据、事件、Adapter、授权与恢复边界，供 Phase 0 核验技术假设。
read_when:
  - 为 Coordinator 基础切片设计协议、Schema 或状态转移
  - 审查项目隔离、幂等、租约和可信恢复的候选方案
---

# 协议边界草案

状态：候选设计，不是已交付 API；需求来自 [v1.2 第4～6、15～19、23章](../../../../requirements/README.md)。
接口版本、存储驱动与权限机制在真实能力核验后由后续切片锁定。

## 实体与不变量

| 实体 | 最小身份与关系 | 不变量 |
| --- | --- | --- |
| Project | 内部 ID、规范化仓库路径、GitHub repository ID、目标分支 | 同物理仓库不重复注册 |
| Run | Project、Leader 归属、Spec 版本、风险、模式 | 一个有效管理 Owner；操作显式绑定 Run |
| Node / Work Package | Run、角色、Owner、依赖、输入合同版本 | DAG 无环；新工作只在 Leader 授权内派发 |
| Session | 内部 ID、Runtime 原生 ID、Project/Run、角色、目录 | 原生 ID 不独立全局唯一；不跨项目，Worker 默认不跨 Run |
| Attempt | Node、Session、输入 SHA、租约、版本 | 一次实际执行一条；旧 Attempt 不能提交新结果 |
| Resource Lease | 资源规范 ID、Owner、generation、期限 | Session Turn / Worktree / 集成分支写入互斥 |
| Event | Project/Run、类型、版本、correlation、subject、payload_ref | 发生事实不可与送达状态混为一谈 |
| Delivery | Event、明确目标、Attempt、重试与状态 | 每个目标独立确认；Runtime 接受不等于完成 |
| Evidence | 来源、对象、外部 ID、SHA、合同版本、结果 | 代码或合同变化使受影响旧证据失效 |
| Checkpoint | Git SHA、Handoff hash、输入版本、验证状态 | 提交协议校验后才有效 |

Run 级查询必须同时校验真实调用者、Project、Run 和角色，不信任请求自行声称的 Owner。
外键、唯一约束和版本比较提供本地一致性；不能只靠模型记忆或路径字符串隔离。

## 事件与副作用

1. 命令验证授权和版本，在一个 SQLite 事务内写状态、Event 与待投递意图。
2. Core 领取 Outbox，保存 Operation ID 与 Attempt / Lease 后调用 Adapter。
3. 已知暂时失败进入有限指数退避；认证和权限错误不无限重试。
4. Runtime 确认只更新投递接受；实际结果及证据经核验才推进 Node。
5. 调用超时结果未知时冻结冲突派发，先查询 Operation / Session / Git / GitHub。
6. 重启先 reconcile 未完成投递与租约，明确可重试才重试，否则进入 `NEEDS_ATTENTION`。

去重键绑定 Project / Run、操作类型、对象版本和幂等键，不能把不同新业务事件错误合并。
同 Session 新事件排队、按有效版本聚合；不启动重叠 Turn。
租约过期本身不能证明旧进程已停；跨外部系统无通用 fencing 保证，必须核验旧写入者或升级人工。
Outbox 提供本地原子意图，不能保证跨 SQLite、Runtime、GitHub 严格 exactly-once。

## Adapter 能力合同

| Adapter | 候选操作 | 必须返回的事实 |
| --- | --- | --- |
| Runtime | capabilities、start、resume、inspect、cancel | Session / Operation、明确接受状态、事件、最终结果或未知状态 |
| GitHub | inspect PR/check/review/queue、受控创建/入队 | repository ID、PR、Head/Merge Group SHA、外部记录 ID |
| Recovery | prepare、validate、commit checkpoint、rebuild | Git 与 Handoff 对应、完整性、恢复输入和隔离范围 |

能力协商分别记录 Session 恢复、指定 cwd、权限、JSON、取消、状态查询；缺失能力不能用空成功补齐。
Runtime 配置、模型路由与认证引用分层见 [接入合同](dsh-binding.md)，不将本次操作者的私有设置写成产品常量。
DSH Headless 无法可靠查询未知启动时，不直接重启第二个写入者。
进程退出码 0 且缺少 final 仍为结果未知；不能只看退出码判定完成或已取消。
Review 标准状态只在真实完成证据可解释时产生 PASS，否则保持 INCONCLUSIVE / UNAVAILABLE。

## MCP / IPC 候选边界

按需求先考虑 register_project、create_run、bind_leader、submit_plan、dispatch_ready_tasks、get_pending_events、acknowledge_events、submit_decision、get_status。
所有输入由共享 Zod/协议定义校验；耗时操作返回 Operation ID，不阻塞 MCP 生命周期。
领事件采用 claim / ack 与可恢复投递；读取不是消费，取消不是删除审计记录。
stdio 网关携带受控身份上下文，Core 对每次调用重验范围；信封字段不能充当身份或人工批准。
人类批准入口、凭据签发和同用户进程隔离尚未定案；真实高风险自动操作在此前保持禁用。

## Checkpoint 提交协议候选

记录准备意图 → 确认提交 SHA 与范围 → 写 Handoff 内容哈希 → 校验二者与输入版本 → 标记 VALID。
中途失败保留未完成状态，不能将半成品用作恢复点。
恢复先原 Session；不可用才从最近 VALID 点建立隔离工作区和新 Session。
未知未提交修改只保全，不当作可信恢复输入；缺少有效点升级 Leader。
