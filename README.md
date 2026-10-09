# claude-code-kit

个人 Claude Code 规约套件：代码改动流程 skill + 常驻红线 CLAUDE.md + CodeGraph 检索漏斗 hook。跨机器一键安装。

## 一键安装

**Node.js（推荐，跨平台；Windows 无需 Git Bash）：**

```bash
git clone <你的仓库地址> claude-code-kit
cd claude-code-kit
node install.mjs
```

**Bash（macOS / Linux / Git Bash）：**

```bash
bash install.sh
```

两种方式等价，均需 Node.js ≥ 16.7。安装后**重启 Claude Code**。

> 也可 `npm link` 后用 `claude-code-kit-install` 命令安装（可选）。

## 装了什么

| 文件 | 安装位置 | 说明 |
|------|----------|------|
| `skills/code-change-protocol/SKILL.md` | `~/.claude/skills/` | 任务路由（DIRECT/LIGHT/FULL）、PLAN、IMPLEMENT、VERIFY、规约演进流程 |
| `CLAUDE.md` | `~/.claude/CLAUDE.md` | 常驻红线：优先级、禁令、中文/UTF-8、git 限制、Superpowers 红线 |
| `hooks/codegraph-gate.mjs` | `~/.claude/hooks/` | Grep/Glob 前强制先走两次 CodeGraph 的漏斗 |
| `settings.snippet.json` | 合并进 `~/.claude/settings.json` | hook 注册 + 三个 superpowers skill 禁用 |

**安全性：** 安装全程非破坏性。已有 `CLAUDE.md` / `settings.json` 先备份为 `*.bak.<时间戳>`；settings 只做并集合并，不覆盖 `env`、token、model 等任何已有配置。仓库本身不含任何密钥。

## 卸载

删除 `~/.claude/skills/code-change-protocol`、`~/.claude/hooks/codegraph-gate.mjs`，用备份还原 `CLAUDE.md` 与 `settings.json`，并手工移除 settings 中对应的 hook/deny 条目。

## 规约如何演进

日常迭代规则（什么情况沉淀、写到哪一层、何时退役旧规则）见 skill 的「规约演进」一节。本仓库与本地 `~/.claude` 内容的同步流程：

1. 改本地 skill / CLAUDE.md 并验证；
2. 把变更同步回本仓库对应文件；
3. commit 推送，其他机器 `git pull && bash install.sh` 更新。

## 前置依赖

- CodeGraph 检索漏斗仅在含 `.codegraph/` 索引的项目内生效；未索引项目自动放行，无需卸载。
