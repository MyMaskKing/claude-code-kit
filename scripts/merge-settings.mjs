#!/usr/bin/env node
/**
 * merge-settings.mjs — 把 snippet 非破坏性合并进 ~/.claude/settings.json
 * 规则：
 *   - 已存在的顶层键（env/model/...）一律不动
 *   - permissions.deny / allow 做并集去重
 *   - hooks 按 event 归组、跨 matcher 按归一化 command 去重追加
 *
 * 用法：
 *   CLI：node scripts/merge-settings.mjs <snippet.json>
 *   模块：import { mergeSettings } from './scripts/merge-settings.mjs'
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Git Bash 风格路径（/c/Users/...）转 Windows 路径（C:/Users/...）
function normalize(p) {
  const m = /^\/([a-zA-Z])\//.exec(p);
  return m ? p.replace(/^\/([a-zA-Z])\//, '$1:/') : p;
}

// 归一化 hook command：展开 $HOME/$USERPROFILE、统一盘符与斜杠，
// 使「"$USERPROFILE/.claude/hooks/x.mjs"」与「"C:/Users/.../x.mjs"」判为同一条
const homeNorm = os.homedir().replace(/\\/g, '/');
function normCmd(c) {
  return c
    .replace(/\$\{?(?:USERPROFILE|HOME)\}?/g, homeNorm)
    .replace(/^\/([a-zA-Z])\//, '$1:/')
    .replace(/\\/g, '/')
    .replace(/"/g, '')
    .trim();
}

function timestamp() {
  return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

/**
 * 把 snippet 合并进 claudeDir/settings.json，返回最终 settings 对象。
 * @param {string} claudeDir 目标 .claude 目录
 * @param {object} snippet 已解析的 snippet 对象（command 中可含 {{CLAUDE_DIR}}）
 */
export function mergeSettings(claudeDir, snippet) {
  claudeDir = path.resolve(claudeDir);
  const settingsPath = path.join(claudeDir, 'settings.json');
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); }
    catch (e) {
      throw new Error(`现有 settings.json 解析失败，已中止（未改动）：${e.message}`);
    }
  }

  const dirToken = claudeDir.replace(/\\/g, '/');
  const fill = (v) => (typeof v === 'string' ? v.replaceAll('{{CLAUDE_DIR}}', dirToken) : v);
  snippet = JSON.parse(JSON.stringify(snippet), (_k, v) => fill(v));

  const uniqPush = (arr, vals) => {
    for (const v of vals) if (!arr.includes(v)) arr.push(v);
  };

  // permissions：只合并不存在的条目
  if (snippet.permissions) {
    settings.permissions ||= {};
    for (const k of ['deny', 'allow']) {
      if (Array.isArray(snippet.permissions[k])) {
        settings.permissions[k] ||= [];
        uniqPush(settings.permissions[k], snippet.permissions[k]);
      }
    }
  }

  // hooks：按 event 归组，同 event 下跨所有 matcher 桶按归一化 command 去重
  // （重叠 matcher 如 Grep 与 Grep|Glob 不再重复注册同一 hook；既有桶的 matcher 不改写）
  if (snippet.hooks) {
    settings.hooks ||= {};
    for (const [event, entries] of Object.entries(snippet.hooks)) {
      settings.hooks[event] ||= [];
      for (const entry of entries) {
        for (const h of entry.hooks) {
          const dup = settings.hooks[event].some((e) =>
            e.hooks.some((x) => normCmd(x.command) === normCmd(h.command)));
          if (dup) continue;
          let slot = settings.hooks[event].find((e) => e.matcher === entry.matcher);
          if (!slot) {
            slot = { matcher: entry.matcher, hooks: [] };
            settings.hooks[event].push(slot);
          }
          slot.hooks.push(h);
        }
      }
    }
  }

  const out = JSON.stringify(settings, null, 2) + '\n';
  if (fs.existsSync(settingsPath)) {
    const old = fs.readFileSync(settingsPath, 'utf8');
    if (old === out) return settings; // 内容无变化：不备份、不重写
    fs.writeFileSync(path.join(claudeDir, `settings.json.bak.${timestamp()}`), old);
  }
  fs.writeFileSync(settingsPath, out);
  return settings;
}

// CLI 入口（仅直接运行时执行）
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const claudeDir = normalize(process.env.CLAUDE_DIR || path.join(os.homedir(), '.claude'));
  const snippetPath = process.argv[2];
  if (!snippetPath || !fs.existsSync(snippetPath)) {
    console.error('缺少 snippet 文件参数');
    process.exit(1);
  }
  try {
    const snippet = JSON.parse(fs.readFileSync(snippetPath, 'utf8'));
    mergeSettings(claudeDir, snippet);
    console.log('合并完成:', path.join(claudeDir, 'settings.json'));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
