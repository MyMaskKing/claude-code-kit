#!/usr/bin/env node
/**
 * install.mjs — 跨工具一键安装（Claude Code / Codex / Gemini CLI）
 *
 * 安装内容：
 *   - code-change-protocol 技能 → 三个用户级 skills 目录
 *   - 通用教训库 lessons/ → 三个用户级目录下的 lessons/
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

// 指令文件托管区标记：标记块内由安装器管理（升级只替换块内），块外为用户自定义区、永不触碰
const MARK_START = '<!-- CODEKIT:START -->';
const MARK_END = '<!-- CODEKIT:END -->';
const MARK_RE = /<!-- CODEKIT:START -->[\s\S]*?<!-- CODEKIT:END -->/;
// 老用户无标记旧文件首次融合时，附在旧文全文前的一次性引导注释
const MIGRATE_HINT = '<!-- 上方 CODEKIT 标记块内由 claude-code-kit 安装器托管升级；以下为旧版文件全文，已整体迁入用户自定义区，请删除与托管块重复的段落、保留你自己的规则。 -->';

const managedBlock = (body) => `${MARK_START}\n${body.trimEnd()}\n${MARK_END}`;

/**
 * 融合渲染指令文件，返回 { content, changed, migrated }：
 * - 旧文件不存在：只写托管块
 * - 含托管标记：块内替换为最新内容，块外逐字符保留；无变化 changed=false
 * - 无标记（老用户首次升级）：最新托管块 + 迁移提示 + 旧文件全文（零丢失）
 */
function renderDoc(oldContent, body) {
  const block = managedBlock(body);
  if (oldContent === null) return { content: `${block}\n`, changed: true, migrated: false };
  if (MARK_RE.test(oldContent)) {
    const content = oldContent.replace(MARK_RE, block);
    return { content, changed: content !== oldContent, migrated: false };
  }
  const content = `${block}\n\n${MIGRATE_HINT}\n\n${oldContent.trimEnd()}\n`;
  return { content, changed: true, migrated: true };
}

// 每个目标根的分发清单文件名：记录本根已安装的套件文件，升级时据此清理已下架分发物
const MANIFEST_NAME = '.codekit-manifest.json';

/**
 * 递归列出源目录下全部文件，返回带 prefix 前缀、以 / 分隔的相对路径数组（排序稳定）。
 * 源目录缺失时直接抛错——预扫描发生在任何写入之前，不留半成品。
 */
function listSourceFiles(srcDir, prefix) {
  const out = [];
  const walk = (dir, rel) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const next = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) walk(path.join(dir, ent.name), next);
      else if (ent.isFile()) out.push(`${prefix}/${next}`);
    }
  };
  walk(srcDir, '');
  return out.sort();
}

// 预扫描三类源目录（skills/lessons 分发三家，hooks 仅 Claude 一家）
// skills/hooks 是套件本体，源缺失属仓库不完整，预扫描即抛错（先于任何写入）；
// lessons 是可选分发物（是否随仓库分发由用户自行决定），源缺失记 null，安装时警告跳过
const lessonsSrc = path.join(REPO_DIR, 'lessons');
const sourceFiles = {
  skills: listSourceFiles(path.join(REPO_DIR, 'skills'), 'skills'),
  lessons: fs.existsSync(lessonsSrc) ? listSourceFiles(lessonsSrc, 'lessons') : null,
  hooks: listSourceFiles(path.join(REPO_DIR, 'hooks'), 'hooks'),
};

/**
 * 把一类分发物（prefix: skills/lessons/hooks）清单化镜像到目标根：
 * 1. 旧清单记录过、本次不再分发的文件删除，并自底向上清理变空的目录（止于 prefix 根）；
 * 2. cpSync 递归覆盖；3. 写回新清单。
 * 无旧清单或清单损坏时跳过清理（首装/容错），安装照常并重建清单；
 * 清单外的用户自有文件永不删除。
 */
function deployGroup(root, prefix, relFiles) {
  const manifestPath = path.join(root, MANIFEST_NAME);
  let manifest = null;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
  catch { manifest = null; }

  const oldFiles = manifest?.files?.[prefix];
  if (Array.isArray(oldFiles)) {
    const freshSet = new Set(relFiles);
    const prefixRoot = path.join(root, prefix);
    for (const rel of oldFiles) {
      if (freshSet.has(rel)) continue;
      const segs = rel.split('/');
      if (segs[0] !== prefix || segs.some((s) => !s || s === '.' || s === '..')) continue;
      const abs = path.join(root, ...segs);
      try { fs.rmSync(abs); } catch { continue; }
      let dir = path.dirname(abs);
      while (dir !== prefixRoot) {
        try { fs.rmdirSync(dir); } catch { break; } // 目录非空即停止上溯
        dir = path.dirname(dir);
      }
    }
  }

  fs.mkdirSync(path.join(root, prefix), { recursive: true });
  fs.cpSync(path.join(REPO_DIR, prefix), path.join(root, prefix), { recursive: true });

  if (!manifest || manifest.version !== 1 || !manifest.files || typeof manifest.files !== 'object') {
    manifest = { version: 1, files: {} };
  }
  for (const k of ['skills', 'lessons', 'hooks']) {
    if (!Array.isArray(manifest.files[k])) manifest.files[k] = [];
  }
  manifest.files[prefix] = relFiles;
  manifest.installedAt = new Date().toISOString();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

console.log('安装目标：');
for (const t of docFiles) console.log(`  ${t.dir}${path.sep}${t.name}`);

// 1. skills 与 lessons（各三处，清单化镜像：覆盖新版并按旧清单清理下架文件，不做逐文件备份）
for (const root of [targets.claude, targets.agents, targets.gemini]) {
  deployGroup(root, 'skills', sourceFiles.skills);
  // lessons 源缺失：整组跳过（不清理、不改清单、不动已装旧文件），其余安装照常
  if (sourceFiles.lessons !== null) deployGroup(root, 'lessons', sourceFiles.lessons);
}
if (sourceFiles.lessons === null) {
  console.warn('[1/4] 警告：源目录 lessons/ 不存在，已跳过教训库分发（技能、指令文件、hook、settings 照常安装）');
} else {
  console.log('[1/4] 技能与教训库已清单化镜像安装到三个目录');
}

// 2. 指令文件（融合升级：托管块内更新、块外用户内容原样保留；有变化才备份写入）
let migrated = 0;
let skipped = 0;
for (const f of docFiles) {
  fs.mkdirSync(f.dir, { recursive: true });
  const dst = path.join(f.dir, f.name);
  const oldContent = fs.existsSync(dst) ? fs.readFileSync(dst, 'utf8') : null;
  const { content, changed, migrated: isMigrated } = renderDoc(oldContent, f.body);
  if (!changed) { skipped += 1; continue; }
  if (oldContent !== null) {
    fs.writeFileSync(path.join(f.dir, `${f.name}.bak.${ts}`), oldContent);
  }
  fs.writeFileSync(dst, content, 'utf8');
  if (isMigrated) migrated += 1;
}
console.log(`[2/4] 指令文件已融合安装（首次迁移 ${migrated} 份，无变化跳过 ${skipped} 份；变化的旧文件已备份）`);

// 3. Claude 专属 hook（仅 .claude 一家，同样清单化镜像）
deployGroup(targets.claude, 'hooks', sourceFiles.hooks);
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
