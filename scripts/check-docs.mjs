import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(process.argv[2] ?? '.');
const errors = [];
const warnings = [];
const files = [];
const source = 'docs/requirements/sources/agent-delivery-coordinator-v1.2.md';

function walk(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
  }
}

walk(resolve(root, 'docs'));
for (const name of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) {
  if (existsSync(resolve(root, name))) files.push(resolve(root, name));
}
if (existsSync(resolve(root, 'README.md'))) files.push(resolve(root, 'README.md'));

for (const file of files.sort()) {
  const name = relative(root, file).split('\\').join('/');
  if (name === source) continue; // 不可变输入；下方单独核对哈希，不作为维护文档读取。
  const text = readFileSync(file, 'utf8');
  const standard = /^docs\/specs\/(spike|official|archived|superseded)\/[^/]+\/(spec|design|tasks|decisions)\.md$/.test(name);
  const alias = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'].includes(name);
  if (!standard && !alias) {
    const header = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!header) errors.push(`${name}: 缺少 discovery metadata`);
    else {
      const lines = header[1].split(/\r?\n/);
      if (!/^summary: [^\r\n]+\r?\nread_when:\r?\n(?:  - [^\r\n]+(?:\r?\n|$))+$/.test(header[1])) {
        errors.push(`${name}: metadata 顺序或列表归属错误，需 summary、read_when 及其缩进条目`);
      }
      const summary = lines.filter(line => line.startsWith('summary: '));
      const triggers = lines.filter(line => /^  - \S/.test(line));
      if (summary.length !== 1 || !summary[0].slice(9).trim() || summary[0].slice(9).length > 160) {
        errors.push(`${name}: summary 必须是非空单行且不超过 160 字符`);
      }
      if (lines.filter(line => line === 'read_when:').length !== 1 || triggers.length < 1 || triggers.length > 5 || triggers.some(line => line.slice(4).length > 120)) {
        errors.push(`${name}: read_when 必须有 1～5 个不超过 120 字符的触发条件`);
      }
      if (lines.some(line => !/^summary: |^read_when:$|^  - \S/.test(line))) {
        errors.push(`${name}: metadata 仅允许 summary 和 read_when 列表`);
      }
    }
  }
  const count = text.trimEnd().split(/\r?\n/).length;
  const budget = name.startsWith('docs/.agent/') ? 300 : 150;
  if (count > budget) warnings.push(`${name}: ${count} 行，超过 ${budget} 行软预算，请拆分或说明例外`);
  const prose = text.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '');
  for (const match of prose.matchAll(/\[[^\]\n]*\]\(([^\s)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '');
    if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('#')) continue;
    let path;
    try { path = decodeURIComponent(target.split('#')[0].split('?')[0]); }
    catch { errors.push(`${name}: 非法链接编码 ${target}`); continue; }
    if (!path) continue;
    if (isAbsolute(path)) errors.push(`${name}: 使用项目相对链接 ${target}`);
    else if (!existsSync(resolve(dirname(file), path))) errors.push(`${name}: 链接目标不存在 ${target}`);
  }
}

const input = resolve(root, source);
const index = resolve(root, 'docs/requirements/README.md');
if (existsSync(input)) {
  const sha = createHash('sha256').update(readFileSync(input)).digest('hex');
  if (!existsSync(index) || !readFileSync(index, 'utf8').includes(`\`${sha}\``)) {
    errors.push('需求原文与维护索引中的 SHA256 不一致');
  }
}

for (const warning of warnings) console.warn(`WARN ${warning}`);
for (const error of errors) console.error(`ERROR ${error}`);
console.log(`文档检查：${files.length} 个 Markdown，${errors.length} 个错误，${warnings.length} 个软预算提示。`);
process.exitCode = errors.length ? 1 : 0;
