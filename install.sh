#!/usr/bin/env bash
# claude-code-kit 一键安装：把 skill / CLAUDE.md / hook 装进 ~/.claude
# 非破坏性：已有同名文件先备份；settings.json 只做合并，不覆盖 env、token。
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"
TS="$(date +%Y%m%d%H%M%S)"

echo "安装目标: $CLAUDE_DIR"
mkdir -p "$CLAUDE_DIR/skills" "$CLAUDE_DIR/hooks"

# 1. skills
cp -R "$REPO_DIR/skills/." "$CLAUDE_DIR/skills/"
echo "[1/4] skills 已安装"

# 2. CLAUDE.md（与现有内容不同才备份）
if [ -f "$CLAUDE_DIR/CLAUDE.md" ] && ! cmp -s "$REPO_DIR/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md"; then
  cp "$CLAUDE_DIR/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md.bak.$TS"
  echo "[2/4] 原 CLAUDE.md 已备份为 CLAUDE.md.bak.$TS"
else
  echo "[2/4] CLAUDE.md 无变化"
fi
cp "$REPO_DIR/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md"

# 3. hooks
cp "$REPO_DIR/hooks/codegraph-gate.mjs" "$CLAUDE_DIR/hooks/"
echo "[3/4] hooks 已安装"

# 4. settings.json 非破坏性合并（需要 node）
if command -v node >/dev/null 2>&1; then
  CLAUDE_DIR="$CLAUDE_DIR" node "$REPO_DIR/scripts/merge-settings.mjs" "$REPO_DIR/settings.snippet.json"
  echo "[4/4] settings.json 已合并"
else
  echo "[4/4] 未找到 node，跳过 settings 合并，请按 README 手工登记 hook"
fi

echo "完成。重启 Claude Code 生效。"
