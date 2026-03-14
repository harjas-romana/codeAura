#!/usr/bin/env node
// src/index.js — CodeAura v3.1.0
// CLI Entry Point — Developer Velocity Engine

import { Command }        from 'commander';
import chalk              from 'chalk';
import inquirer           from 'inquirer';
import { config }         from 'dotenv';
import { fileURLToPath }  from 'url';
import { dirname, join, resolve, basename } from 'path';
import { writeFile, readFile, unlink, stat } from 'fs/promises';

import {
  indexRepository,
  detectLang,
  generateDescription,
  generateFallbackEmbedding,
  getAllFiles,
} from './indexer.js';
import { searchInTerminal }  from './terminal-search.js';
import { startServer }       from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

config({ path: join(__dirname, '..', '.env') });

// ─── Optional packages ────────────────────────────────────────────────────────
let ora, cliProgress, Table, chokidar;
try { const m = await import('ora');          ora         = m.default; } catch (_) {}
try { const m = await import('cli-progress'); cliProgress = m.default; } catch (_) {}
try { const m = await import('cli-table3');   Table       = m.default; } catch (_) {}
try { const m = await import('chokidar');     chokidar    = m.default; } catch (_) {}

const CHAT_FILE    = '.codeaura-chat.json';
const API_KEY_FILE = join(__dirname, '..', '.codeaura-api-key');

// ═══════════════════════════════════════════════════════════════════════════════
//  BANNER  — monochrome, professional, terminal-native
//  No colors, no gradients. Just weight and precision.
// ═══════════════════════════════════════════════════════════════════════════════
function showBanner() {
  const W = chalk.bold.white;
  const D = chalk.dim;

  process.stdout.write('\n');

  // Block-letter wordmark — renders cleanly on any terminal width
  const art = [
    '   ██████╗ ██████╗ ██████╗ ███████╗ █████╗ ██╗   ██╗██████╗  █████╗ ',
    '  ██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔══██╗██║   ██║██╔══██╗██╔══██╗',
    '  ██║     ██║   ██║██║  ██║█████╗  ███████║██║   ██║██████╔╝███████║',
    '  ██║     ██║   ██║██║  ██║██╔══╝  ██╔══██║██║   ██║██╔══██╗██╔══██║',
    '  ╚██████╗╚██████╔╝██████╔╝███████╗██║  ██║╚██████╔╝██║  ██║██║  ██║',
    '   ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝',
  ];

  art.forEach(line => console.log(W(line)));
  console.log(D('  ' + '━'.repeat(70)));
  console.log(
    D('  ') + chalk.white('v3.1.0') +
    D('  ·  Developer Velocity Engine  ·  by Harjas Singh  ·  MIT')
  );
  console.log(
    D('  ') +
    D('[') + chalk.white('Hybrid BM25+Semantic') + D(']  ') +
    D('[') + chalk.white('Parent-Doc Retrieval') + D(']  ') +
    D('[') + chalk.white('Parallel Index')       + D(']  ') +
    D('[') + chalk.white('Chat Mode')            + D(']')
  );
  console.log(D('  ' + '━'.repeat(70)));
  process.stdout.write('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function cmdHeader(t) {
  console.log('\n' + chalk.bold.white(' ▸ ' + t) + '\n');
}

function ok(m)   { console.log(chalk.white('  ✓ ') + chalk.dim(m)); }
function info(m) { console.log(chalk.dim('  · ') + chalk.dim(m)); }
function warn(m) { console.log(chalk.yellow('  ! ') + chalk.dim(m)); }
function fail(m) { console.log(chalk.red('  ✗ ') + chalk.dim(m)); }
function hint(m) { console.log(chalk.dim('  → ') + chalk.dim(m)); }

function spinner(text) {
  if (ora) {
    return ora({ text: chalk.dim(text), spinner: 'line', color: 'white' }).start();
  }
  process.stdout.write(chalk.dim(`  · ${text}…\n`));
  return { succeed: t => ok(t || text), fail: t => fail(t || text), stop: () => {} };
}

function progressBar(total, label) {
  if (cliProgress) {
    const b = new cliProgress.SingleBar({
      format:            `  ${chalk.dim(label)} {bar} {percentage}%  {value}/{total}`,
      barCompleteChar:   '█',
      barIncompleteChar: '░',
      hideCursor:        true,
      barsize:           28,
    });
    b.start(total, 0);
    return b;
  }
  return { increment: () => {}, stop: () => {} };
}

function statsTable(rows) {
  if (Table) {
    const t = new Table({
      style: { head: [], border: [], compact: true },
      chars: {
        top:'─','top-mid':'┬','top-left':'┌','top-right':'┐',
        bottom:'─','bottom-mid':'┴','bottom-left':'└','bottom-right':'┘',
        left:'│','left-mid':'├',mid:'─','mid-mid':'┼',
        right:'│','right-mid':'┤',middle:'│',
      },
    });
    rows.forEach(([k, v]) => t.push([chalk.dim(k), chalk.white(v)]));
    console.log(t.toString().split('\n').map(l => '  ' + l).join('\n'));
  } else {
    rows.forEach(([k, v]) => console.log(`  ${chalk.dim(k.padEnd(22))} ${chalk.white(v)}`));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ENV CHECK
// ═══════════════════════════════════════════════════════════════════════════════
function checkEnv() {
  if (!process.env.GROQ_API_KEY) {
    warn('GROQ_API_KEY not set — AI features disabled (explanations, chat, re-rank)');
    hint('Get a free key → https://console.groq.com/ then add to .env');
    console.log('');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PRINT INDEX STATS
// ═══════════════════════════════════════════════════════════════════════════════
function printStats(stats) {
  statsTable([
    ['Files processed',  String(stats.fileCount    ?? 0)],
    ['Files skipped',    String(stats.skippedFiles ?? 0)],
    ['Chunks stored',    String(stats.chunkCount   ?? 0)],
    ['Time elapsed',     stats.elapsedMs ? `${(stats.elapsedMs / 1000).toFixed(2)}s` : '—'],
    ['Cache hit',        stats.fromCache ? 'yes' : 'no'],
  ]);
  if (stats.langBreakdown && Object.keys(stats.langBreakdown).length) {
    console.log('');
    const sorted = Object.entries(stats.langBreakdown).sort(([,a],[,b]) => b - a);
    const max    = sorted[0][1];
    sorted.slice(0, 8).forEach(([lang, n]) => {
      const bar = '█'.repeat(Math.round((n / max) * 20)) + chalk.dim('░'.repeat(20 - Math.round((n / max) * 20)));
      console.log(`  ${chalk.dim(lang.padEnd(18))} ${chalk.white(bar)} ${chalk.dim(String(n))}`);
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INTERACTIVE MAIN MENU
// ═══════════════════════════════════════════════════════════════════════════════
async function interactiveMenu(collection, projectDir) {
  while (true) {
    const { action } = await inquirer.prompt([{
      type:    'list',
      name:    'action',
      message: chalk.dim('Select action'),
      prefix:  chalk.white('▸'),
      choices: [
        new inquirer.Separator(chalk.dim(' ── Search ────────────────────')),
        { name: `${chalk.white('Search')}          ${chalk.dim('hybrid BM25 + semantic')}`,    value: 'search'  },
        { name: `${chalk.white('Chat')}            ${chalk.dim('AI conversation over code')}`,  value: 'chat'    },
        new inquirer.Separator(chalk.dim(' ── Index ─────────────────────')),
        { name: `${chalk.white('Re-index')}        ${chalk.dim('incremental update')}`,         value: 'reindex' },
        { name: `${chalk.white('Force re-index')}  ${chalk.dim('wipe and rebuild')}`,           value: 'force'   },
        { name: `${chalk.white('Watch')}           ${chalk.dim('hot-reload on file change')}`,  value: 'watch'   },
        { name: `${chalk.white('Diff')}            ${chalk.dim('preview what would change')}`,  value: 'diff'    },
        new inquirer.Separator(chalk.dim(' ── Explore ───────────────────')),
        { name: `${chalk.white('Stats')}           ${chalk.dim('codebase analytics')}`,         value: 'stats'   },
        { name: `${chalk.white('Dashboard')}       ${chalk.dim('web UI with charts')}`,         value: 'server'  },
        { name: `${chalk.white('Export')}          ${chalk.dim('search → HTML/MD/JSON')}`,      value: 'export'  },
        new inquirer.Separator(chalk.dim(' ── System ────────────────────')),
        { name: `${chalk.white('Doctor')}          ${chalk.dim('health check')}`,               value: 'doctor'  },
        { name: `${chalk.white('Clear')}           ${chalk.dim('wipe cache')}`,                 value: 'clear'   },
        { name: `${chalk.white('Exit')}`,                                                        value: 'exit'    },
      ],
    }]);

    if (action === 'exit') { console.log(chalk.dim('\n  Bye.\n')); process.exit(0); }

    switch (action) {
      case 'search': {
        const { q } = await inquirer.prompt([{
          type: 'input', name: 'q',
          message: chalk.dim('Query'), prefix: chalk.white('▸'),
        }]);
        if (q.trim()) await searchInTerminal(collection, q.trim(), {});
        break;
      }
      case 'chat':    await chatMode(collection);           break;
      case 'reindex': return { reindex: true, force: false };
      case 'force':   return { reindex: true, force: true  };
      case 'watch':   await watchMode(collection, projectDir); break;
      case 'diff':    await diffMode(projectDir);           break;
      case 'stats':   await showStats(collection);          break;
      case 'server': {
        const { port } = await inquirer.prompt([{
          type: 'number', name: 'port',
          message: chalk.dim('Port'), default: 3000,
          prefix: chalk.white('▸'),
        }]);
        startServer(projectDir, collection, port);
        info(`Dashboard → http://localhost:${port}`);
        await new Promise(() => {});
        break;
      }
      case 'export': {
        const { q } = await inquirer.prompt([{
          type: 'input', name: 'q',
          message: chalk.dim('Search query'), prefix: chalk.white('▸'),
        }]);
        const { fmt } = await inquirer.prompt([{
          type: 'list', name: 'fmt',
          message: chalk.dim('Format'),
          choices: ['html', 'markdown', 'json'],
          prefix: chalk.white('▸'),
        }]);
        if (q.trim()) await searchInTerminal(collection, q.trim(), { export: fmt });
        break;
      }
      case 'doctor': await runDoctor(); break;
      case 'clear':  await clearCache(); break;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CHAT MODE
// ═══════════════════════════════════════════════════════════════════════════════
async function chatMode(collection) {
  if (!process.env.GROQ_API_KEY) { warn('GROQ_API_KEY required.'); return; }
  const { Groq } = await import('groq-sdk');
  const groq     = new Groq({ apiKey: process.env.GROQ_API_KEY });

  let history = [];
  try {
    history = JSON.parse(await readFile(CHAT_FILE, 'utf-8'));
    info(`Restored ${history.length} messages.`);
  } catch (_) {}

  console.log('\n' + chalk.dim('  Chat with your codebase.  ') +
              chalk.white('exit') + chalk.dim(' to quit  ') +
              chalk.white('clear') + chalk.dim(' to reset history.\n'));

  while (true) {
    const { input } = await inquirer.prompt([{
      type: 'input', name: 'input',
      message: chalk.white('You'),
      prefix: chalk.dim('▸'),
    }]);

    const q = input.trim();
    if (!q || q === 'exit') break;
    if (q === 'clear') {
      history = [];
      try { await unlink(CHAT_FILE); } catch (_) {}
      info('History cleared.'); continue;
    }

    // Pull vector context
    let context = '';
    try {
      const qEmb = generateFallbackEmbedding(q);
      const res  = await collection.query({
        queryEmbeddings: [qEmb], nResults: 5,
        include: ['metadatas', 'documents'],
      });
      context = (res.documents[0] || [])
        .map((doc, i) => `### ${res.metadatas[0][i]?.filePath || 'unknown'}\n\`\`\`\n${doc?.slice(0, 600)}\n\`\`\``)
        .join('\n\n');
    } catch (_) {}

    history.push({ role: 'user', content: q });
    const sp = spinner('Thinking');
    try {
      const resp = await groq.chat.completions.create({
        model:       process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        max_tokens:  900,
        temperature: 0.3,
        messages: [
          {
            role:    'system',
            content: `Senior engineering assistant. Answer questions about this codebase precisely.\n\nCODE CONTEXT:\n${context}`,
          },
          ...history.slice(-10),
        ],
      });
      const answer = resp.choices[0]?.message?.content ?? '(no response)';
      sp.stop();
      console.log('\n' + chalk.dim('  ' + '─'.repeat(60)));
      console.log(chalk.dim('  Aura  ') + chalk.white(answer.replace(/\n/g, '\n         ')));
      console.log(chalk.dim('  ' + '─'.repeat(60)) + '\n');
      history.push({ role: 'assistant', content: answer });
      await writeFile(CHAT_FILE, JSON.stringify(history.slice(-40)));
    } catch (err) { sp.fail(err.message); }
  }
  console.log(chalk.dim('\n  Chat ended.\n'));
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════
async function showStats(collection) {
  cmdHeader('CODEBASE ANALYTICS');
  const sp = spinner('Fetching');
  try {
    const count = await collection.count();
    const peek  = await collection.peek({ limit: 500 });
    sp.stop();

    const langMap = {}; const fileSet = new Set(); let lines = 0;
    (peek.metadatas || []).forEach(m => {
      if (!m) return;
      langMap[m.language || 'unknown'] = (langMap[m.language || 'unknown'] || 0) + 1;
      if (m.filePath) fileSet.add(m.filePath);
      if (m.endLine && m.startLine) lines += m.endLine - m.startLine + 1;
    });

    statsTable([
      ['Total chunks',  String(count)],
      ['Total files',   String(fileSet.size)],
      ['Approx lines',  lines.toLocaleString()],
    ]);

    if (Object.keys(langMap).length) {
      console.log('\n' + chalk.dim('  Language breakdown\n'));
      const max    = Math.max(...Object.values(langMap));
      const sorted = Object.entries(langMap).sort(([,a],[,b]) => b - a);
      sorted.forEach(([lang, n]) => {
        const bar = '█'.repeat(Math.round((n / max) * 24)) + chalk.dim('░'.repeat(24 - Math.round((n / max) * 24)));
        console.log(`  ${chalk.dim(lang.padEnd(20))} ${chalk.white(bar)} ${chalk.dim(String(n))}`);
      });
    }
    console.log('');
  } catch (err) { sp.fail(err.message); }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WATCH MODE
// ═══════════════════════════════════════════════════════════════════════════════
async function watchMode(collection, projectDir) {
  if (!chokidar) { fail('chokidar not installed: npm i chokidar'); return; }
  info(`Watching ${projectDir}…`);
  info('Press Ctrl+C to stop.\n');

  const watcher = chokidar.watch(projectDir, {
    ignored: [/node_modules/, /\.git/, /dist/, /build/, /\.codeaura/],
    persistent: true, ignoreInitial: true,
  });

  const handle = async fp => {
    const sp = spinner(`Re-indexing ${basename(fp)}`);
    try {
      await indexRepository(projectDir, { forceReindex: false, silent: true });
      sp.succeed(`Re-indexed ${basename(fp)}`);
    } catch (err) { sp.fail(err.message); }
  };

  watcher.on('change', handle);
  watcher.on('add',    handle);
  watcher.on('unlink', fp => info(`Removed: ${basename(fp)}`));

  await new Promise(r => process.once('SIGINT', r));
  await watcher.close();
  info('Watcher stopped.');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DIFF MODE  — preview index changes without modifying anything
// ═══════════════════════════════════════════════════════════════════════════════
async function diffMode(projectDir) {
  cmdHeader('INDEX DIFF');
  const { createHash } = await import('crypto');

  let stored = {};
  try {
    const raw = await readFile(join(projectDir, '.codeaura-hashes.json'), 'utf-8');
    stored    = JSON.parse(raw);
  } catch (_) { info('No existing index — all files would be indexed.'); return; }

  const files   = await getAllFiles(projectDir, { maxFiles: 5000 });
  const changed = [], added = [];
  const removed = Object.keys(stored).filter(f => !files.includes(f));

  for (const fp of files) {
    try {
      const content = await readFile(fp, 'utf-8');
      const hash    = createHash('md5').update(content).digest('hex');
      if      (!stored[fp])           added.push(fp);
      else if (stored[fp] !== hash)   changed.push(fp);
    } catch (_) {}
  }

  statsTable([
    ['Added (new)',   String(added.length)],
    ['Modified',      String(changed.length)],
    ['Removed',       String(removed.length)],
    ['Unchanged',     String(files.length - added.length - changed.length)],
    ['Total tracked', String(Object.keys(stored).length)],
  ]);

  if (added.length + changed.length + removed.length === 0) {
    console.log(''); ok('Index is up-to-date.'); return;
  }

  if (changed.length) {
    console.log('\n' + chalk.dim('  Modified:'));
    changed.slice(0, 15).forEach(f =>
      console.log(`  ${chalk.dim('·')} ${chalk.white(f.replace(projectDir + '/', ''))}`)
    );
    if (changed.length > 15) info(`… and ${changed.length - 15} more`);
  }
  if (added.length) {
    console.log('\n' + chalk.dim('  Added:'));
    added.slice(0, 10).forEach(f =>
      console.log(`  ${chalk.dim('+')} ${chalk.white(f.replace(projectDir + '/', ''))}`)
    );
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DOCTOR
// ═══════════════════════════════════════════════════════════════════════════════
async function runDoctor() {
  cmdHeader('SYSTEM DOCTOR');
  const checks = [];

  // Node.js
  const [major] = process.versions.node.split('.').map(Number);
  checks.push({ label: `Node.js ${process.versions.node}`, pass: major >= 18, hint: major < 18 ? 'Requires >= 18' : null });

  // GROQ key
  const hasGroq = !!process.env.GROQ_API_KEY;
  checks.push({ label: `GROQ_API_KEY ${hasGroq ? '(set)' : '(not set)'}`, pass: hasGroq, hint: !hasGroq ? 'https://console.groq.com/' : null });

  // HuggingFace key
  const hasHf = !!process.env.HUGGINGFACE_API_KEY;
  checks.push({ label: `HUGGINGFACE_API_KEY ${hasHf ? '(set)' : '(not set — using local fallback)'}`, pass: true, warn: !hasHf });

  // ChromaDB
  let chromaOk = false;
  try {
    const { ChromaClient } = await import('chromadb');
    await new ChromaClient({ host: 'localhost', port: 8000, ssl: false }).heartbeat();
    chromaOk = true;
  } catch (_) {}
  checks.push({ label: `ChromaDB ${chromaOk ? '(localhost:8000 ok)' : '(not running — in-memory fallback)'}`, pass: true, warn: !chromaOk });

  // Optional packages
  for (const pkg of ['p-limit', 'fast-glob', 'chokidar', 'cli-table3']) {
    let ok2 = false;
    try { await import(pkg); ok2 = true; } catch (_) {}
    checks.push({ label: `${pkg} ${ok2 ? '(installed)' : '(missing — optional)'}`, pass: true, warn: !ok2 });
  }

  // GROQ live test
  if (hasGroq) {
    const sp = spinner('Testing GROQ API');
    let groqOk = false;
    try {
      const { Groq } = await import('groq-sdk');
      const g = new Groq({ apiKey: process.env.GROQ_API_KEY });
      await g.chat.completions.create({
        model: 'llama-3.1-8b-instant', max_tokens: 1,
        messages: [{ role: 'user', content: '.' }],
      });
      groqOk = true;
      sp.succeed('GROQ API reachable');
    } catch (err) { sp.fail(`GROQ API: ${err.message}`); }
    checks.push({ label: `GROQ live ping ${groqOk ? '(ok)' : '(failed)'}`, pass: groqOk });
  }

  console.log('');
  checks.forEach(c => {
    if      (c.pass && !c.warn) ok(c.label);
    else if (c.warn)            warn(c.label);
    else                        fail(c.label);
    if (c.hint) hint(c.hint);
  });
  console.log('');
  const failed = checks.filter(c => !c.pass).length;
  const warned = checks.filter(c => c.warn).length;
  if (failed)      fail(`${failed} check(s) failed.`);
  else if (warned) warn(`${warned} warning(s). CodeAura will work.`);
  else             ok('All systems operational.');
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CLEAR CACHE
// ═══════════════════════════════════════════════════════════════════════════════
async function clearCache() {
  const { what } = await inquirer.prompt([{
    type: 'checkbox', name: 'what',
    message: chalk.dim('Select items to clear'),
    prefix: chalk.white('▸'),
    choices: [
      { name: chalk.dim('Index hash cache  (.codeaura-hashes.json)'), value: 'hashes', checked: true },
      { name: chalk.dim('Chat history      (.codeaura-chat.json)'),   value: 'chat'                  },
      { name: chalk.dim('Stored API key'),                             value: 'apikey'                },
    ],
  }]);

  if (what.includes('hashes')) {
    try { await unlink('.codeaura-hashes.json'); ok('Hash cache cleared.'); }
    catch (_) { info('No hash cache found.'); }
  }
  if (what.includes('chat')) {
    try { await unlink(CHAT_FILE); ok('Chat history cleared.'); }
    catch (_) { info('No chat history found.'); }
  }
  if (what.includes('apikey')) {
    try { await unlink(API_KEY_FILE); ok('API key cleared.'); }
    catch (_) { info('No stored API key found.'); }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INIT WIZARD
// ═══════════════════════════════════════════════════════════════════════════════
async function runInit() {
  cmdHeader('SETUP WIZARD');
  console.log(chalk.dim('  First-time setup. Runs once.\n'));

  const answers = await inquirer.prompt([
    { type: 'input',    name: 'projectPath', message: chalk.dim('Codebase path'),                  default: process.cwd(), prefix: chalk.white('▸') },
    { type: 'password', name: 'groqKey',     message: chalk.dim('GROQ API key (blank to skip)'),   mask: '·',              prefix: chalk.white('▸') },
    { type: 'password', name: 'hfKey',       message: chalk.dim('HuggingFace key (blank = local)'),mask: '·',              prefix: chalk.white('▸') },
    { type: 'number',   name: 'concurrency', message: chalk.dim('Parallel workers'),               default: 8,             prefix: chalk.white('▸') },
    { type: 'confirm',  name: 'saveEnv',     message: chalk.dim('Save to .env?'),                  default: true,          prefix: chalk.white('▸') },
  ]);

  if (answers.saveEnv) {
    const lines = [
      answers.groqKey ? `GROQ_API_KEY=${answers.groqKey}` : '# GROQ_API_KEY=gsk_...',
      answers.hfKey   ? `HUGGINGFACE_API_KEY=${answers.hfKey}` : '# HUGGINGFACE_API_KEY=hf_...',
      `FILE_CONCURRENCY=${answers.concurrency}`,
    ];
    await writeFile('.env', lines.join('\n') + '\n');
    ok('.env written.');
    config({ path: '.env', override: true });
  }

  if (answers.projectPath) {
    info(`Indexing ${answers.projectPath}…`);
    const { collection, projectDir, stats } = await indexRepository(
      resolve(answers.projectPath), { forceReindex: false }
    );
    console.log('');
    printStats(stats);
    ok(`Index ready — ${stats.chunkCount} chunks from ${stats.fileCount} files.`);

    const { launch } = await inquirer.prompt([{
      type: 'list', name: 'launch',
      message: chalk.dim('Launch'),
      prefix: chalk.white('▸'),
      choices: [
        { name: chalk.dim('Search'),           value: 'search' },
        { name: chalk.dim('Web dashboard'),    value: 'server' },
        { name: chalk.dim('Interactive menu'), value: 'menu'   },
        { name: chalk.dim('Exit'),             value: 'exit'   },
      ],
    }]);

    if (launch === 'search') {
      const { q } = await inquirer.prompt([{ type: 'input', name: 'q', message: chalk.dim('Query'), prefix: chalk.white('▸') }]);
      if (q.trim()) await searchInTerminal(collection, q.trim(), {});
    } else if (launch === 'server') {
      startServer(projectDir, collection, 3000);
      info('Dashboard → http://localhost:3000');
      await new Promise(() => {});
    } else if (launch === 'menu') {
      await interactiveMenu(collection, projectDir);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GLOBAL ERROR GUARDS
// ═══════════════════════════════════════════════════════════════════════════════
process.on('uncaughtException', err => {
  console.error(chalk.red('\n  ✗ ') + chalk.dim(err.message));
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
process.on('unhandledRejection', reason => {
  console.error(chalk.red('\n  ✗ ') + chalk.dim(reason?.message ?? String(reason)));
  if (process.env.DEBUG) console.error(reason?.stack);
  process.exit(1);
});

// ═══════════════════════════════════════════════════════════════════════════════
//  CLI
// ═══════════════════════════════════════════════════════════════════════════════
showBanner();
checkEnv();

const program = new Command();

program
  .name('codeaura')
  .description('Developer velocity engine — hybrid semantic code search at scale')
  .version('3.1.0', '-v, --version')
  .addHelpText('after', `
${chalk.dim('Examples:')}
  ${chalk.white('codeaura init')}                      ${chalk.dim('First-time setup wizard')}
  ${chalk.white('codeaura setup ./my-project')}        ${chalk.dim('Index a codebase (incremental)')}
  ${chalk.white('codeaura setup ./my-project -f')}     ${chalk.dim('Force full re-index')}
  ${chalk.white('codeaura search "auth logic"')}       ${chalk.dim('Hybrid search')}
  ${chalk.white('codeaura chat')}                      ${chalk.dim('AI conversation over code')}
  ${chalk.white('codeaura serve')}                     ${chalk.dim('Chart dashboard → localhost:3000')}
  ${chalk.white('codeaura watch ./my-project')}        ${chalk.dim('Hot-reload indexing')}
  ${chalk.white('codeaura diff ./my-project')}         ${chalk.dim('Preview index changes')}
  ${chalk.white('codeaura stats')}                     ${chalk.dim('Codebase analytics')}
  ${chalk.white('codeaura explain ./src/auth.ts')}     ${chalk.dim('AI file explanation')}
  ${chalk.white('codeaura export "query" -f html')}    ${chalk.dim('Export results as HTML with charts')}
  ${chalk.white('codeaura doctor')}                    ${chalk.dim('System health check')}
  ${chalk.white('codeaura clear')}                     ${chalk.dim('Clear cache')}
`);

// ── init ──────────────────────────────────────────────────────────────────────
program
  .command('init')
  .description('Interactive first-time setup wizard')
  .action(async () => { await runInit(); });

// ── setup ─────────────────────────────────────────────────────────────────────
program
  .command('setup <path>')
  .description('Index a codebase (incremental by default)')
  .option('-f, --force',   'Force full re-index')
  .option('-d, --debug',   'Verbose output')
  .option('--no-menu',     'Skip interactive menu after indexing')
  .action(async (targetPath, opts) => {
    cmdHeader('INDEXING');
    info(`Target: ${resolve(targetPath)}\n`);
    let collection, projectDir, stats;
    try {
      ({ collection, projectDir, stats } = await indexRepository(
        resolve(targetPath), { forceReindex: opts.force, debug: opts.debug }
      ));
    } catch (err) { fail(err.message); process.exit(1); }
    console.log('');
    printStats(stats);
    console.log('');
    if (opts.menu !== false) await interactiveMenu(collection, projectDir);
  });

// ── search ────────────────────────────────────────────────────────────────────
program
  .command('search [query]')
  .description('Hybrid BM25 + semantic search')
  .option('-p, --path <path>',  'Codebase path', process.cwd())
  .option('-k, --top <n>',      'Results',        '5')
  .option('--no-rerank',        'Skip LLM re-ranking')
  .option('--no-expand',        'Skip query expansion')
  .option('-f, --export <fmt>', 'Auto-export: html|markdown|json')
  .option('--page <n>',         'Result page',    '0')
  .action(async (queryArg, opts) => {
    cmdHeader('SEARCH');
    let collection;
    try {
      ({ collection } = await indexRepository(resolve(opts.path), { forceReindex: false, silent: true }));
    } catch (err) { fail(err.message); process.exit(1); }

    let query = queryArg;
    if (!query) {
      const ans = await inquirer.prompt([{
        type: 'input', name: 'q',
        message: chalk.dim('Query'), prefix: chalk.white('▸'),
      }]);
      query = ans.q;
    }

    await searchInTerminal(collection, query.trim(), {
      limit:    parseInt(opts.top),
      noRerank: !opts.rerank,
      noExpand: !opts.expand,
      export:   opts.export,
      page:     parseInt(opts.page),
    });
  });

// ── chat ──────────────────────────────────────────────────────────────────────
program
  .command('chat')
  .description('AI conversation grounded in your codebase')
  .option('-p, --path <path>', 'Codebase path', process.cwd())
  .action(async opts => {
    cmdHeader('CODEBASE CHAT');
    let collection;
    try {
      ({ collection } = await indexRepository(resolve(opts.path), { forceReindex: false, silent: true }));
    } catch (err) { fail(err.message); process.exit(1); }
    await chatMode(collection);
  });

// ── serve ─────────────────────────────────────────────────────────────────────
program
  .command('serve')
  .description('Start chart dashboard web UI')
  .option('-p, --path <path>', 'Codebase path', process.cwd())
  .option('-q, --port <n>',    'Port',          '3000')
  .action(async opts => {
    cmdHeader('WEB DASHBOARD');
    let collection, projectDir;
    try {
      ({ collection, projectDir } = await indexRepository(resolve(opts.path), { forceReindex: false, silent: true }));
    } catch (err) { fail(err.message); process.exit(1); }
    startServer(projectDir, collection, parseInt(opts.port));
    ok(`Dashboard → http://localhost:${opts.port}`);
    console.log(chalk.dim('  Press Ctrl+C to stop.\n'));
    await new Promise(() => {});
  });

// ── watch ─────────────────────────────────────────────────────────────────────
program
  .command('watch <path>')
  .description('Hot-reload indexing on file changes')
  .action(async targetPath => {
    cmdHeader('WATCH');
    let collection, projectDir;
    try {
      ({ collection, projectDir } = await indexRepository(resolve(targetPath), { forceReindex: false }));
    } catch (err) { fail(err.message); process.exit(1); }
    await watchMode(collection, projectDir);
  });

// ── diff ──────────────────────────────────────────────────────────────────────
program
  .command('diff <path>')
  .description('Preview what would be re-indexed (dry run)')
  .action(async targetPath => { await diffMode(resolve(targetPath)); });

// ── stats ─────────────────────────────────────────────────────────────────────
program
  .command('stats')
  .description('Codebase analytics and index health')
  .option('-p, --path <path>', 'Codebase path', process.cwd())
  .action(async opts => {
    let collection;
    try {
      ({ collection } = await indexRepository(resolve(opts.path), { forceReindex: false, silent: true }));
    } catch (err) { fail(err.message); process.exit(1); }
    await showStats(collection);
  });

// ── explain ───────────────────────────────────────────────────────────────────
program
  .command('explain <file>')
  .description('AI explanation of any file')
  .action(async filePath => {
    cmdHeader('EXPLAIN');
    if (!process.env.GROQ_API_KEY) { warn('GROQ_API_KEY required.'); process.exit(1); }
    const sp = spinner(`Reading ${basename(filePath)}`);
    try {
      const content = await readFile(filePath, 'utf-8');
      sp.stop();
      const lang  = detectLang(filePath);
      const sp2   = spinner('Generating explanation');
      const desc  = await generateDescription(content, filePath, lang);
      sp2.stop();
      console.log('\n' + chalk.dim('  ' + '─'.repeat(60)));
      console.log(chalk.dim('  ') + chalk.white(filePath));
      console.log(chalk.dim('  ' + '─'.repeat(60)));
      console.log(chalk.white('  ' + desc.replace(/\n/g, '\n  ')));
      console.log(chalk.dim('  ' + '─'.repeat(60)) + '\n');
    } catch (err) { sp.fail(err.message); }
  });

// ── export ────────────────────────────────────────────────────────────────────
program
  .command('export <query>')
  .description('Search and export results non-interactively')
  .option('-p, --path <path>',  'Codebase path',           process.cwd())
  .option('-f, --format <fmt>', 'html | markdown | json',  'html')
  .option('-k, --top <n>',      'Results',                  '5')
  .action(async (query, opts) => {
    cmdHeader('EXPORT');
    let collection;
    try {
      ({ collection } = await indexRepository(resolve(opts.path), { forceReindex: false, silent: true }));
    } catch (err) { fail(err.message); process.exit(1); }
    await searchInTerminal(collection, query.trim(), {
      limit:    parseInt(opts.top),
      export:   opts.format,
      noExpand: false,
      noRerank: false,
    });
  });

// ── doctor ────────────────────────────────────────────────────────────────────
program
  .command('doctor')
  .description('System health check')
  .action(async () => { await runDoctor(); });

// ── clear ─────────────────────────────────────────────────────────────────────
program
  .command('clear')
  .description('Clear index cache, chat history, or stored API key')
  .action(async () => { cmdHeader('CLEAR'); await clearCache(); });

// ── api-key ───────────────────────────────────────────────────────────────────
program
  .command('api-key')
  .description('Manage GROQ API key')
  .action(async () => {
    cmdHeader('API KEY');
    const { action } = await inquirer.prompt([{
      type: 'list', name: 'action',
      message: chalk.dim('Action'),
      prefix: chalk.white('▸'),
      choices: [
        { name: chalk.dim('Show status'),       value: 'status' },
        { name: chalk.dim('Update key'),        value: 'update' },
        { name: chalk.dim('Remove stored key'), value: 'remove' },
      ],
    }]);

    if (action === 'status') {
      if (process.env.GROQ_API_KEY) ok('Using GROQ_API_KEY env var.');
      else try { await readFile(API_KEY_FILE); ok('Stored key found.'); }
           catch (_) { warn('No key configured.'); }
    }
    if (action === 'update') {
      const { key } = await inquirer.prompt([{
        type: 'password', name: 'key',
        message: chalk.dim('New GROQ API key'),
        mask: '·', prefix: chalk.white('▸'),
      }]);
      await writeFile(API_KEY_FILE, key.trim());
      ok('Key saved.');
    }
    if (action === 'remove') {
      try { await unlink(API_KEY_FILE); ok('Key removed.'); }
      catch (_) { info('No stored key.'); }
    }
    console.log('');
  });

// ── default: codeaura <path> ──────────────────────────────────────────────────
program
  .argument('[path]', 'Index a path and open interactive TUI', process.cwd())
  .option('-p, --prompt <query>',  'Search immediately and exit')
  .option('-s, --server',          'Start web dashboard')
  .option('-q, --port <n>',        'Server port', '3000')
  .option('-f, --force',           'Force full re-index')
  .option('-d, --debug',           'Verbose output')
  .action(async (targetPath, opts) => {
    const t0 = Date.now();
    cmdHeader('INDEXING');
    info(`Target: ${resolve(targetPath)}\n`);

    let collection, projectDir, stats;
    try {
      ({ collection, projectDir, stats } = await indexRepository(
        resolve(targetPath), { forceReindex: opts.force, debug: opts.debug }
      ));
    } catch (err) { fail(err.message); process.exit(1); }

    stats.elapsedMs = Date.now() - t0;
    console.log('');
    printStats(stats);
    console.log('');

    if (opts.prompt) {
      await searchInTerminal(collection, opts.prompt, {});
      process.exit(0);
    }
    if (opts.server) {
      startServer(projectDir, collection, parseInt(opts.port));
      ok(`Dashboard → http://localhost:${opts.port}`);
      await new Promise(() => {});
    }

    await interactiveMenu(collection, projectDir);
  });

program.parse(process.argv);