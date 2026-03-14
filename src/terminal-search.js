// src/terminal-search.js — CodeAura v3.1.0
// Hybrid Search: BM25 + Semantic + RRF + Parent-Doc Retrieval + Export
// Fix: queryEmbeddings must be [array] not array (ChromaDB API contract)

import chalk          from 'chalk';
import { Groq }       from 'groq-sdk';
import { config }     from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, basename, extname } from 'path';
import { writeFile }  from 'fs/promises';
import { generateFallbackEmbedding } from './indexer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

let inquirer;
try { inquirer = (await import('inquirer')).default; } catch (_) {}

let groq = null;
if (process.env.GROQ_API_KEY) {
  try { groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 20_000 }); } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BM25
// ═══════════════════════════════════════════════════════════════════════════════
class BM25 {
  constructor(k1 = 1.5, b = 0.75) { this.k1 = k1; this.b = b; }

  tokenize(t) {
    return t.replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/[^a-zA-Z0-9]/g, ' ')
            .toLowerCase().split(/\s+/).filter(w => w.length > 1);
  }

  build(docs) {
    this.corpus = docs.map(d => this.tokenize(d));
    const N = this.corpus.length;
    this.avgdl = this.corpus.reduce((s, d) => s + d.length, 0) / (N || 1);
    const df = {};
    for (const d of this.corpus) for (const t of new Set(d)) df[t] = (df[t] || 0) + 1;
    this.idf = {};
    for (const [t, f] of Object.entries(df)) this.idf[t] = Math.log((N - f + 0.5) / (f + 0.5) + 1);
  }

  score(query, di) {
    const q = this.tokenize(query), d = this.corpus[di], dl = d.length;
    const tf = {};
    for (const t of d) tf[t] = (tf[t] || 0) + 1;
    let s = 0;
    for (const t of q) {
      if (!this.idf[t]) continue;
      const f = tf[t] || 0;
      s += this.idf[t] * (f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + this.b * dl / this.avgdl));
    }
    return s;
  }

  search(query, topK = 20) {
    return this.corpus.map((_, i) => ({ i, score: this.score(query, i) }))
      .sort((a, b) => b.score - a.score).slice(0, topK);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  QUERY EXPANSION
// ═══════════════════════════════════════════════════════════════════════════════
async function expandQuery(query) {
  if (!groq) return query;
  try {
    const r = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant', max_tokens: 80, temperature: 0,
      messages: [
        { role: 'system', content: 'Expand this code search query with synonyms and related technical terms. Return ONLY the expanded query, single line, no explanation.' },
        { role: 'user',   content: `"${query}"` },
      ],
    });
    const e = r.choices[0]?.message?.content?.trim();
    return (e && e.length < 300) ? e : query;
  } catch (_) { return query; }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LLM RE-RANKER
// ═══════════════════════════════════════════════════════════════════════════════
async function rerank(query, results) {
  if (!groq || results.length <= 2) return results;
  try {
    const snippets = results.map((r, i) =>
      `[${i}] ${r.filePath}:${r.startLine}\n${r.content.slice(0, 160)}`
    ).join('\n\n');
    const resp = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant', max_tokens: 50, temperature: 0,
      messages: [
        { role: 'system', content: 'Re-rank code search results by relevance. Return ONLY comma-separated indices, best first.' },
        { role: 'user',   content: `Query: "${query}"\n\n${snippets}` },
      ],
    });
    const indices = (resp.choices[0]?.message?.content || '')
      .match(/\d+/g)?.map(Number).filter(n => n < results.length) ?? [];
    if (indices.length < 2) return results;
    const out = indices.map(i => results[i]);
    results.forEach((r, i) => { if (!indices.includes(i)) out.push(r); });
    return out;
  } catch (_) { return results; }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AI SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════
async function generateSummary(query, results) {
  if (!groq || !results.length) return;
  const ctx = results.slice(0, 4).map(r =>
    `### ${r.filePath}\n${r.description ? `> ${r.description}\n` : ''}\`\`\`\n${r.content.slice(0, 400)}\n\`\`\``
  ).join('\n\n');
  try {
    const resp = await groq.chat.completions.create({
      model:       process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      max_tokens:  200, temperature: 0.2,
      messages: [
        { role: 'system', content: 'Senior engineer. Summarise these search results in 2-3 sentences. Precise, developer-focused.' },
        { role: 'user',   content: `Query: "${query}"\n\n${ctx}` },
      ],
    });
    const s = resp.choices[0]?.message?.content?.trim();
    if (s) {
      console.log('\n' + chalk.dim('  ' + '─'.repeat(60)));
      console.log(chalk.dim('  AI Summary'));
      console.log(chalk.dim('  ' + '─'.repeat(60)));
      console.log(chalk.white('  ' + s.replace(/\n/g, '\n  ')));
      console.log(chalk.dim('  ' + '─'.repeat(60)) + '\n');
    }
  } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SYNTAX HIGHLIGHT  (terminal, no deps)
// ═══════════════════════════════════════════════════════════════════════════════
const KW_RE  = /\b(function|class|const|let|var|return|import|export|async|await|if|else|for|while|try|catch|def|fn|func|type|interface|enum|struct|impl|public|private|static|void|new|this|extends)\b/g;
const STR_RE = /(['"`])(?:(?!\1)[^\\]|\\.)*\1/g;
const CMT_RE = /\/\/[^\n]*|\/\*[\s\S]*?\*\//g;

function hlLine(line) {
  return line
    .replace(CMT_RE,  m => chalk.dim(m))
    .replace(STR_RE,  m => chalk.white(m))
    .replace(KW_RE,   m => chalk.bold.white(m));
}

function printCode(code, lang, maxLines = 16) {
  const lines  = code.split('\n');
  const gutter = chalk.dim('│');
  const hl     = ['javascript','typescript','python','go','rust','java','cpp','c'].includes(lang);
  lines.slice(0, maxLines).forEach(line => {
    console.log(`  ${gutter} ${hl ? hlLine(line) : chalk.dim(line)}`);
  });
  if (lines.length > maxLines) {
    console.log(`  ${gutter} ${chalk.dim(`… ${lines.length - maxLines} more lines`)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SCORE BAR  (20-char ASCII)
// ═══════════════════════════════════════════════════════════════════════════════
function scoreBar(sim) {
  const pct    = Math.min(100, Math.max(0, sim));
  const filled = Math.round(pct / 5);
  const bar    = '█'.repeat(filled) + chalk.dim('░'.repeat(20 - filled));
  const label  = pct >= 75 ? chalk.white(`${pct.toFixed(1)}%`) : chalk.dim(`${pct.toFixed(1)}%`);
  return bar + ' ' + label;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════
function displayResults(results, query, opts = {}) {
  const { page = 0, pageSize = 5 } = opts;
  const slice = results.slice(page * pageSize, page * pageSize + pageSize);
  if (!slice.length) { console.log(chalk.dim('\n  No results.\n')); return; }

  console.log('\n' + chalk.bold.white(`  ${results.length} results`) + chalk.dim(` for "${query}"`) + '\n');

  // Score overview
  console.log(chalk.dim('  Scores'));
  console.log(chalk.dim('  ' + '─'.repeat(62)));
  results.slice(0, 10).forEach((r, i) => {
    console.log(`  ${chalk.dim((`#${i + 1} ${basename(r.filePath)}`).padEnd(34))} ${scoreBar(r.similarity)}`);
  });
  console.log(chalk.dim('  ' + '─'.repeat(62)) + '\n');

  // Cards
  slice.forEach((r, idx) => {
    const gi = page * pageSize + idx + 1;
    console.log(chalk.bold.white(`  ┌─ #${gi}  ${r.filePath}`) + chalk.dim(`  [${r.language || ''}]`));
    console.log(`  │  ${chalk.dim(`lines ${r.startLine}–${r.endLine}`)}  ${scoreBar(r.similarity)}`);
    if (r.description) console.log(`  │  ${chalk.dim('·')} ${chalk.white(r.description)}`);

    // Structure hints
    const fns    = tryJson(r.functions);
    const cls    = tryJson(r.classes);
    const routes = tryJson(r.routes);
    const hints  = [
      ...cls.slice(0, 2).map(c => chalk.dim(`class:${c}`)),
      ...fns.slice(0, 3).map(f => chalk.dim(`fn:${f}`)),
      ...routes.slice(0, 2).map(rt => chalk.dim(`route:${rt}`)),
    ];
    if (hints.length) console.log(`  │  ${hints.join('  ')}`);

    // Matched child chunk
    if (r.matchedChunk && r.matchedChunk !== r.content) {
      console.log(`  │`);
      console.log(`  │  ${chalk.dim('Matched:')}`);
      r.matchedChunk.split('\n').slice(0, 4).forEach(l => console.log(`  │    ${chalk.dim(l)}`));
    }

    console.log(`  │`);
    console.log(`  │  ${chalk.dim('Context:')}`);
    printCode(r.content, r.language || 'text');
    console.log(chalk.dim('  └' + '─'.repeat(68)) + '\n');
  });

  const total = Math.ceil(results.length / pageSize);
  if (total > 1) console.log(chalk.dim(`  Page ${page + 1}/${total}\n`));
}

function tryJson(v) {
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v) || []; } catch (_) { return []; }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
async function exportResults(results, query, format) {
  const ts  = new Date().toISOString().replace(/[:.]/g, '-');
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  if (format === 'json') {
    const fp = `codeaura-export-${ts}.json`;
    await writeFile(fp, JSON.stringify({ query, results, exportedAt: new Date().toISOString() }, null, 2));
    console.log(chalk.dim(`  · JSON → ${fp}\n`)); return;
  }

  if (format === 'markdown') {
    const fp  = `codeaura-export-${ts}.md`;
    const out = [`# CodeAura Results\n`, `**Query:** ${query}  \n`, `---\n`];
    results.forEach((r, i) => {
      out.push(`## ${i + 1}. \`${r.filePath}\``);
      out.push(`> ${r.similarity.toFixed(1)}% match  ·  Lines ${r.startLine}–${r.endLine}\n`);
      if (r.description) out.push(`**${r.description}**\n`);
      out.push('```' + (r.language || ''));
      out.push(r.content.slice(0, 800));
      out.push('```\n---\n');
    });
    await writeFile(fp, out.join('\n'));
    console.log(chalk.dim(`  · Markdown → ${fp}\n`)); return;
  }

  // HTML with Chart.js
  const fp = `codeaura-export-${ts}.html`;

  const langMap = {};
  results.forEach(r => { langMap[r.language || 'other'] = (langMap[r.language || 'other'] || 0) + 1; });

  const simChart = {
    type: 'bar',
    data: {
      labels:   results.map((r, i) => `#${i+1} ${basename(r.filePath)}`),
      datasets: [{
        label:           'Similarity %',
        data:            results.map(r => r.similarity.toFixed(1)),
        backgroundColor: results.map(r => r.similarity >= 75 ? 'rgba(0,255,136,0.7)' : r.similarity >= 50 ? 'rgba(255,255,255,0.7)' : 'rgba(100,100,100,0.7)'),
        borderRadius:    3, borderWidth: 0,
      }],
    },
    options: {
      indexAxis: 'y', responsive: true,
      plugins: { legend: { display: false }, title: { display: true, text: 'Similarity Scores', color: '#888' } },
      scales: { x: { min: 0, max: 100, ticks: { color: '#555' }, grid: { color: '#111' } }, y: { ticks: { color: '#555' } } },
    },
  };

  const langChart = {
    type: 'doughnut',
    data: {
      labels: Object.keys(langMap),
      datasets: [{ data: Object.values(langMap), backgroundColor: ['#00ff88','#fff','#aaa','#666','#444'], borderColor: '#000', borderWidth: 3 }],
    },
    options: { responsive: true, cutout: '65%', plugins: { legend: { labels: { color: '#555' } }, title: { display: true, text: 'Languages', color: '#888' } } },
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>CodeAura — ${esc(query)}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#000;color:#ccc;font-family:'SF Mono','Courier New',monospace;font-size:12px;padding:28px}
header{border-bottom:1px solid #111;padding-bottom:16px;margin-bottom:24px}
h1{font-size:16px;font-weight:700;color:#fff;letter-spacing:.05em}h1 span{color:#00ff88}
p{color:#555;margin-top:4px;font-size:11px}
.charts{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
.chart-card{background:#0a0a0a;border:1px solid #111;padding:16px}
.chart-card canvas{max-height:240px}
.result{background:#0a0a0a;border:1px solid #111;border-left:2px solid #222;padding:16px 20px;margin-bottom:12px}
.result:first-of-type{border-left-color:#00ff88}
.file{font-weight:700;color:#fff;margin-bottom:4px}
.meta{font-size:10px;color:#444;margin-bottom:10px}
.score{display:inline-block;background:#00ff88;color:#000;padding:1px 7px;font-size:10px;font-weight:700;margin-left:6px}
pre{background:#000;padding:12px;font-size:11px;overflow-x:auto;white-space:pre-wrap;color:#888;max-height:280px;overflow-y:auto;line-height:1.7;border:1px solid #111}
.desc{color:#555;font-size:11px;margin-bottom:8px;font-style:italic}
</style></head>
<body>
<header>
  <h1>CODE<span>AURA</span> v3.1.0 — Results</h1>
  <p>Query: ${esc(query)}  ·  ${results.length} results  ·  ${new Date().toLocaleString()}</p>
</header>
<div class="charts">
  <div class="chart-card"><canvas id="cs"></canvas></div>
  <div class="chart-card"><canvas id="cl"></canvas></div>
</div>
${results.map((r, i) => `
<div class="result">
  <div class="file">#${i+1} ${esc(r.filePath)}<span class="score">${r.similarity.toFixed(1)}%</span></div>
  <div class="meta">Lines ${r.startLine}–${r.endLine}  ·  ${r.language || ''}</div>
  ${r.description ? `<div class="desc">${esc(r.description)}</div>` : ''}
  <pre>${esc(r.content.slice(0, 800))}</pre>
</div>`).join('')}
<script>
Chart.defaults.color='#555';Chart.defaults.borderColor='#111';
new Chart(document.getElementById('cs'),${JSON.stringify(simChart)});
new Chart(document.getElementById('cl'),${JSON.stringify(langChart)});
</script>
</body></html>`;

  await writeFile(fp, html);
  console.log(chalk.dim(`  · HTML → ${fp}\n`));
}

// ═══════════════════════════════════════════════════════════════════════════════
//  KEYWORD FALLBACK
// ═══════════════════════════════════════════════════════════════════════════════
async function textFallback(collection, query) {
  console.log(chalk.dim('  · Keyword fallback…'));
  try {
    const all = await collection.get({ include: ['metadatas', 'documents'] });
    const qw  = query.toLowerCase().split(/\s+/);
    const hits = all.ids.map((id, i) => {
      const text  = ((all.metadatas[i]?.description || '') + ' ' + (all.documents[i] || '')).toLowerCase();
      const score = qw.filter(w => text.includes(w)).length / qw.length;
      return { id, meta: all.metadatas[i], doc: all.documents[i], score };
    }).filter(h => h.score > 0).sort((a, b) => b.score - a.score).slice(0, 10);

    if (!hits.length) { console.log(chalk.dim('  No keyword matches.\n')); return; }
    displayResults(hits.map(h => ({
      filePath:    h.meta?.filePath   || h.id,
      language:    h.meta?.language   || 'text',
      startLine:   h.meta?.startLine  || 1,
      endLine:     h.meta?.endLine    || 1,
      description: h.meta?.description || '',
      content:     h.doc || '',
      similarity:  h.score * 100,
    })), query);
  } catch (err) { console.log(chalk.dim(`  ✗ ${err.message}`)); }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export async function searchInTerminal(collection, rawQuery, options = {}) {
  const {
    noExpand  = false,
    noRerank  = false,
    noSummary = false,
    limit     = 10,
    page      = 0,
    export:   exportFmt = null,
  } = options;

  console.log('\n' + chalk.dim('  ' + '─'.repeat(60)));
  console.log(chalk.bold.white('  Search: ') + chalk.dim(rawQuery));
  console.log(chalk.dim('  ' + '─'.repeat(60)) + '\n');

  // 1. Query expansion
  const query = noExpand ? rawQuery : await expandQuery(rawQuery);
  if (query !== rawQuery) console.log(chalk.dim(`  · Expanded: ${query}\n`));

  // 2. Embed query using local fallback (no native deps)
  const qEmb = generateFallbackEmbedding(query);

  // 3. ChromaDB vector search
  // IMPORTANT: queryEmbeddings must be [qEmb] — an array wrapping the vector
  let chromaResults;
  try {
    chromaResults = await collection.query({
      queryEmbeddings: [qEmb],                           // ← wrapped in array
      nResults:        Math.min(limit * 3, 30),
      include:         ['metadatas', 'documents', 'distances'],
    });
  } catch (err) {
    console.log(chalk.dim(`  · ChromaDB error: ${err.message}`));
    await textFallback(collection, rawQuery);
    return;
  }

  if (!chromaResults?.ids?.[0]?.length) {
    console.log(chalk.dim('  No results.\n')); return;
  }

  const ids       = chromaResults.ids[0];
  const metas     = chromaResults.metadatas[0];
  const docs      = chromaResults.documents[0];
  const distances = chromaResults.distances[0];

  // 4. BM25 on candidate set
  const bm25 = new BM25();
  bm25.build(docs);
  const bm25Scores = bm25.search(query, ids.length);

  // 5. RRF fusion
  const rrfScores = {};
  ids.forEach((id, rank) => { rrfScores[id] = (rrfScores[id] || 0) + 1 / (60 + rank + 1); });
  bm25Scores.forEach(({ i }, rank) => {
    const id = ids[i];
    rrfScores[id] = (rrfScores[id] || 0) + 1 / (60 + rank + 1);
  });

  // 6. Build results with parent-doc retrieval
  const seen = new Set();
  let results = ids
    .map((id, i) => {
      const meta    = metas[i] || {};
      const hasPDoc = meta.parentContent && meta.parentContent !== docs[i];
      return {
        id,
        filePath:     meta.filePath    || id,
        language:     meta.language    || 'text',
        startLine:    hasPDoc ? (meta.parentStart || meta.startLine) : (meta.startLine || 1),
        endLine:      hasPDoc ? (meta.parentEnd   || meta.endLine)   : (meta.endLine   || 1),
        description:  meta.description || '',
        functions:    meta.functions   || '[]',
        classes:      meta.classes     || '[]',
        routes:       meta.routes      || '[]',
        hooks:        meta.hooks       || '[]',
        content:      hasPDoc ? meta.parentContent : docs[i],
        matchedChunk: hasPDoc ? docs[i] : null,
        similarity:   Math.max(0, Math.min(100, (1 - (distances[i] || 0)) * 100)),
        rrfScore:     rrfScores[id] || 0,
      };
    })
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .filter(r => {
      const k = `${r.filePath}:${r.startLine}`;
      if (seen.has(k)) return false; seen.add(k); return true;
    })
    .slice(0, limit);

  // 7. LLM re-rank
  if (!noRerank) results = await rerank(query, results);

  // 8. Display
  displayResults(results, rawQuery, { page });

  // 9. Summary
  if (!noSummary) await generateSummary(rawQuery, results);

  // 10. Export
  if (exportFmt) {
    await exportResults(results, rawQuery, exportFmt);
  } else if (inquirer && process.stdout.isTTY) {
    const { fmt } = await inquirer.prompt([{
      type: 'list', name: 'fmt',
      message: chalk.dim('Export?'),
      prefix: chalk.white('▸'),
      choices: [
        { name: chalk.dim('Skip'),                value: 'skip' },
        { name: chalk.dim('HTML (with charts)'),  value: 'html' },
        { name: chalk.dim('Markdown'),            value: 'markdown' },
        { name: chalk.dim('JSON'),                value: 'json' },
      ],
    }]);
    if (fmt !== 'skip') await exportResults(results, rawQuery, fmt);
  }
}