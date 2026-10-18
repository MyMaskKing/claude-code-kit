#!/usr/bin/env node
/**
 * codegraph-gate.mjs — 代码定位漏斗的硬约束 hook
 *
 * 用法（由 settings.json 的 hooks 调用，payload 经 stdin 传入）:
 *   node codegraph-gate.mjs pre    PreToolUse：Grep 执行前判定，不合规 exit 2 阻止
 *   node codegraph-gate.mjs post   PostToolUse：记录 CodeGraph / Serena 使用次数
 *
 * 状态文件: ~/.claude/.codegraph-gate-state.json
 *   按 session_id + 索引根 隔离计数: { cg: CodeGraph 次数 }
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const STATE_FILE = path.join(os.homedir(), '.claude', '.codegraph-gate-state.json');
const WEEK_MS = 7 * 86400000;

function readPayload() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) || {}; }
  catch { return {}; }
}
function writeState(state) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8'); }
  catch { /* 状态写失败不阻断正常工作 */ }
}
/**
 * 从 cwd 向上逐级找 CodeGraph 索引根，找到返回其根目录，找不到返回 null。
 * 判据是 .codegraph/ 目录内存在 codegraph.db——
 * 注意 ~/.codegraph 可能是其它工具（如 Claude Code 自身遥测）的同名目录，不能只看目录名。
 */
function findIndexRoot(cwd) {
  let dir = path.resolve(cwd || process.cwd());
  for (let i = 0; i < 25; i++) {
    const cgDir = path.join(dir, '.codegraph');
    try {
      if (fs.statSync(cgDir).isDirectory() && fs.statSync(path.join(cgDir, 'codegraph.db')).isFile()) return dir;
    } catch { /* 继续向上 */ }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}
/** 清理 7 天未更新的旧会话计数，防止状态文件膨胀 */
function purge(state) {
  const now = Date.now();
  for (const k of Object.keys(state)) {
    if (!state[k] || now - (state[k].ts || 0) > WEEK_MS) delete state[k];
  }
}

// 逃生舱：CodeGraph MCP 不可用（未配置/被禁用）时无法靠 explore 计数解锁，
// 设置 CODEKIT_GATE=off（或 0/false）临时放行；恢复后立即移除，不作为常规降级路径
if (['off', '0', 'false'].includes((process.env.CODEKIT_GATE || '').trim().toLowerCase())) process.exit(0);

const mode = process.argv[2] || 'pre';
const payload = readPayload();
if (!payload || !payload.session_id) process.exit(0);

// 仅在被索引的项目内生效；未索引项目（含非代码目录）一律放行
const root = findIndexRoot(payload.cwd);
if (!root) process.exit(0);

const key = payload.session_id + '::' + root;

if (mode === 'post') {
  // CodeGraph / Serena 各记一次；其它工具的 post 触发不计数
  const state = readState();
  purge(state);
  const st = state[key] || { cg: 0 };
  if (payload.tool_name === 'mcp__codegraph__codegraph_explore') st.cg += 1;
  else process.exit(0);
  st.ts = Date.now();
  state[key] = st;
  writeState(state);
  process.exit(0);
}

// mode === 'pre'：漏斗判定
const state = readState();
purge(state);
writeState(state);
const st = state[key] || { cg: 0 };
// CodeGraph 已查两次（业务词 + 技术词）→ 允许降级 Grep / Glob
if (st.cg >= 2) process.exit(0);

process.stderr.write(
  '⛔ 代码定位漏斗：本会话在该已索引项目中 CodeGraph 仅使用 ' + st.cg + ' 次。\n' +
  '请先调用 mcp__codegraph__codegraph_explore：第 1 次用业务自然语言；未命中则第 2 次改用技术词' +
  '（DOM id、class 名、函数名片段）。\n' +
  '两次 explore 后才可使用 Grep / Glob 精准检索。若确认 CodeGraph 对该区域索引缺失，连续两次 explore 后即自动放行。\n' +
  'CodeGraph MCP 不可用时的临时逃生舱：在 settings.json 的 env 或系统环境变量设置 CODEKIT_GATE=off 放行，恢复后请移除。\n'
);
process.exit(2);
