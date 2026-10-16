# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库定位

本仓库是个人 AI 编码规约套件的**源仓库**（单一事实源），不是应用项目：由 Node 安装器把 Markdown 指令、skill、hook 分发到用户主目录的 `~/.claude`、`~/.codex`、`~/.gemini`、`~/.agents`。纯 ESM 脚本 + Markdown，**零第三方依赖，没有 build / lint / test**，运行环境 Node.js ≥ 16.7。

## 常用命令

| 用途 | 命令 |
|------|------|
| 安装 / 同步到用户主目录 | `node install.mjs`（等价 `bash install.sh`） |
| 沙盒验证安装器（不触碰真实主目录） | `CODEKIT_HOME=<临时目录> node install.mjs` |
| 单独验证 settings 合并逻辑 | `node scripts/merge-settings.mjs <snippet.json>`（用 `CLAUDE_DIR=<目录>` 重定向目标） |
| 注册全局安装命令 | `npm link`（生成 `claude-code-kit-install`） |

验证安装器改动的唯一手段是 `CODEKIT_HOME` 沙盒：跑一遍后检查其中生成的指令文件、skills/hooks 副本与 settings.json 合并结果。仓库无自动化测试，不要把安装器跑成功等同于验证通过。

## 架构：源文件 → 安装目标

`install.mjs` 是唯一分发入口，四步顺序执行：复制 skills → 写三份指令文件 → 复制 hook → 合并 settings。

| 源（本仓库内） | 安装目标 | 方式 |
|------|------|------|
| `agent.md`（跨工具核心指令） | `~/.codex/AGENTS.md`、`~/.gemini/GEMINI.md` | 整体写入 |
| `agent.md` + `supplements/claude.md` | `~/.claude/CLAUDE.md` | 拼接（core + supplement） |
| `skills/`（code-change-protocol） | `~/.claude/skills/`、`~/.agents/skills/`、`~/.gemini/skills/` | `fs.cpSync` 递归覆盖 |
| `hooks/codegraph-gate.mjs` | `~/.claude/hooks/` | `fs.cpSync` 递归覆盖 |
| `settings.snippet.json` | `~/.claude/settings.json` | 非破坏性合并（逻辑在 `scripts/merge-settings.mjs`） |

**安装后的产物一律不手工修改**：主目录里的 CLAUDE.md / AGENTS.md / GEMINI.md、skills、hooks 均为副本，手改既会在下次安装被覆盖，也无法回流。规则迭代只改本仓库源文件，再重跑 `node install.mjs`。

目标路径的环境变量重定向：`CODEKIT_HOME` 把四个目标统一重定向到其下的 `.claude/.codex/.gemini/.agents`（测试用；设置后 `CODEX_HOME` 被忽略）；`CLAUDE_DIR` 优先级更高、仅重定向 Claude 目标；`CODEX_HOME` 是 Codex 官方变量。

## 安装器的非破坏性契约

修改 `install.mjs` / `merge-settings.mjs` 时必须保持：

- **指令文件**：目标已存在且与新内容字节不一致时，先备份为 `<文件名>.bak.<UTC时间戳14位>` 再覆盖；内容相同不写。
- **skills / hooks**：`fs.cpSync` 直接递归覆盖，**不做逐文件备份**——与指令文件的备份策略不同。
- **settings.json 合并**：已存在的顶层键（`env`、`model` 等）一律不动；`permissions.deny/allow` 取并集去重；hooks 按 `event → matcher` 归组、按归一化后的 `command` 去重（`normCmd` 会展开 `$HOME/$USERPROFILE`、统一盘符与斜杠，使两种写法判为同一条）；snippet 中的 `{{CLAUDE_DIR}}` 占位符合并时替换为目标目录；现有 settings.json 解析失败则中止且不写入；合并结果无变化时不备份、不重写。
- `scripts/merge-settings.mjs` 既可 CLI 单独运行，也对外导出 `mergeSettings(claudeDir, snippet)`，install.mjs 通过该函数复用同一份逻辑。

## codegraph-gate hook 行为

`hooks/codegraph-gate.mjs` 经 `settings.snippet.json` 注册为 PreToolUse（`Grep|Glob`）与 PostToolUse（`mcp__codegraph__codegraph_explore`）钩子，payload 经 stdin 传入：

- 仅在被索引项目内生效：从 cwd 向上最多 25 级寻找含 `.codegraph/codegraph.db` **文件**的目录——只看 `.codegraph/` 目录名会误判 `~/.codegraph` 等其它工具的同名目录；找不到索引，或 payload 无 `session_id`，一律 `exit 0` 放行。
- 同一 session + 同一索引根下，`codegraph_explore` 计数不足 2 次时，Grep/Glob 被 `exit 2` 阻断（要求先业务自然语言、再技术词各查一次）；达到 2 次放行。
- 计数存于 `~/.claude/.codegraph-gate-state.json`，按 `session_id::索引根` 隔离，7 天未更新的条目自动清除；状态文件读写失败静默处理，不阻断正常工作。
- hook 只是强制手段；检索漏斗的规则正文在 `skills/code-change-protocol/SKILL.md` 第 5 节，调整规则时两处需一起考量。

## 改动本仓库时

- 同样遵循 `skills/code-change-protocol/SKILL.md` 的任务路由（DIRECT / LIGHT / FULL）与最小 diff 约束；规约文件自身的演进走该 skill 第 6 节的流程（提议规则原文 + 落点 + 理由 → 用户确认 → 落盘）。
- 改完源文件后：先用 `CODEKIT_HOME` 沙盒跑安装器验证产物符合预期，再在真实主目录重跑 `node install.mjs` 完成同步。
- 沙盒目录请放在系统临时目录，不要放进仓库；`*.bak.*`、`.idea/` 已在 `.gitignore`。
