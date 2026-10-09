#!/usr/bin/env node
/**
 * install.mjs — 跨工具一键安装（Claude Code / Codex / Gemini CLI）
 *
 * 安装内容：
 *   - code-change-protocol 技能 → 三个用户级 skills 目录
 *   - 跨工具核心指令 agent.md → CLAUDE.md / ~/.codex/AGENTS.md / ~/.gemini/GEMINI.md
 *   - Claude 专属：Superpowers 追加段、codegraph-gate hook、settings.json 非破坏性合并
 *
 * 用法：node install.mjs
 * 覆盖目标（测试用）：CODEKIT_HOME=<目录> 统一重定向全部路径
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeSettings } from './scripts/merge-settings.mjs';

const REPO_DIR = path.dirname(fileURLToPath(import.meta.url));
const HOME = os.homedir();
const KIT_HOME = process.env.CODEKIT_HOME ? path.resolve(process.env.CODEKIT_HOME) : null;
const joinHome = (...parts) => (KIT_HOME ? path.join(KIT_HOME, ...parts) : path.join(HOME, ...parts));

// 各工具目标路径（CODEX_HOME 为 Codex 官方变量；CLAUDE_DIR 向后兼容）
const targets = {
  claude: process.env.CLAUDE_DIR ? path.resolve(process.env.CLAUDE_DIR) : joinHome('.claude'),
  codex: process.env.CODEX_HOME && !KIT_HOME ? path.resolve(process.env.CODEX_HOME) : joinHome('.codex'),
  gemini: joinHome('.gemini'),
  agents: joinHome('.agents'),
};

const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const core = fs.readFileSync(path.join(REPO_DIR, 'agent.md'), 'utf8');
const claudeSupp = fs.readFileSync(path.join(REPO_DIR, 'supplements', 'claude.md'), 'utf8');

// 指令文件：{目标目录, 文件名, 正文}
const docFiles = [
  { dir: targets.claude, name: 'CLAUDE.md', body: `${core}\n${claudeSupp}\n` },
  { dir: targets.codex, name: 'AGENTS.md', body: core },
  { dir: targets.gemini, name: 'GEMINI.md', body: core },
];

// skills 目标：Claude 原生目录、跨工具通用 ~/.agents/skills、Gemini 目录
const skillDirs = [
  path.join(targets.claude, 'skills'),
  path.join(targets.agents, 'skills'),
  path.join(targets.gemini, 'skills'),
];

console.log('安装目标：');
for (const t of docFiles) console.log(`  ${t.dir}${path.sep}${t.name}`);

// 1. skills（三处，递归覆盖）
for (const d of skillDirs) {
  fs.mkdirSync(d, { recursive: true });
  fs.cpSync(path.join(REPO_DIR, 'skills'), d, { recursive: true });
}
console.log('[1/4] 技能已安装到三个 skills 目录');

// 2. 指令文件（内容不同先备份）
for (const f of docFiles) {
  fs.mkdirSync(f.dir, { recursive: true });
  const dst = path.join(f.dir, f.name);
  const buf = Buffer.from(f.body);
  if (fs.existsSync(dst) && !fs.readFileSync(dst).equals(buf)) {
    fs.writeFileSync(path.join(f.dir, `${f.name}.bak.${ts}`), fs.readFileSync(dst));
  }
  fs.writeFileSync(dst, buf);
}
console.log('[2/4] 三份指令文件已安装（旧文件已备份）');

// 3. Claude 专属 hook
fs.mkdirSync(path.join(targets.claude, 'hooks'), { recursive: true });
fs.cpSync(path.join(REPO_DIR, 'hooks'), path.join(targets.claude, 'hooks'), { recursive: true });
console.log('[3/4] CodeGraph hook 已安装');

// 4. Claude settings.json 非破坏性合并
try {
  const snippet = JSON.parse(fs.readFileSync(path.join(REPO_DIR, 'settings.snippet.json'), 'utf8'));
  mergeSettings(targets.claude, snippet);
  console.log('[4/4] settings.json 已合并');
} catch (e) {
  console.error(`[4/4] settings 合并失败（其余内容已安装）：${e.message}`);
  process.exit(1);
}

console.log('完成。重启各 AI 工具后生效。');
