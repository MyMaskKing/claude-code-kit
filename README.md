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

## 升级（已安装用户）

套件无自动更新，安装器幂等——拉取源仓库更新后重跑一次即为升级：

```bash
cd claude-code-kit
git pull
node install.mjs   # 等价：bash install.sh 或 claude-code-kit-install
```

重跑行为与首次安装一致：

- 三份指令文件、settings.json：内容有变化才写入，旧文件备份为 `*.bak.<UTC时间戳>`；无变化不动；
- skills / hook：递归覆盖为最新版本（不逐文件备份）；
- settings.json 仍只做并集合并，已有 `env`、model、权限等不被覆盖。

升级后**重启各 AI 工具**。不要直接改主目录里的副本（`~/.claude/CLAUDE.md`、skills、hooks）——它们是生成物，下次安装即被覆盖且无法回流；规则变更只改本仓库源文件。

## 装到哪里

| 内容 | 位置 |
|------|------|
| `code-change-protocol` 技能 | `~/.claude/skills/`、`~/.agents/skills/`（Codex 通用位置）、`~/.gemini/skills/` |
| Claude 指令 | `~/.claude/CLAUDE.md`（核心 + Superpowers 专属红线） |
| Codex 指令 | `~/.codex/AGENTS.md`（尊重 `CODEX_HOME`） |
| Gemini 指令 | `~/.gemini/GEMINI.md` |
| CodeGraph 漏斗 hook | `~/.claude/hooks/codegraph-gate.mjs` + settings.json 注册（Claude 专属） |

**仓库内的 Markdown 文件：**

| 文件 | 是否核心 | 用途 | 是否分发 |
|------|------|------|------|
| `agent.md` | ✅ 核心 | 跨工具核心规约：优先级、红线、代码任务入口、编码风格、Git 限制、输出规则、CodeGraph 说明 | 是，整体写入三份指令文件 |
| `supplements/claude.md` | ✅ 核心 | Claude 专属补充：Superpowers 使用红线 | 是，拼接到 `~/.claude/CLAUDE.md` 末尾 |
| `skills/code-change-protocol/SKILL.md` | ✅ 核心 | 改动流程技能：任务路由、PLAN、实现、VERIFY、检索漏斗、规约演进 | 是，复制到三个 skills 目录 |
| `CLAUDE.md`（仓库根） | ❌ 非核心 | 本仓库自身的开发指引（安装器架构、非破坏性契约、沙盒验证） | 否，仅在本仓库工作时读取 |
| `README.md` | ❌ 非核心 | 项目说明：安装、升级、文件用途 | 否 |

安装器负责组装分发，主目录中的三份指令文件不手工维护。

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
