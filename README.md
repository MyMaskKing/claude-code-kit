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

> `lessons/` 是否随仓库分发由你自行决定（默认在 `.gitignore` 中）：源目录缺失时安装器只跳过教训库并给出警告，技能、指令文件、hook、settings 照常安装，不会失败。

> 也可 `npm link` 后用 `claude-code-kit-install` 命令安装。

## 升级（已安装用户）

套件无自动更新，安装器幂等——拉取源仓库更新后重跑一次即为**融合升级**（不会覆盖你的个人规则）：

```bash
cd claude-code-kit
git pull
node install.mjs   # 等价：bash install.sh 或 claude-code-kit-install
```

每份指令文件（`CLAUDE.md` / `AGENTS.md` / `GEMINI.md`）分两个区域：

- **托管块**（`<!-- CODEKIT:START -->` 与 `<!-- CODEKIT:END -->` 之间）：套件规约，升级时自动替换为最新版；
- **用户自定义区**（标记块之外，通常在文件末尾）：你的个人规则，安装器永不触碰。

升级行为：

- 已带托管标记：只替换块内内容，块外个人规则逐字符保留；块内无变化则该文件不写入；
- **更早安装的老用户**（文件中还没有标记）：首次升级自动迁移——最新套件写入托管块，旧文件**全文**移入用户区并附一行清理提示，零丢失；按提示删掉与托管块重复的旧段落即可，此后升级全自动融合；
- 变化的旧文件写入前备份为 `*.bak.<UTC时间戳>`；
- skills / lessons / hook：**清单化镜像**为最新版本——按目标根的 `.codekit-manifest.json` 清理源仓库已下架的旧文件与变空的目录，清单之外你自己放进去的文件永不删除（不逐文件备份）；
- settings.json 只做并集合并，已有 `env`、model、权限等不被覆盖。

升级后**重启各 AI 工具**。个人规则请写在标记块之外；托管块内的改动下次升级时会被覆盖。

## 装到哪里

| 内容 | 位置 |
|------|------|
| `code-change-protocol` 技能 | `~/.claude/skills/`、`~/.agents/skills/`（Codex 通用位置）、`~/.gemini/skills/` |
| 通用教训案例库 `lessons/` | `~/.claude/lessons/`、`~/.agents/lessons/`、`~/.gemini/lessons/` |
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
| `lessons/`（INDEX + 案例） | ✅ 核心 | 跨项目通用教训案例详情：现象、根因、适用边界 | 是，复制到三个 lessons 目录 |
| `CLAUDE.md`（仓库根） | ❌ 非核心 | 本仓库自身的开发指引（安装器架构、非破坏性契约、沙盒验证） | 否，仅在本仓库工作时读取 |
| `README.md` | ❌ 非核心 | 项目说明：安装、升级、文件用途 | 否 |

安装器负责组装分发，主目录中的三份指令文件不手工维护。

**安全性：** 全程非破坏性——指令文件融合安装（套件内容在 `CODEKIT` 托管块内更新，块外个人规则不动），变化的旧文件备份为 `*.bak.<时间戳>`；settings.json 只做并集合并（不覆盖 `env`、token、model），内容无变化时不备份不重写。仓库不含任何密钥。

## 其他工具

- **Cursor / Windsurf / Aider / Zed / Warp / opencode**：均支持 `AGENTS.md`。把 `agent.md` 复制为项目根或 `~/.codex/AGENTS.md` 即可被读取；Codex 全局文件天然在上述安装位置。
- **GitHub Copilot（IDE）**：使用项目级 `.github/copilot-instructions.md`，把 `agent.md` 内容粘进去；Copilot Coding Agent（云端）直接读 `AGENTS.md`。
- 项目级共享：在仓库根放一份 `AGENTS.md`，上述绝大多数工具都会自动加载。

## 规约如何演进

沉淀门槛、分层落点、退役规则见 `code-change-protocol` 技能的「规约演进」一节。同步流程：

1. 改本地内容并验证；
2. 把变更同步回本仓库（`agent.md` / `supplements/` / `skills/` / `lessons/`）；
3. commit 推送，其他机器 `git pull && node install.mjs`。

## 前置依赖

CodeGraph 漏斗仅在含 `.codegraph/` 索引的项目内生效，未索引项目自动放行。CodeGraph MCP 不可用导致检索被 hook 拦截时，可在 settings.json 的 `env` 或系统环境变量设置 `CODEKIT_GATE=off` 临时放行（恢复后立即移除，不是常规关闭开关）。
