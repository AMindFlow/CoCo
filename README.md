---
summary: 介绍 CoCo 的交付目标、当前成熟度和最短项目阅读及验证入口。
read_when:
  - 首次了解 CoCo 或运行仓库现有检查
  - 查找需求、活动阶段及文档地图
---

# CoCo

基于 Codex 与 DeepSeek Harness 的事件驱动多 Agent 软件交付协调工具。
目标是用一个本地 Coordinator 服务多个隔离项目，复用 GitHub PR、Review、CI 与 Merge Queue 完成交付。

当前处于 **Phase 0：规则适配与能力验证**，尚无可运行的 Coordinator 产品。

- [当前状态](docs/project/current-state.md)：继续工作入口。
- [需求基线](docs/requirements/README.md)：v1.2 章节及产品验收索引。
- [文档地图](docs/README.md)：按任务选读。
- [能力矩阵](docs/specs/spike/phase-0/refs/poc-matrix.md)：实际证据与未测能力。

仓库现有检查（无需安装依赖）：

```sh
node scripts/check-docs.mjs
git diff --check
```

CI 的 `docs-integrity` 检查 metadata、相对文件链接和需求快照完整性；预算超出仅提示。
它不是 Runtime、权限或产品 AC 的验收。管理员配置 Required Check 前应先确认远端实际运行。
