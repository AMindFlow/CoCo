---
summary: 定义 DSH 配置、模型路由与凭据引用的分层合同，以及现有认证 PoC 的权限边界。
read_when:
  - 实现或配置 DSH 启动、恢复及认证接入
  - 判断模型配置、凭据和任务上下文应由哪一层持有
---

# DSH 配置与凭据边界

状态：Phase 0 接入合同，生产 Adapter 尚未实现。
批准依据：用户明确允许使用现有 DSH 配置，要求实现不硬编码配置并与凭据解耦。
实际证据统一见 [能力矩阵](poc-matrix.md) 和 [实测记录](../artifacts/existing-config-probes.json)。

## 配置分层

| 层 | 持有内容 | 不持有内容 |
| --- | --- | --- |
| 可提交项目配置 | Runtime 类型、绑定别名、角色与权限要求 | 私有端点、用户安装路径、原始密钥、完整 profile |
| 操作者本机绑定 | 可执行程序、profile/patch 引用、隔离运行目录、超时、认证绑定引用 | 源码中的用户默认值或可直接覆盖人工授权的字段 |
| DSH 模型路由 | provider/model/effort、端点、credential ref | 复制到任务信封的密钥值 |
| 认证提供方 | 现有受控 store、未来支持的环境/系统存储或 broker | 项目仓库、Prompt、Handoff 中的密钥副本 |
| Task Envelope | Project/Run/Node/Attempt、工作区、输入版本、绑定别名 | 认证文件内容、token、provider headers |

模型、路由、认证位置和可执行程序不因这次本机 PoC 而固化为产品默认值。
切换操作者绑定或认证来源应无需改业务代码、任务内容或项目合同。
本机路径只在本机绑定中解析；产品源文件及生成模板不写本机路径。
CoCo 传递引用，由可信启动层和 Runtime 解析；不由 LLM 读取并转抄密钥。

## 启动合同

启动层显式接收 executable、profile、patch 引用、runtimeHome、workspace、permissionMode、approvalPolicy 与 deadline。
缺少或无效引用明确失败，不静默回落到另一个 profile、模型、凭据或权限更大的配置。
profile/patch 必须来自操作者信任的绑定，Agent 不能通过任务信封替换启动配置扩大权限。
同一 Session 恢复时重新绑定同样的工作区与必要授权；原生目录拒绝不能替代 Project/Run 归属校验。
生产 Schema 和 resolver API 仍待对应实现切片锁定，本文件不声称已有配置解析器。

## 复用现有认证的 PoC 方法

新建私有临时运行目录和工作区，隔离 `DSH_HOME`，使用运行时参数传入本机生成的 overlay 引用。
overlay 只选取所需的无密钥模型路由，并启用 credential store 的现有路径引用，关闭 watch。
不复制完整 Desktop profile，不加载无关 UI/MCP 插件，不启用无关登录/账号刷新服务。
探测子进程只继承明确的基础/代理环境，不复制整个父进程环境中的模型密钥。
原配置与认证文件前后只比较摘要与 mtime；不发布认证摘要、内容或任何 key 的局部预览。
内容未变不证明没有写入；本轮原 Desktop 派生配置 mtime 变化单独记录，未将其归因或隐去。
这验证的是特定 API-key 引用接入，不证明所有 OAuth 刷新、其他认证后端或 route 均可用。

## 权限与结果

DSH `read-only` 的 native write 实测拒绝，但 native read 可以读取工作区外 sentinel。
因此凭据不进入任务/环境并不意味着同 OS 用户下的 Agent 无法主动读取认证文件。
工作区写保护、业务归属检查与密钥读取隔离是不同能力，不能用其中一个替代另一个。
本轮没有读取真实密钥做负例，只使用无敏感内容的测试文件。

生产中若要求 Worker 无法读取认证、Core 数据库或其他项目，必须先验证更强边界：
例如独立 OS 身份/执行环境、Runtime 外的认证代理及受限文件/命令执行能力。
采用何种机制及必要人工配置须在安全设计中审核；不把本轮只读 preset 宣称为该机制。

宿主 SIGTERM 后进程退出，但没有 final 事件时，任务结果为 unknown。
即使退出码为 0，也不能上报成功或确认原生取消，更不能立即重派冲突写入者。
Session 内活动与外部副作用仍由后续状态核验和恢复协议处理。

## 证据与日志

原始 stderr、错误、工具输入和 final text 可能含路径、Session ID 或其他本地信息，不整份发布。
提交证据采用白名单状态、退出码、事件类型、随机标记匹配布尔值、工具拒绝码和文件未变结论。
同目录恢复的新提示不能包含原随机标记；仅看相同 Session ID 不足以证明上下文恢复。
每次执行有 deadline，无终态不盲目重试；审计应分清配置错误、已知失败和结果未知。

参考：[Headless 认证](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/bundle/headless/README.md)、[凭据服务](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/credentials/credentials-local/README.md)、[本地 Sandbox](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/sandbox/sandbox-local/README.md)。
