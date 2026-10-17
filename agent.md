# AI 编码执行规约

## 1. 核心优先级（永久置顶）

正确性 > 最小修改 > 代码一致性 > 性能优化

## 2. 全局强制红线

1. 不编造变量、不臆测缺失需求、不越范围开发
2. 无需求不新增依赖、不做无关重构/格式优化
3. 修改前读取最新文件，不依赖历史上下文覆盖代码
4. 不确定实现立刻停止，向用户确认

## 3. 代码任务入口

任何代码改动（bug 修复、功能开发、重构、API/数据结构调整、跨模块改动）开始前，必须查阅并遵循 `code-change-protocol` 技能——任务路由、PLAN、实现、VERIFY 及规约自身的迭代流程均在其中。技能位于用户级 skills 目录（如 `~/.claude/skills`、`~/.agents/skills`、`~/.gemini/skills`）。

## 4. 编码与风格

1. 全程中文沟通，代码注释跟随项目现有风格
2. 默认 UTF-8 无 BOM，不修改文件编码
3. 严格对齐项目原有命名、结构、异常处理、日志写法
4. 优先复用现有代码（DRY）

## 5. Git 限制

禁止执行任何 git 操作（commit/push/merge/reset/checkout 等），仅可提供 commit 注释建议。

## 6. 输出规则

默认仅输出：修改文件列表、改动说明、VERIFY 校验结果，并附一条精简的 commit 信息建议（只建议、不执行 git）；禁止冗余长篇解释。

## 7. 记忆、教训与规划留痕

1. 会话开始：项目根存在 `.ai/MEMORY.md` 时先读索引，命中当前任务再读条目全文；用户级 `lessons/INDEX.md`（与 skills/ 同级的用户目录）同样扫读。项目无 `.ai/` 但存在工具原生本地记忆（如 `~/.claude/projects/<项目哈希>/memory/`）时，只读扫读其索引作为历史背景，不回写、不清理。
2. 规划留痕：仅 FULL 档任务的 PLAN 必须写入项目 `.ai/plans/YYYY-MM-DD-<中文主题>.md`，控制台只给文件路径与极简摘要，经用户确认后再实现；DIRECT 档无 PLAN，LIGHT 档极简 PLAN（≤5 行）仍在控制台进行、不写文件。规划文件只写契约不写实现代码，保留不删除。`<中文主题>` 必须是本次规划的核心内容说明，用中文简明命名，禁止用 plan、规划、tracing、留痕等过程词。
3. 任务收尾（VERIFY 后、交付前）：主动检查本次有无值得沉淀的内容，有则立即落盘再交付，不等用户提醒。
4. 值得沉淀：用户明确的决策/意志、被证伪的假设与根因、非显然的事实与坑；不沉淀：代码结构、git 历史、一次性对话内容。
5. 落点：单项目记忆 → 项目 `.ai/memory/`（主题分卷：一个主题一个文件、文件内 `##` 小节，条目少用单个 `notes.md`；`.ai/MEMORY.md` 一行一条带锚点；新认知归入最贴近的主题，全新领域才开文件，文件臃肿再拆分）；跨项目通用教训 → 按 code-change-protocol 第 6 节提议进套件（规则进本文件/skill，案例详情进 lessons/）。
6. `.ai/` 默认不提交 git：首次在项目创建 `.ai/` 时，向该项目 `.gitignore` 追加 `.ai/`（用户明确要求纳入版本控制时除外）；如何跨机器同步由用户自行决定。密钥凭证隐私一律不写入任何层。
7. 工具原生本地记忆仅用于明确不迁移的机器本地内容；历史项目记忆只读兼容。

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
