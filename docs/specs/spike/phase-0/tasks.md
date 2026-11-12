# Phase 0 任务

## 状态

- Active tasks: T005
- Updated: 2026-11-12
- Blockers: DSH 原生取消、并发/preset 与强读取隔离尚未证明；Desktop、Review、CI、Merge Queue 等仍待动态验收；详见 PoC 矩阵。
- 任务 checkbox 是本切片唯一进度清单，不在 roadmap 或 current-state 复制。

## 当前顺序

- [x] T001 [R-001,R-002,R-003,AC-001,AC-002,AC-003] 适配规则与角色入口 — depends: none — check: 无生效的旧分支路线，metadata/链接/预算检查及独立审查通过。
- [x] T002 [R-004,AC-004] 建立不可变需求来源和能力证据矩阵 — depends: none — check: 原文 SHA256 一致，原 AC-01～AC-23 完整路由，每项能力分层标注。
- [x] T003 [R-005,AC-005] 形成最小架构及协议边界草案 — depends: T002 — check: 覆盖隔离、Event/Delivery/Attempt、授权、租约、Checkpoint 与未知结果，不伪称已实现。
- [x] T004 [R-004,AC-004] 隔离探测 DSH / Codex 帮助与 app-server 握手 — depends: T002 — check: 版本和原始证据可复现，无真实用户 Session 或配置变更；帮助不算业务验证。
- [ ] T005 [R-004,AC-004] 核验 DSH 真实创建、恢复、目录、JSON、权限与取消 — depends: T004 — check: 对照 PoC Oracle 记录通过及限制；仅只读核对已授权配置，认证值由 Runtime 解析，权限负例只访问 fixture。
- [ ] T006 [R-004,AC-004] 验证 Desktop MCP、Leader 兼容领取与可选自动恢复 — depends: T004 — check: 正确 Thread / Project / Run，断连重连和待领取事件不丢；不把握手算 Desktop 通过。
- [ ] T007 [R-004,AC-004] 验证 GitHub Review / CI / Merge Queue 与旧 SHA 失效 — depends: T002 — check: 受控 PR、当前 SHA 及实际 merge_group 证据；管理员先完成必要配置。
- [ ] T008 [R-004,AC-004] 以最小 Core PoC 验证双 Client / 双 Project、超时与重启 — depends: T005,T006 — check: Tester 独立合同获 Leader 复核，故障不串扰或重复危险操作。
- [x] T009 [AC-006] 新会话对规则与草案做最终独立只读审查 — depends: T001,T002,T003 — check: 阻塞发现有修复证据，记录会话、范围和未测项。
- [x] T010 [R-006,AC-007] 固化配置/认证分层合同及本次脱敏证据 — depends: T004 — check: 外部配置引用可定位，源文件字节未变且 mtime 例外可见，经独立审查且不宣称生产 Adapter 已实现。

本轮规则适配与调查文档属于一个逻辑提交；T001～T004、T009 可在同一提交记录，不强制文档任务空提交。
T005 以后涉及真实执行和写入时，各自先固定 Fixture、权限、检查命令与批准范围。
仅文档子集交付不能勾选产品能力任务，T005～T008 全部完成前不将整个 Phase 0 设为 complete。

## 退出

关键依赖有真实证据或人类明确接受的限制，能力与 Adapter 合同足够稳定后，才锁定 Phase 1 实施 Spec。
最终 `complete` 需技术验收；`verified` 仍由人类设置。

## 规则适配验证（c073285）

独立规划会话 `validation_plan`、最终静态审查会话 `final_review` 均为新上下文，未编辑文件。
静态审查无阻塞发现；metadata 列表归属建议已修复，最终小差异经同一独立会话重新检查亦无阻塞。
实际检查：`node scripts/check-docs.mjs`（42 Markdown、0 错误、0 预算提示）、`node --check scripts/check-docs.mjs`、`git diff --check` 和暂存后的 `git diff --cached --check`。
不可变需求原文的行尾空白按精确文件的 .gitattributes 例外保留，原文哈希仍独立检查；其他文件不豁免。
受控反例：缺 metadata、断链与列表归属错误退出 1；超预算仅警告、有效文档退出 0。
此证据不覆盖 Runtime、沙箱、Desktop、远端 Review / CI / Merge Queue 或完整产品验收。

## T005 独立动态验证

规划会话 `dsh_poc_plan` 的 Oracle 经 Leader 复核后执行；新会话 `dsh_verify` 在独立私有 fixture 复测。
创建、无 nonce 提示的同目录恢复、跨目录原生拒绝已获得动态证据；原生读写边界和宿主终止结果分开记录。
完整通过范围、失败与未证项只在 [PoC 矩阵](refs/poc-matrix.md) 与关联结构化证据维护，T005 不提前勾选。
新增 R-006/AC-007 来自用户本轮明确要求；接入合同已形成，生产 Adapter 尚未实现，不将合同视为已实现功能。
本轮文档检查为 43 Markdown、0 错误、0 预算提示；`dsh_poc_plan` 只读复核后，修正了 T005 对授权配置读取的措辞及完整性检查范围。
