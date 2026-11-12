---
summary: Describes the project's durable purpose, boundaries, domain model, technology posture, architecture, and document ownership.
read_when:
  - onboarding to the project or evaluating whether a request belongs to its core domain
  - changing project purpose, scope boundaries, architecture, technology posture, or document ownership
  - needing stable project context that should not come from current-state.md
---

# Project Overview

## Project Card

- Name: `CoCo`
- Type: `事件驱动的多 Agent 软件交付协调工具（MCP 服务与规则、Skills 包）`
- Description: `基于 Codex 和 DeepSeek Harness，实现协调多个 Agent 进行软件交付的事件驱动工作流；主要构建协调 MCP 服务及各工作角色的规则、Skills 包。`
- Current status: `docs/project/current-state.md`

## Scope Boundaries

- In scope: TBD - refine the project-owned responsibilities when they become concrete.
- Out of scope: TBD - record boundaries when exclusions become relevant.
- External dependencies: TBD - record dependencies when they become concrete.

## Domain Model

- Core concepts: TBD - define durable terms as the domain model stabilizes.
- Source of truth: TBD - define before introducing authoritative records or persistent data.
- Review boundary: TBD - define when a workflow requires human or external approval.

## Technology Posture

- Stack summary: `核心服务：TypeScript + Node.js 26 LTS；工程组织：pnpm workspace；MCP：官方 TypeScript SDK + Zod；存储：SQLite WAL，由常驻协调进程管理事件日志、任务状态、租约和待投递消息；规则与 Skills：Markdown/YAML；验证：Vitest + TypeScript 类型检查；运行时接入：Codex app-server 适配器与独立 DeepSeek Harness（dsh）适配器。具体依赖版本、MCP 传输方案及 dsh 接入协议在首个 SDD 中核验并锁定。`

Use the stack summary for initialization. When the stack becomes concrete, keep a compact table here:

| Area | Choice | Owner Or Source |
| --- | --- | --- |
| Runtime and application | TBD | First accepted SDD spec or architecture decision |
| UI or interaction surface | TBD | First accepted SDD spec or architecture decision |
| Data and storage | TBD | First accepted SDD spec or architecture decision |
| Automation and integrations | TBD | First accepted SDD spec or architecture decision |
| Validation and delivery | TBD | `docs/workflow/` and accepted specs |

## Architecture Map

- System context: TBD - record external systems, major interactions, and trust boundaries when known.
- Major building blocks: TBD - link accepted specs or architecture documents when they exist.
- Runtime and deployment: TBD - link the owning spec when the project has a concrete runtime.

## Documentation Ownership

- Changing status: `docs/project/current-state.md`.
- Implementation contracts: `docs/specs/`.
- Workflow rules: `docs/workflow/`.
- Agent routing rules: `docs/.agent/conventions/`.
