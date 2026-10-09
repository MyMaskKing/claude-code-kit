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

默认仅输出：修改文件列表、改动说明、VERIFY 校验结果；禁止冗余长篇解释。

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
