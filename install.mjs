#!/usr/bin/env node
/**
 * install.mjs — Node.js 一键安装（跨平台，无需 Git Bash）
 * 把 skill / CLAUDE.md / hook 装进 ~/.claude，并非破坏性合并 settings.json。
 * 用法：node install.mjs
 * 环境变量：CLAUDE_DIR 可覆盖目标目录（默认 ~/.claude）
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeSettings } from './scripts/merge-settings.mjs';

const REPO_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLAUDE_DIR = path.resolve(process.env.CLAUDE_DIR || path.join(os.homedir(), '.claude'));
const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

console.log(`安装目标: ${CLAUDE_DIR}`);
fs.mkdirSync(path.join(CLAUDE_DIR, 'skills'), { recursive: true });
fs.mkdirSync(path.join(CLAUDE_DIR, 'hooks'), { recursive: true });

// 1. skills（递归复制覆盖）
fs.cpSync(path.join(REPO_DIR, 'skills'), path.join(CLAUDE_DIR, 'skills'), { recursive: true });
console.log('[1/4] skills 已安装');

// 2. CLAUDE.md（内容不同先备份）
const srcClaude = path.join(REPO_DIR, 'CLAUDE.md');
const dstClaude = path.join(CLAUDE_DIR, 'CLAUDE.md');
if (fs.existsSync(dstClaude) && !fs.readFileSync(srcClaude).equals(fs.readFileSync(dstClaude))) {
  fs.copyFileSync(dstClaude, path.join(CLAUDE_DIR, `CLAUDE.md.bak.${ts}`));
  console.log(`[2/4] 原 CLAUDE.md 已备份为 CLAUDE.md.bak.${ts}`);
} else {
  console.log('[2/4] CLAUDE.md 无变化');
}
fs.copyFileSync(srcClaude, dstClaude);

// 3. hooks
fs.cpSync(path.join(REPO_DIR, 'hooks'), path.join(CLAUDE_DIR, 'hooks'), { recursive: true });
console.log('[3/4] hooks 已安装');

// 4. settings.json 非破坏性合并
try {
  const snippet = JSON.parse(fs.readFileSync(path.join(REPO_DIR, 'settings.snippet.json'), 'utf8'));
  mergeSettings(CLAUDE_DIR, snippet);
  console.log('[4/4] settings.json 已合并');
} catch (e) {
  console.error(`[4/4] settings 合并失败（其余文件已安装）：${e.message}`);
  process.exit(1);
}

console.log('完成。重启 Claude Code 生效。');
