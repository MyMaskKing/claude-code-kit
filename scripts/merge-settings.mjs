#!/usr/bin/env node
/**
 * merge-settings.mjs — 把 snippet 非破坏性合并进 ~/.claude/settings.json
 * 规则：
 *   - 已存在的顶层键（env/model/...）一律不动
 *   - permissions.deny / allow 做并集去重
 *   - hooks 按 event + matcher 归组，按 command 去重追加
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

  // hooks：按 event → matcher → command 三级去重
  if (snippet.hooks) {
    settings.hooks ||= {};
    for (const [event, entries] of Object.entries(snippet.hooks)) {
      settings.hooks[event] ||= [];
      for (const entry of entries) {
        let slot = settings.hooks[event].find((e) => e.matcher === entry.matcher);
        if (!slot) {
          slot = { matcher: entry.matcher, hooks: [] };
          settings.hooks[event].push(slot);
        }
        for (const h of entry.hooks) {
          if (!slot.hooks.some((x) => normCmd(x.command) === normCmd(h.command))) slot.hooks.push(h);
        }
      }
    }
  }

  if (fs.existsSync(settingsPath)) {
    fs.writeFileSync(path.join(claudeDir, `settings.json.bak.${timestamp()}`), fs.readFileSync(settingsPath));
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
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
