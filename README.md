# claude-code-kit

个人 AI 编码规约套件，一次安装同时适配 **Claude Code / Codex / Gemini CLI**（Cursor、Windsurf、Copilot Coding Agent、Aider、Zed 等读 `AGENTS.md` 的工具同样受益）。

## 一键安装

**Node.js（推荐，跨平台）：**

```bash
git clone <你的仓库地址> claude-code-kit
cd claude-code-kit
node install.mjs
```

**Bash（等价，内部转 Node）：**

```bash
bash install.sh
```

需 Node.js ≥ 16.7。安装后**重启各 AI 工具**。

> 也可 `npm link` 后用 `claude-code-kit-install` 命令安装。

## 装到哪里

| 内容 | 位置 |
|------|------|
| `code-change-protocol` 技能 | `~/.claude/skills/`、`~/.agents/skills/`（Codex 通用位置）、`~/.gemini/skills/` |
| Claude 指令 | `~/.claude/CLAUDE.md`（核心 + Superpowers 专属红线） |
| Codex 指令 | `~/.codex/AGENTS.md`（尊重 `CODEX_HOME`） |
| Gemini 指令 | `~/.gemini/GEMINI.md` |
| CodeGraph 漏斗 hook | `~/.claude/hooks/codegraph-gate.mjs` + settings.json 注册（Claude 专属） |

**内容来源（单一事实源）：**

- `agent.md` — 跨工具核心：优先级、红线、代码任务入口、编码风格、Git 限制、输出规则、CodeGraph 说明
- `supplements/claude.md` — Claude 专属：Superpowers 使用红线
- 安装器负责组装分发，三份指令文件不手工维护

**安全性：** 全程非破坏性——内容不同的旧文件备份为 `*.bak.<时间戳>`；settings.json 只做并集合并（不覆盖 `env`、token、model），内容无变化时不备份不重写。仓库不含任何密钥。

## 其他工具

- **Cursor / Windsurf / Aider / Zed / Warp / opencode**：均支持 `AGENTS.md`。把 `agent.md` 复制为项目根或 `~/.codex/AGENTS.md` 即可被读取；Codex 全局文件天然在上述安装位置。
- **GitHub Copilot（IDE）**：使用项目级 `.github/copilot-instructions.md`，把 `agent.md` 内容粘进去；Copilot Coding Agent（云端）直接读 `AGENTS.md`。
- 项目级共享：在仓库根放一份 `AGENTS.md`，上述绝大多数工具都会自动加载。

## 规约如何演进

沉淀门槛、分层落点、退役规则见 `code-change-protocol` 技能的「规约演进」一节。同步流程：

1. 改本地内容并验证；
2. 把变更同步回本仓库（`agent.md` / `supplements/` / `skills/`）；
3. commit 推送，其他机器 `git pull && node install.mjs`。

## 前置依赖

CodeGraph 漏斗仅在含 `.codegraph/` 索引的项目内生效，未索引项目自动放行。
