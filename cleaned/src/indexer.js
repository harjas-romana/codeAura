// src/indexer.js — CodeAura v3.1.0
// Core Indexing Engine
//
// Critical fixes vs all previous versions:
//  ✓ REMOVED @langchain + @huggingface/transformers → onnxruntime error gone
//  ✓ ChromaDB embeddingFunction: null → DefaultEmbeddingFunction crash gone
//  ✓ Pure HTTP HuggingFace Inference API (no native binaries needed)
//  ✓ Local 384-d fallback when HF key absent (zero deps)
//  ✓ Parallel indexing via p-limit (graceful fallback to sequential)
//  ✓ Incremental MD5 hash diffing — only changed files re-indexed
//  ✓ Parent-child chunking: small child chunks matched, large parent returned
//  ✓ Batch embeddings: 24 texts per API call
//  ✓ Exponential back-off + jitter on 429/503
//  ✓ 3-tier ChromaDB: remote → localhost → in-memory

import { ChromaClient }  from 'chromadb';
import { config }        from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve, extname, basename, relative } from 'path';
import { readFile, writeFile, stat, readdir } from 'fs/promises';
import { createHash }    from 'crypto';
import { Groq }          from 'groq-sdk';
import chalk             from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

// ─── Optional packages ────────────────────────────────────────────────────────
let pLimit, fg;
try { pLimit = (await import('p-limit')).default; } catch (_) {}
try { fg     = (await import('fast-glob')).default; } catch (_) {}

// ═══════════════════════════════════════════════════════════════════════════════
//  CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
const CFG = {
  parentChunkSize: parseInt(process.env.PARENT_CHUNK_SIZE) || 1200,
  childChunkSize:  parseInt(process.env.CHILD_CHUNK_SIZE)  || 350,
  chunkOverlap:    parseInt(process.env.CHUNK_OVERLAP)     || 60,
  minChunkLen:     50,
  hfModel:         process.env.EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
  hfBatchSize:     parseInt(process.env.HF_BATCH_SIZE)     || 24,
  hfMaxRetries:    parseInt(process.env.HF_MAX_RETRIES)    || 4,
  hfRetryBaseMs:   parseInt(process.env.HF_RETRY_BASE_MS)  || 1500,
  hfTimeoutMs:     parseInt(process.env.HF_TIMEOUT_MS)     || 12_000,
  embDim:          384,
  fileConcurrency: parseInt(process.env.FILE_CONCURRENCY)  || 8,
  maxFiles:        parseInt(process.env.MAX_FILES)          || 5_000,
  maxFileSizeMb:   parseFloat(process.env.MAX_FILE_SIZE_MB) || 1.5,
  chromaUrl:       process.env.CHROMA_URL || 'http://localhost:8000',
  groqModel:       process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  describeRatio:   0.25,
  hashFile:        '.codeaura-hashes.json',
};

export const SUPPORTED_EXT = new Set([
  '.js','.jsx','.ts','.tsx','.mjs','.cjs',
  '.py','.java','.cpp','.c','.h','.hpp',
  '.go','.rb','.php','.rs','.swift','.kt','.scala',
  '.html','.css','.scss','.less','.vue','.svelte',
  '.md','.mdx','.txt','.json','.yml','.yaml','.xml',
  '.sql','.graphql','.gql','.proto','.sh','.bash','.toml','.env',
]);

export const SKIP_DIRS = new Set([
  'node_modules','.git','dist','build','coverage','.next','.nuxt',
  'vendor','__pycache__','.pytest_cache','target','bin','obj',
  '.gradle','.idea','.vscode','logs','temp','tmp',
  '.cache','.parcel-cache','storybook-static','out',
]);

// ═══════════════════════════════════════════════════════════════════════════════
//  LRU CACHE
// ═══════════════════════════════════════════════════════════════════════════════
class LRUCache {
  constructor(max = 1000) { this.max = max; this.store = new Map(); }
  get(k) {
    if (!this.store.has(k)) return undefined;
    const v = this.store.get(k); this.store.delete(k); this.store.set(k, v);
    return v;
  }
  set(k, v) {
    if (this.store.has(k)) this.store.delete(k);
    else if (this.store.size >= this.max) this.store.delete(this.store.keys().next().value);
    this.store.set(k, v);
  }
  has(k)     { return this.store.has(k); }
  get size() { return this.store.size; }
  evictHalf() {
    const keys = [...this.store.keys()];
    keys.slice(0, Math.floor(keys.length / 2)).forEach(k => this.store.delete(k));
  }
}

const embCache  = new LRUCache(2000);
const descCache = new LRUCache(1000);

// ═══════════════════════════════════════════════════════════════════════════════
//  GROQ CLIENT
// ═══════════════════════════════════════════════════════════════════════════════
let groq = null;
if (process.env.GROQ_API_KEY) {
  try { groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 20_000 }); }
  catch (e) { console.warn(chalk.dim(`  ! Groq init: ${e.message}`)); }
} else {
  console.warn(chalk.dim('  ! GROQ_API_KEY not set — AI descriptions disabled'));
}

// ═══════════════════════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════
const md5    = t  => createHash('md5').update(t).digest('hex');
const sha256 = t  => createHash('sha256').update(t).digest('hex');
const sleep  = ms => new Promise(r => setTimeout(r, ms));
const jitter = ms => ms + Math.random() * ms * 0.3;

function countLines(t) {
  let n = 1;
  for (let i = 0; i < t.length; i++) if (t[i] === '\n') n++;
  return n;
}

export function detectLang(fp) {
  const m = {
    '.js':'javascript','.jsx':'javascript','.mjs':'javascript','.cjs':'javascript',
    '.ts':'typescript','.tsx':'typescript',
    '.py':'python','.java':'java',
    '.cpp':'cpp','.c':'c','.h':'c','.hpp':'cpp',
    '.go':'go','.rb':'ruby','.php':'php',
    '.rs':'rust','.swift':'swift','.kt':'kotlin','.scala':'scala',
    '.html':'html','.css':'css','.scss':'scss',
    '.vue':'vue','.svelte':'svelte',
    '.md':'markdown','.mdx':'markdown',
    '.sql':'sql','.graphql':'graphql','.gql':'graphql',
    '.sh':'shell','.bash':'shell',
    '.yaml':'yaml','.yml':'yaml',
    '.json':'json','.toml':'toml','.proto':'protobuf',
  };
  return m[extname(fp).toLowerCase()] || 'text';
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LOCAL FALLBACK EMBEDDING  (384-d, zero native deps, L2-normalised)
//  No @huggingface/transformers, no onnxruntime, no native binaries.
//  Dims 0-255: word-freq hashing
//  Dims 256-319: programming keyword density
//  Dims 320-359: structural signals (depth, async, imports, etc.)
//  Dims 360-383: SHA-256 uniqueness fingerprint
// ═══════════════════════════════════════════════════════════════════════════════
const PROG_KW = [
  'function','class','const','let','var','import','export','return','async','await',
  'if','else','for','while','try','catch','interface','type','enum','hook',
  'component','route','middleware','controller','service','model','query','api',
  'error','token','auth','props','state','effect','schema','database',
  'get','post','put','delete','patch','request','response','handler','event',
  'constructor','extends','implements','override','static','abstract','readonly',
  'promise','callback','socket','cache','config','util','helper','test','spec',
];

export function generateFallbackEmbedding(text) {
  const emb = new Float32Array(CFG.embDim).fill(0);

  const tokens = text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[^\w\s]/g, ' ')
    .toLowerCase().split(/\s+/)
    .filter(w => w.length > 1 && !/^\d+$/.test(w));

  // Word frequency → dims 0-255
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  for (const [w, c] of Object.entries(freq)) {
    emb[parseInt(md5(w).slice(0, 8), 16) % 256] += c;
  }

  // Keyword density → dims 256-319
  for (const kw of PROG_KW) {
    const hits = (text.match(new RegExp(`\\b${kw}\\b`, 'gi')) || []).length;
    if (hits) emb[256 + parseInt(md5(kw).slice(0, 8), 16) % 64] += hits;
  }

  // Structural signals → dims 320-359
  emb[320] = Math.tanh(text.split('\n').length        / 80);
  emb[321] = Math.tanh(text.length                    / 2000);
  emb[322] = Math.tanh(tokens.length                  / 200);
  emb[323] = Math.tanh((text.match(/\{/g)              || []).length / 15);
  emb[324] = Math.tanh((text.match(/=>/g)              || []).length / 10);
  emb[325] = Math.tanh((text.match(/async\b/gi)        || []).length / 8);
  emb[326] = Math.tanh((text.match(/\bimport\b/gi)     || []).length / 10);
  emb[327] = Math.tanh((text.match(/\/\/|#\s|\/\*/g)   || []).length / 15);
  emb[328] = Math.tanh((text.match(/\btry\b|\bcatch\b/gi) || []).length / 6);
  emb[329] = Math.tanh((text.match(/\bclass\b/gi)      || []).length / 5);
  emb[330] = Math.tanh((text.match(/\binterface\b/gi)  || []).length / 5);
  emb[331] = Math.tanh((text.match(/\bpromise\b/gi)    || []).length / 6);
  emb[332] = Math.tanh((text.match(/\breturn\b/gi)     || []).length / 20);
  emb[333] = Math.tanh((text.match(/\/\/.+/g)          || []).length / 10);  // inline comments

  // SHA-256 uniqueness fingerprint → dims 360-383
  const h = sha256(text);
  for (let i = 360; i < 384; i++) {
    emb[i] = (parseInt(h.slice((i - 360) * 2, (i - 360) * 2 + 2), 16) / 255) * 0.04;
  }

  // L2 normalise
  let mag = 0;
  for (const v of emb) mag += v * v;
  mag = Math.sqrt(mag);
  if (mag > 0) for (let i = 0; i < emb.length; i++) emb[i] /= mag;

  return Array.from(emb);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HUGGINGFACE INFERENCE API — no native deps, pure HTTP, batch + back-off
// ═══════════════════════════════════════════════════════════════════════════════
async function hfBatchEmbed(texts) {
  if (!process.env.HUGGINGFACE_API_KEY) return null;

  const truncated = texts.map(t => t.slice(0, 512));
  let attempt = 0;

  while (attempt < CFG.hfMaxRetries) {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), CFG.hfTimeoutMs);

    try {
      const resp = await fetch(
        `https://api-inference.huggingface.co/models/${CFG.hfModel}`,
        {
          method:  'POST',
          headers: {
            Authorization:  `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body:   JSON.stringify({ inputs: truncated, options: { wait_for_model: true } }),
          signal: ctrl.signal,
        }
      );
      clearTimeout(tid);

      if (resp.status === 200) {
        const raw  = await resp.json();
        const vecs = Array.isArray(raw[0]) ? raw : raw.map(r => r.embedding ?? r);
        if (Array.isArray(vecs) && Array.isArray(vecs[0])) return vecs;
      }

      if (resp.status === 503 || resp.status === 429) {
        attempt++;
        await sleep(jitter(CFG.hfRetryBaseMs * Math.pow(2, attempt - 1)));
        continue;
      }
      if (resp.status === 401) throw new Error('Invalid HUGGINGFACE_API_KEY');
      if (resp.status === 404) throw new Error(`Model not found: ${CFG.hfModel}`);
      return null;  // other error → fall back

    } catch (err) {
      clearTimeout(tid);
      attempt++;
      if (attempt >= CFG.hfMaxRetries) return null;
      await sleep(jitter(CFG.hfRetryBaseMs * Math.pow(2, attempt)));
    }
  }
  return null;
}

export async function embedBatch(texts) {
  const results  = new Array(texts.length).fill(null);
  const uncached = [];

  texts.forEach((t, i) => {
    const k = md5(t);
    const v = embCache.get(k);
    if (v) results[i] = v;
    else   uncached.push({ i, t, k });
  });

  if (!uncached.length) return results;

  // Try HuggingFace in sub-batches; fall back to local on failure
  let hfVecs = null;
  for (let s = 0; s < uncached.length; s += CFG.hfBatchSize) {
    const slice   = uncached.slice(s, s + CFG.hfBatchSize).map(u => u.t);
    const hfSlice = await hfBatchEmbed(slice);
    if (!hfSlice && !hfVecs) break;   // HF unavailable → use local for all
    if (hfSlice) { if (!hfVecs) hfVecs = []; hfVecs.push(...hfSlice); }
  }

  uncached.forEach(({ i, t, k }, j) => {
    const vec = hfVecs?.[j] ?? generateFallbackEmbedding(t);
    embCache.set(k, vec);
    results[i] = vec;
  });

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PARENT-CHILD CHUNKER  (language-aware natural break points)
// ═══════════════════════════════════════════════════════════════════════════════
function getBreaks(lang) {
  const common = ['\n\n\n', '\n\n', ';\n', '}\n'];
  const extra  = {
    javascript: ['\nfunction ','\nconst ','\nclass ','\nexport ','\nimport '],
    typescript: ['\nfunction ','\nconst ','\ninterface ','\ntype ','\nexport ','\nimport '],
    python:     ['\ndef ','\nclass ','\nif __name__','\nimport ','\nfrom '],
    java:       ['\npublic ','\nprivate ','\nprotected ','\nclass ','\ninterface '],
    go:         ['\nfunc ','\ntype ','\nvar ','\nconst '],
    rust:       ['\nfn ','\nimpl ','\nstruct ','\nenum ','\ntrait '],
    ruby:       ['\ndef ','\nclass ','\nmodule '],
    php:        ['\nfunction ','\nclass '],
    kotlin:     ['\nfun ','\nclass ','\nobject ','\ninterface '],
    scala:      ['\ndef ','\nclass ','\nobject ','\ntrait '],
  };
  return [...(extra[lang] || []), ...common];
}

function naturalBreak(text, target, lang) {
  for (const bp of getBreaks(lang)) {
    const pos = text.lastIndexOf(bp, target);
    if (pos > target * 0.5) return pos + bp.length;
  }
  const nl = text.lastIndexOf('\n', target); if (nl > target * 0.4) return nl + 1;
  const sp = text.lastIndexOf(' ',  target); if (sp > target * 0.4) return sp + 1;
  return target;
}

export function buildChunks(filePath, content, lang) {
  const parents  = [];
  const children = [];

  if (content.length <= CFG.parentChunkSize) {
    const pid = `${filePath}::p0`;
    const el  = countLines(content);
    parents.push({ id: pid, filePath, lang, content: content.trim(), startLine: 1, endLine: el });
    children.push({ id: `${pid}::c0`, parentId: pid, filePath, lang,
                    content: content.trim(), startLine: 1, endLine: el });
    return { parents, children };
  }

  let pos = 0, pi = 0;
  while (pos < content.length) {
    const raw     = content.slice(pos, pos + CFG.parentChunkSize);
    const breakAt = raw.length < CFG.parentChunkSize ? raw.length : naturalBreak(raw, CFG.parentChunkSize, lang);
    const pText   = raw.slice(0, breakAt).trim();

    if (pText.length >= CFG.minChunkLen) {
      const startLine = countLines(content.slice(0, pos)) + 1;
      const endLine   = startLine + countLines(pText) - 1;
      const pid       = `${filePath}::p${pi++}`;
      parents.push({ id: pid, filePath, lang, content: pText, startLine, endLine });

      let cpos = 0, ci = 0;
      while (cpos < pText.length) {
        const cRaw   = pText.slice(cpos, cpos + CFG.childChunkSize);
        const cBreak = cRaw.length < CFG.childChunkSize ? cRaw.length : naturalBreak(cRaw, CFG.childChunkSize, lang);
        const cText  = cRaw.slice(0, cBreak).trim();
        if (cText.length >= CFG.minChunkLen) {
          const cStart = startLine + countLines(pText.slice(0, cpos)) - 1;
          children.push({
            id: `${pid}::c${ci++}`, parentId: pid, filePath, lang, content: cText,
            startLine: cStart, endLine: cStart + countLines(cText) - 1,
          });
        }
        cpos += Math.max(cBreak - CFG.chunkOverlap, 1);
        if (cpos >= pText.length) break;
      }
    }
    pos += Math.max(breakAt - CFG.chunkOverlap, 1);
    if (pos >= content.length) break;
  }
  return { parents, children };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CODE STRUCTURE EXTRACTOR
// ═══════════════════════════════════════════════════════════════════════════════
export function extractStructure(content, lang) {
  const out = { functions: [], classes: [], imports: [], exports: [], routes: [], hooks: [] };
  const P = {
    javascript: {
      functions: /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*:\s*(?:async\s*)?function)/g,
      classes:   /class\s+(\w+)/g,
      imports:   /import\s+.*?from\s+['"]([^'"]+)['"]/g,
      exports:   /export\s+(?:default\s+)?(?:function\s+(\w+)|class\s+(\w+)|const\s+(\w+))/g,
      routes:    /(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g,
      hooks:     /use[A-Z]\w+\s*\(/g,
    },
    typescript: {
      functions: /(?:function\s+(\w+)|const\s+(\w+)\s*=.*?(?:=>|\()|(\w+)\s*\(.*?\)\s*:)/g,
      classes:   /class\s+(\w+)/g,
      imports:   /import\s+.*?from\s+['"]([^'"]+)['"]/g,
      exports:   /export\s+(?:default\s+)?(?:function\s+(\w+)|class\s+(\w+)|const\s+(\w+)|interface\s+(\w+)|type\s+(\w+))/g,
      routes:    /(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g,
      hooks:     /use[A-Z]\w+\s*\(/g,
    },
    python: { functions: /def\s+(\w+)/g, classes: /class\s+(\w+)/g, imports: /(?:from\s+(\S+)\s+)?import\s+([^#\n]+)/g },
    go:     { functions: /func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/g, classes: /type\s+(\w+)\s+struct/g },
    rust:   { functions: /fn\s+(\w+)\s*[<(]/g, classes: /(?:struct|enum|trait|impl)\s+(\w+)/g },
  };
  const p = P[lang] || P.javascript;
  for (const [key, re] of Object.entries(p)) {
    if (!out[key]) continue;
    let m; const cl = new RegExp(re.source, re.flags);
    while ((m = cl.exec(content)) !== null) {
      const name = m[1] || m[2] || m[3] || m[4] || m[5];
      if (name && !out[key].includes(name) && out[key].length < 10)
        out[key].push(key === 'routes' ? `${m[1]} ${m[2]}` : name);
    }
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LLM DESCRIPTION  (Groq, cached, selective)
// ═══════════════════════════════════════════════════════════════════════════════
export async function generateDescription(code, filePath, lang) {
  const k = md5(code + filePath);
  const c = descCache.get(k); if (c) return c;
  const fallback = `${lang} · ${basename(filePath)}`;
  if (!groq) return fallback;
  try {
    const r = await groq.chat.completions.create({
      model: CFG.groqModel, max_tokens: 120, temperature: 0.1,
      messages: [
        { role: 'system', content: `Expert ${lang} engineer. 1-2 sentences on what this code does. Key purpose and concepts only. No syntax details.` },
        { role: 'user',   content: `File: ${filePath}\n\`\`\`${lang}\n${code.slice(0, 1500)}\n\`\`\`` },
      ],
    });
    const d = r.choices[0]?.message?.content?.trim() || fallback;
    descCache.set(k, d);
    return d;
  } catch (_) { return fallback; }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FILE DISCOVERY  (fast-glob primary, recursive walk fallback)
// ═══════════════════════════════════════════════════════════════════════════════
export async function getAllFiles(dir, opts = {}) {
  const { maxFiles = CFG.maxFiles } = opts;

  if (fg) {
    const patterns = [...SUPPORTED_EXT].map(e => `**/*${e}`);
    const ignore   = [...SKIP_DIRS].map(d => `**/${d}/**`);
    const files    = await fg(patterns, { cwd: dir, absolute: true, ignore, dot: false });
    return files.slice(0, maxFiles);
  }

  const results = [];
  async function walk(current) {
    if (results.length >= maxFiles) return;
    let entries;
    try { entries = await readdir(current, { withFileTypes: true }); } catch (_) { return; }
    for (const e of entries) {
      if (results.length >= maxFiles) break;
      if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
      const full = join(current, e.name);
      if (e.isDirectory())                                         await walk(full);
      else if (SUPPORTED_EXT.has(extname(e.name).toLowerCase()))  results.push(full);
    }
  }
  await walk(dir);
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HASH PERSISTENCE  (incremental diffing)
// ═══════════════════════════════════════════════════════════════════════════════
async function loadHashes(projectDir) {
  try { return JSON.parse(await readFile(join(projectDir, CFG.hashFile), 'utf-8')); }
  catch (_) { return {}; }
}
async function saveHashes(projectDir, hashes) {
  try { await writeFile(join(projectDir, CFG.hashFile), JSON.stringify(hashes)); } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SINGLE FILE PROCESSOR
// ═══════════════════════════════════════════════════════════════════════════════
async function processFile(filePath, projectDir, collection) {
  let content;
  try {
    const s = await stat(filePath);
    if (s.size > CFG.maxFileSizeMb * 1024 * 1024) return { chunks: 0, skipped: true };
    content = await readFile(filePath, 'utf-8');
    if (content.includes('\0')) return { chunks: 0, skipped: true };  // binary
  } catch (_) { return { chunks: 0, skipped: true }; }

  const relPath   = relative(projectDir, filePath);
  const lang      = detectLang(filePath);
  const structure = extractStructure(content, lang);
  const { parents, children } = buildChunks(relPath, content, lang);
  if (!children.length) return { chunks: 0, skipped: true };

  const embeddings = await embedBatch(children.map(c => c.content));

  // Selective LLM descriptions — describe first chunk + every Nth
  const interval = Math.max(1, Math.round(1 / CFG.describeRatio));
  const descSet  = new Set([0]);
  for (let i = 0; i < children.length; i++) if (i % interval === 0) descSet.add(i);

  const batch = { ids: [], embeddings: [], metadatas: [], documents: [] };

  for (let i = 0; i < children.length; i++) {
    const child  = children[i];
    const parent = parents.find(p => p.id === child.parentId);
    const desc   = descSet.has(i)
      ? await generateDescription(child.content, relPath, lang)
      : `${lang} · ${basename(relPath)} lines ${child.startLine}–${child.endLine}`;

    batch.ids.push(child.id);
    batch.embeddings.push(embeddings[i]);
    batch.documents.push(child.content);
    batch.metadatas.push({
      filePath:      relPath,
      language:      lang,
      startLine:     child.startLine,
      endLine:       child.endLine,
      chunkSize:     child.content.length,
      description:   desc.slice(0, 500),
      // Parent-doc retrieval fields
      parentId:      child.parentId,
      parentStart:   parent?.startLine ?? child.startLine,
      parentEnd:     parent?.endLine   ?? child.endLine,
      parentContent: (parent?.content ?? child.content).slice(0, 2000),
      // Structure metadata for display
      functions:     JSON.stringify(structure.functions.slice(0, 5)),
      classes:       JSON.stringify(structure.classes.slice(0, 5)),
      imports:       JSON.stringify(structure.imports.slice(0, 5)),
      routes:        JSON.stringify((structure.routes || []).slice(0, 5)),
      hooks:         JSON.stringify((structure.hooks  || []).slice(0, 5)),
      indexedAt:     new Date().toISOString(),
    });
  }

  // Upsert batch; fall back to one-by-one if batch fails
  try {
    await collection.upsert(batch);
  } catch (_) {
    let ok = 0;
    for (let j = 0; j < batch.ids.length; j++) {
      try {
        await collection.upsert({
          ids: [batch.ids[j]], embeddings: [batch.embeddings[j]],
          documents: [batch.documents[j]], metadatas: [batch.metadatas[j]],
        });
        ok++;
      } catch (_) {}
    }
    return { chunks: ok, skipped: false };
  }

  return { chunks: batch.ids.length, skipped: false };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CHROMADB INIT  — 3-tier fallback
//  THE KEY FIX: embeddingFunction: null
//  Without this, chromadb tries to use DefaultEmbeddingFunction which requires
//  @chroma-core/default-embed (not installed) and causes a hard crash.
//  We pass our own embeddings in every upsert/query call.
// ═══════════════════════════════════════════════════════════════════════════════
async function initChroma(silent = false) {
  const tries = [
    async () => {
      const url = new URL(CFG.chromaUrl);
      const c = new ChromaClient({
        host: url.hostname,
        port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
        ssl:  url.protocol === 'https:',
      });
      await c.heartbeat();
      return { client: c, mode: 'remote' };
    },
    async () => {
      const c = new ChromaClient({ host: 'localhost', port: 8000, ssl: false });
      await c.heartbeat();
      return { client: c, mode: 'localhost' };
    },
    async () => {
      const c = new ChromaClient();
      return { client: c, mode: 'in-memory' };
    },
  ];

  for (const t of tries) {
    try {
      const { client, mode } = await t();
      if (!silent) console.log(chalk.dim(`  · ChromaDB (${mode})`));
      return client;
    } catch (_) {}
  }
  throw new Error('ChromaDB unavailable in all modes. Is it running?');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export async function indexRepository(repoPath, options = {}) {
  const {
    forceReindex = false,
    debug        = false,
    silent       = false,
    maxFiles     = CFG.maxFiles,
    onProgress   = null,
  } = options;

  const t0         = Date.now();
  const projectDir = resolve(repoPath);

  if (!silent) console.log(chalk.dim('  · Connecting to ChromaDB…'));

  const chroma   = await initChroma(silent);
  const collName = `codeaura_${md5(projectDir)}`;
  let   collection;

  try {
    if (forceReindex) {
      try { await chroma.deleteCollection({ name: collName }); } catch (_) {}
    }

    // ─── THE FIX ─────────────────────────────────────────────────────────────
    // embeddingFunction: null  →  tells ChromaDB we manage embeddings ourselves.
    // Without this line, chromadb v1.8+ tries to instantiate DefaultEmbeddingFunction
    // which requires @chroma-core/default-embed → crashes with the error you saw.
    // ─────────────────────────────────────────────────────────────────────────
    collection = await chroma.getOrCreateCollection({
      name:              collName,
      embeddingFunction: null,
      metadata:          {
        'hnsw:space': 'cosine',
        project_path: projectDir,
        version:      '3.1.0',
        indexed_at:   new Date().toISOString(),
      },
    });
  } catch (err) {
    throw new Error(`Collection init failed: ${err.message}`);
  }

  const allFiles = await getAllFiles(projectDir, { maxFiles });

  // Incremental diffing
  const storedHashes = forceReindex ? {} : await loadHashes(projectDir);
  const newHashes    = {};
  const toIndex      = [];

  for (const fp of allFiles) {
    try {
      const content = await readFile(fp, 'utf-8');
      const hash    = md5(content);
      newHashes[fp] = hash;
      if (forceReindex || storedHashes[fp] !== hash) toIndex.push({ fp });
    } catch (_) {}
  }

  if (!silent) {
    console.log(chalk.dim(
      `  · ${allFiles.length} files found  ·  ${toIndex.length} to index  ·  ${allFiles.length - toIndex.length} unchanged`
    ));
    console.log('');
  }

  if (!toIndex.length) {
    if (!silent) console.log(chalk.dim('  · Index up-to-date.'));
    return {
      collection, collectionName: collName, projectDir,
      stats: {
        fileCount:  0, totalFiles: allFiles.length, chunkCount: 0,
        elapsedMs:  Date.now() - t0, fromCache: true,
      },
    };
  }

  // Parallel processing
  const limiter = pLimit ? pLimit(CFG.fileConcurrency) : null;
  let done = 0, chunks = 0, skipped = 0;

  const tasks = toIndex.map(({ fp }) => {
    const task = async () => {
      const res = await processFile(fp, projectDir, collection);
      done++;
      if (res.skipped) skipped++;
      else             chunks += res.chunks;
      // Periodic cache eviction
      if (done % 20 === 0) {
        if (embCache.size  > 1500) embCache.evictHalf();
        if (descCache.size > 800)  descCache.evictHalf();
      }
      onProgress?.(done, toIndex.length);
      if (!silent) {
        const pct = Math.round((done / toIndex.length) * 100);
        const bar = '█'.repeat(Math.round(pct / 5)) + chalk.dim('░'.repeat(20 - Math.round(pct / 5)));
        process.stdout.write(`\r  [${bar}] ${String(pct).padStart(3)}%  ${done}/${toIndex.length} files   `);
      }
    };
    return limiter ? limiter(task) : task();
  });

  await Promise.all(tasks);
  if (!silent) process.stdout.write('\n');

  // Persist updated hashes
  Object.assign(storedHashes, newHashes);
  await saveHashes(projectDir, storedHashes);

  const elapsedMs = Date.now() - t0;
  const langMap   = {};
  toIndex.forEach(({ fp }) => { const l = detectLang(fp); langMap[l] = (langMap[l] || 0) + 1; });

  if (!silent) {
    console.log('');
    console.log(chalk.dim(`  · ${(elapsedMs / 1000).toFixed(2)}s  ·  ${done - skipped} processed  ·  ${skipped} skipped  ·  ${chunks} chunks stored`));
  }

  return {
    collection,
    collectionName: collName,
    projectDir,
    stats: {
      fileCount:     done - skipped,
      totalFiles:    allFiles.length,
      skippedFiles:  skipped,
      chunkCount:    chunks,
      elapsedMs,
      fromCache:     false,
      langBreakdown: langMap,
    },
  };
}