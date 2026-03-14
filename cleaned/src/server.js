// src/server.js — CodeAura v3.1.0
// Express API + Chart.js dashboard + D3 force graph
// Fix: uses generateFallbackEmbedding from indexer (no onnxruntime)
// Fix: passes queryEmbeddings as array to collection.query

import express          from 'express';
import cors             from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join, extname, basename } from 'path';
import { Groq }         from 'groq-sdk';
import chalk            from 'chalk';
import { config }       from 'dotenv';
import { generateFallbackEmbedding } from './indexer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

let groq = null;
if (process.env.GROQ_API_KEY) {
  try { groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 20_000 }); }
  catch (e) { console.warn(chalk.dim(`  ! Groq: ${e.message}`)); }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CHART DATA BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════
function scoreColor(sim, alpha) {
  if (sim >= 75) return `rgba(0,255,136,${alpha})`;
  if (sim >= 50) return `rgba(255,255,255,${alpha})`;
  if (sim >= 30) return `rgba(160,160,160,${alpha})`;
  return `rgba(80,80,80,${alpha})`;
}

function extToLang(ext) {
  const m = {
    '.js':'JavaScript','.ts':'TypeScript','.jsx':'React JSX','.tsx':'React TSX',
    '.py':'Python','.java':'Java','.go':'Go','.rs':'Rust','.rb':'Ruby',
    '.php':'PHP','.cs':'C#','.cpp':'C++','.c':'C','.swift':'Swift','.kt':'Kotlin',
    '.vue':'Vue','.svelte':'Svelte',
  };
  return m[ext] || 'Other';
}

function codeProfile(code = '') {
  const clamp = (n, max) => Math.min(10, Math.round((n / max) * 10));
  return [
    clamp((code.match(/function\b|=>/g)     || []).length, 15),
    clamp((code.match(/\bif\b|\belse\b/g)   || []).length, 20),
    clamp((code.match(/\bfor\b|\bwhile\b/g) || []).length, 10),
    clamp((code.match(/\basync\b|\bawait\b/g)||[]).length, 10),
    clamp((code.match(/\bclass\b/g)         || []).length,  5),
    clamp((code.match(/\btry\b|\bcatch\b/g) || []).length,  8),
    clamp((code.match(/\/\/|\/\*|#\s/g)     || []).length, 20),
  ];
}

function buildChartData(results) {
  const palette = ['#00ff88','#ffffff','#aaaaaa','#666666','#444444','#333333'];

  const langMap = {};
  for (const r of results) {
    const lang = extToLang(extname(r.filePath || ''));
    langMap[lang] = (langMap[lang] || 0) + 1;
  }

  return {
    similarityChart: {
      type: 'bar',
      data: {
        labels:   results.map((r, i) => `#${i + 1} ${basename(r.filePath)}`),
        datasets: [{
          label:           'Similarity %',
          data:            results.map(r => parseFloat(r.similarity.toFixed(2))),
          backgroundColor: results.map(r => scoreColor(r.similarity, 0.8)),
          borderColor:     results.map(r => scoreColor(r.similarity, 1.0)),
          borderWidth:     1, borderRadius: 3,
        }],
      },
      options: {
        indexAxis: 'y', responsive: true,
        plugins: {
          legend: { display: false },
          title:  { display: true, text: 'Similarity Scores', color: '#888', font: { size: 12 } },
        },
        scales: {
          x: { min: 0, max: 100, ticks: { color: '#555' }, grid: { color: '#111' } },
          y: { ticks: { color: '#555', font: { size: 10 } } },
        },
      },
    },

    langChart: {
      type: 'doughnut',
      data: {
        labels:   Object.keys(langMap),
        datasets: [{
          data:            Object.values(langMap),
          backgroundColor: Object.keys(langMap).map((_, i) => palette[i % palette.length]),
          borderColor:     '#000', borderWidth: 3, hoverOffset: 6,
        }],
      },
      options: {
        responsive: true, cutout: '68%',
        plugins: {
          legend: { position: 'right', labels: { color: '#555', padding: 10, font: { size: 11 } } },
          title:  { display: true, text: 'Languages', color: '#888', font: { size: 12 } },
        },
      },
    },

    fileHeatmap: {
      type: 'bubble',
      data: {
        datasets: [{
          label:           'Hotspots',
          data:            results.map((r, i) => ({
            x: i, y: r.startLine || 1,
            r: Math.max(4, (r.similarity / 100) * 18),
          })),
          backgroundColor: results.map(r => scoreColor(r.similarity, 0.6)),
          borderColor:     results.map(r => scoreColor(r.similarity, 1.0)),
          borderWidth:     1,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title:  { display: true, text: 'Code Hotspot Map', color: '#888', font: { size: 12 } },
          tooltip: {
            callbacks: {
              label: ctx => {
                const r = results[ctx.dataIndex];
                return [`${r.filePath}`, `Line ${r.startLine}`, `${r.similarity.toFixed(1)}%`];
              },
            },
          },
        },
        scales: {
          x: { ticks: { color: '#555', callback: v => basename(results[v]?.filePath || '') }, grid: { color: '#111' } },
          y: { ticks: { color: '#555' }, grid: { color: '#111' }, title: { display: true, text: 'Line', color: '#444' } },
        },
      },
    },

    radarChart: {
      type: 'radar',
      data: {
        labels:   ['Functions','Conditions','Loops','Async','Classes','Error handling','Comments'],
        datasets: results.slice(0, 4).map((r, i) => ({
          label:               `#${i + 1} ${basename(r.filePath)}`,
          data:                codeProfile(r.content),
          backgroundColor:     palette[i % palette.length] + '22',
          borderColor:         palette[i % palette.length],
          pointBackgroundColor:palette[i % palette.length],
          borderWidth:         1.5,
        })),
      },
      options: {
        responsive: true,
        scales: { r: { ticks: { display: false }, grid: { color: '#111' }, pointLabels: { color: '#555', font: { size: 10 } }, suggestedMin: 0, suggestedMax: 10 } },
        plugins: {
          legend: { labels: { color: '#555', font: { size: 10 } } },
          title:  { display: true, text: 'Code Profile Radar', color: '#888', font: { size: 12 } },
        },
      },
    },

    scoreLineChart: {
      type: 'line',
      data: {
        labels:   results.map((_, i) => `#${i + 1}`),
        datasets: [{
          label:           'Score',
          data:            results.map(r => r.similarity),
          borderColor:     '#00ff88',
          backgroundColor: 'rgba(0,255,136,0.05)',
          pointBackgroundColor: results.map(r => scoreColor(r.similarity, 1.0)),
          pointRadius:     5, pointHoverRadius: 7,
          fill: true, tension: 0.35,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, title: { display: true, text: 'Relevance Curve', color: '#888', font: { size: 12 } } },
        scales: {
          x: { ticks: { color: '#555' }, grid: { color: '#111' } },
          y: { min: 0, max: 100, ticks: { color: '#555', callback: v => `${v}%` }, grid: { color: '#111' } },
        },
      },
    },
  };
}

function buildGraphData(results) {
  const nodes   = [];
  const links   = [];
  const fileMap = new Map();

  for (const r of results) {
    if (!fileMap.has(r.filePath)) {
      const id = nodes.length;
      fileMap.set(r.filePath, id);
      nodes.push({ id, label: basename(r.filePath), filePath: r.filePath,
                   similarity: r.similarity, lang: extToLang(extname(r.filePath || '')),
                   radius: 5 + (r.similarity / 100) * 14 });
    }
  }
  for (const r of results) {
    const srcId = fileMap.get(r.filePath);
    const re    = /(?:import|require)\(?['"]([^'"]+)['"]\)?/g;
    let m;
    while ((m = re.exec(r.content || '')) !== null) {
      for (const [fp, tgtId] of fileMap.entries()) {
        if (tgtId !== srcId && (fp.includes(m[1]) || m[1].includes(basename(fp, extname(fp))))) {
          links.push({ source: srcId, target: tgtId, strength: 0.5 });
          break;
        }
      }
    }
  }
  return { nodes, links };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD HTML
// ═══════════════════════════════════════════════════════════════════════════════
function buildDashboardHtml() {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CodeAura v3.1.0</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#000;--s1:#0a0a0a;--s2:#111;--b1:#1a1a1a;--b2:#222;--text:#e0e0e0;--muted:#555;--dim:#333;--green:#00ff88}
html,body{height:100%;background:var(--bg);color:var(--text);font-family:'SF Mono','Fira Code','Courier New',monospace;font-size:13px}
.app{display:grid;grid-template-rows:auto 1fr;height:100vh}
header{background:var(--s1);border-bottom:1px solid var(--b1);padding:12px 24px;display:flex;align-items:center;justify-content:space-between}
.logo{font-weight:700;font-size:14px;letter-spacing:.05em}.logo span{color:var(--green)}
.logo sub{font-size:9px;color:var(--muted);margin-left:6px}
.hstatus{font-size:11px;color:var(--muted)}
.layout{display:grid;grid-template-columns:320px 1fr;overflow:hidden}
.sidebar{background:var(--s1);border-right:1px solid var(--b1);display:flex;flex-direction:column;overflow:hidden}
.search-box{padding:14px;border-bottom:1px solid var(--b1)}
.search-row{display:flex;gap:8px}
input[type=text]{flex:1;background:var(--bg);border:1px solid var(--b2);color:var(--text);padding:8px 12px;font-family:inherit;font-size:12px;outline:none;transition:border-color .15s}
input[type=text]:focus{border-color:var(--green)}
button.go{background:var(--green);color:#000;border:none;padding:8px 16px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer}
button.go:hover{opacity:.85}
#sStatus{font-size:10px;color:var(--muted);margin-top:6px;height:14px}
.results-list{flex:1;overflow-y:auto;padding:8px}
.rc{background:var(--bg);border:1px solid var(--b1);padding:10px 12px;margin-bottom:6px;cursor:pointer;transition:border-color .15s}
.rc:hover,.rc.active{border-color:var(--green)}
.rc-rank{font-size:10px;color:var(--muted);margin-bottom:3px}
.rc-file{font-size:11px;font-weight:700;color:var(--text);word-break:break-all}
.rc-score{font-size:10px;color:var(--muted);margin-top:3px}
.score-bar{height:2px;background:var(--b2);margin-top:5px;overflow:hidden}
.score-fill{height:100%;transition:width .3s}
.rc-desc{font-size:10px;color:var(--dim);margin-top:5px;line-height:1.5;font-family:system-ui,sans-serif}
.main{display:flex;flex-direction:column;overflow:hidden}
.tabs{display:flex;padding:0 16px;border-bottom:1px solid var(--b1);background:var(--s1)}
.tab{padding:10px 16px;font-size:11px;font-weight:700;cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;transition:all .15s;letter-spacing:.05em}
.tab:hover{color:var(--text)}.tab.active{color:var(--green);border-bottom-color:var(--green)}
.tab-content{flex:1;overflow-y:auto;padding:20px;display:none}
.tab-content.visible{display:block}
.charts-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.chart-card{background:var(--s1);border:1px solid var(--b1);padding:16px}
.chart-card.full{grid-column:1/-1}
.chart-card canvas{max-height:240px}
.code-viewer{background:var(--s1);border:1px solid var(--b1);overflow:hidden}
.code-header{padding:8px 14px;background:var(--s2);font-size:10px;color:var(--muted);display:flex;justify-content:space-between;border-bottom:1px solid var(--b1)}
pre{padding:14px;overflow:auto;font-size:12px;line-height:1.7;color:#ccc;white-space:pre-wrap;max-height:380px}
.explanation{background:var(--s2);border:1px solid var(--b1);border-top:none;padding:12px 16px;font-size:12px;color:var(--muted);line-height:1.7;font-family:system-ui,sans-serif}
.explanation strong{color:var(--green)}
#graph-svg{width:100%;height:460px;background:var(--bg);border:1px solid var(--b1)}
.node circle{cursor:pointer;stroke-width:1.5}
.node text{font-size:10px;fill:var(--muted);pointer-events:none;font-family:inherit}
.link{stroke:var(--b2);stroke-opacity:.8}
.empty{text-align:center;padding:60px 20px;color:var(--muted)}
.empty .icon{font-size:2rem;margin-bottom:10px}
.spinner{display:inline-block;width:14px;height:14px;border:2px solid var(--b2);border-top-color:var(--green);border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.status-bar{padding:5px 16px;font-size:10px;color:var(--muted);background:var(--s1);border-top:1px solid var(--b1)}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-thumb{background:var(--b2)}
</style>
</head>
<body>
<div class="app">
<header>
  <div class="logo">CODE<span>AURA</span><sub>v3.1.0</sub></div>
  <div class="hstatus" id="hStatus">Ready</div>
</header>
<div class="layout">
  <div class="sidebar">
    <div class="search-box">
      <div class="search-row">
        <input type="text" id="sInput" placeholder="Search codebase…" autocomplete="off">
        <button class="go" id="sBtn">Go</button>
      </div>
      <div id="sStatus"></div>
    </div>
    <div class="results-list" id="rList">
      <div class="empty"><div class="icon">◈</div><div>Enter a query</div></div>
    </div>
  </div>
  <div class="main">
    <div class="tabs">
      <div class="tab active" data-tab="charts">CHARTS</div>
      <div class="tab"        data-tab="code">CODE</div>
      <div class="tab"        data-tab="graph">GRAPH</div>
    </div>
    <div class="tab-content visible" id="tab-charts">
      <div id="chartsPanel"><div class="empty"><div class="icon">◈</div><div>Run a search</div></div></div>
    </div>
    <div class="tab-content" id="tab-code">
      <div id="codePanel"><div class="empty"><div class="icon">◈</div><div>Select a result</div></div></div>
    </div>
    <div class="tab-content" id="tab-graph">
      <div id="graphPanel"><div class="empty"><div class="icon">◈</div><div>Run a search</div></div></div>
    </div>
    <div class="status-bar" id="statusBar">Idle</div>
  </div>
</div>
</div>
<script>
let currentResults=[],chartInstances={},selectedIdx=-1;
const $=id=>document.getElementById(id);

document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(x=>x.classList.remove('visible'));
    t.classList.add('active');
    $('tab-'+t.dataset.tab).classList.add('visible');
  });
});

$('sBtn').addEventListener('click',runSearch);
$('sInput').addEventListener('keydown',e=>e.key==='Enter'&&runSearch());

async function runSearch(){
  const q=$('sInput').value.trim();if(!q)return;
  $('sStatus').innerHTML='<span class="spinner"></span>';
  $('statusBar').textContent='Searching…';$('hStatus').textContent='Searching…';
  try{
    const res=await fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q,limit:10})});
    const data=await res.json();
    if(data.error)throw new Error(data.error);
    currentResults=data.results;
    $('sStatus').textContent=data.results.length+' results';
    $('statusBar').textContent=data.results.length+' results for "'+q+'"';
    $('hStatus').textContent='Ready';
    renderList(data.results);renderCharts(data.chartData);renderGraph(data.graph);
    if(data.results.length>0)selectResult(0);
  }catch(err){$('sStatus').textContent=err.message;$('hStatus').textContent='Error';}
}

function renderList(results){
  if(!results.length){$('rList').innerHTML='<div class="empty"><div class="icon">◈</div><div>No results</div></div>';return;}
  $('rList').innerHTML=results.map((r,i)=>\`
    <div class="rc" id="rc-\${i}" onclick="selectResult(\${i})">
      <div class="rc-rank">#\${i+1} · \${r.lang||''}</div>
      <div class="rc-file">\${esc(r.filePath)}</div>
      <div class="rc-score">\${r.similarity.toFixed(1)}% · line \${r.startLine||'?'}</div>
      <div class="score-bar"><div class="score-fill" style="width:\${r.similarity}%;background:\${r.similarity>=75?'#00ff88':r.similarity>=50?'#fff':'#666'}"></div></div>
      \${r.description?'<div class="rc-desc">'+esc(r.description.slice(0,80))+'</div>':''}
    </div>
  \`).join('');
}

function selectResult(idx){
  if(selectedIdx>=0)$('rc-'+selectedIdx)?.classList.remove('active');
  selectedIdx=idx;$('rc-'+idx)?.classList.add('active');
  document.querySelector('[data-tab="code"]').click();
  renderCode(currentResults[idx]);
}

async function renderCode(r){
  $('codePanel').innerHTML=\`
    <div class="code-viewer">
      <div class="code-header"><span>◈ \${esc(r.filePath)}</span><span>Lines \${r.startLine||'?'}–\${r.endLine||'?'} · \${r.similarity.toFixed(1)}%</span></div>
      <pre>\${esc(r.content||'')}</pre>
    </div>
    <div class="explanation" id="explainBox"><strong>Explanation</strong><br><span id="explainText">Loading…</span></div>
  \`;
  try{
    const res=await fetch('/api/explain',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:r.content,filePath:r.filePath})});
    const data=await res.json();
    $('explainText').textContent=data.explanation||'—';
  }catch(_){$('explainText').textContent='Unavailable.';}
}

function renderCharts(cd){
  if(!cd)return;
  Object.values(chartInstances).forEach(c=>c.destroy());chartInstances={};
  $('chartsPanel').innerHTML=\`
    <div class="charts-grid">
      <div class="chart-card full"><canvas id="cs"></canvas></div>
      <div class="chart-card"><canvas id="cl"></canvas></div>
      <div class="chart-card"><canvas id="cr"></canvas></div>
      <div class="chart-card"><canvas id="cline"></canvas></div>
      <div class="chart-card"><canvas id="cb"></canvas></div>
    </div>
  \`;
  Chart.defaults.color='#555';Chart.defaults.borderColor='#111';
  chartInstances.s=new Chart($('cs'),cd.similarityChart);
  chartInstances.l=new Chart($('cl'),cd.langChart);
  chartInstances.r=new Chart($('cr'),cd.radarChart);
  chartInstances.line=new Chart($('cline'),cd.scoreLineChart);
  chartInstances.b=new Chart($('cb'),cd.fileHeatmap);
}

function renderGraph(gd){
  $('graphPanel').innerHTML='<svg id="graph-svg"></svg>';
  if(!gd?.nodes?.length)return;
  const{nodes,links}=gd;const W=$('graph-svg').clientWidth||760,H=460;
  const svg=d3.select('#graph-svg');
  const color=d3.scaleOrdinal(['#00ff88','#fff','#aaa','#666','#444']);
  const sim=d3.forceSimulation(nodes)
    .force('link',d3.forceLink(links).id(d=>d.id).distance(80))
    .force('charge',d3.forceManyBody().strength(-180))
    .force('center',d3.forceCenter(W/2,H/2))
    .force('collision',d3.forceCollide().radius(d=>d.radius+6));
  const link=svg.append('g').selectAll('line').data(links).join('line').attr('class','link').attr('stroke-width',1);
  const node=svg.append('g').selectAll('g').data(nodes).join('g').attr('class','node').call(
    d3.drag()
      .on('start',(e,d)=>{if(!e.active)sim.alphaTarget(.3).restart();d.fx=d.x;d.fy=d.y;})
      .on('drag',(e,d)=>{d.fx=e.x;d.fy=e.y;})
      .on('end',(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null;})
  );
  node.append('circle').attr('r',d=>d.radius).attr('fill',d=>color(d.lang)).attr('stroke',d=>d3.color(color(d.lang)).brighter(1))
    .on('click',(_,d)=>{const idx=currentResults.findIndex(r=>r.filePath===d.filePath);if(idx>=0){document.querySelector('[data-tab="code"]').click();selectResult(idx);}});
  node.append('text').attr('dy',d=>d.radius+12).attr('text-anchor','middle').text(d=>d.label.length>16?d.label.slice(0,14)+'…':d.label);
  sim.on('tick',()=>{
    link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
    node.attr('transform',d=>\`translate(\${d.x},\${d.y})\`);
  });
}

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
</script>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SERVER
// ═══════════════════════════════════════════════════════════════════════════════
export function startServer(projectDir, collection, port = 3000) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.get('/', (_, res) => { res.setHeader('Content-Type', 'text/html'); res.send(buildDashboardHtml()); });

  app.get('/api/health', (_, res) => res.json({
    status: 'ok', version: '3.1.0', ai: !!groq, project: projectDir, ts: new Date().toISOString(),
  }));

  app.get('/api/analytics', async (_, res) => {
    try {
      const count = await collection.count();
      const peek  = await collection.peek({ limit: 200 });
      const langMap = {}; const fileSet = new Set();
      (peek.metadatas || []).forEach(m => {
        if (!m) return;
        langMap[m.language || 'unknown'] = (langMap[m.language || 'unknown'] || 0) + 1;
        if (m.filePath) fileSet.add(m.filePath);
      });
      res.json({ totalChunks: count, totalFiles: fileSet.size, langBreakdown: langMap });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/search', async (req, res) => {
    const { query, limit = 10 } = req.body;
    if (!query?.trim()) return res.status(400).json({ error: 'query required' });
    try {
      const qEmb = generateFallbackEmbedding(query);
      // queryEmbeddings must be an array of arrays
      const raw  = await collection.query({
        queryEmbeddings: [qEmb],
        nResults:        Math.min(limit, 20),
        include:         ['metadatas', 'documents', 'distances'],
      });
      if (!raw.ids[0]?.length) return res.json({ results: [], chartData: null, graph: { nodes: [], links: [] } });

      const results = raw.ids[0].map((id, i) => ({
        id,
        filePath:   raw.metadatas[0][i]?.filePath  || id,
        startLine:  raw.metadatas[0][i]?.startLine || 1,
        endLine:    raw.metadatas[0][i]?.endLine   || 1,
        description:raw.metadatas[0][i]?.description || '',
        lang:       extToLang(extname(raw.metadatas[0][i]?.filePath || '')),
        content:    raw.documents[0][i] || '',
        similarity: Math.max(0, Math.min(100, (1 - (raw.distances[0][i] || 0)) * 100)),
      }));

      res.json({ results, chartData: buildChartData(results), graph: buildGraphData(results) });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/explain', async (req, res) => {
    const { code, filePath } = req.body;
    if (!code) return res.status(400).json({ error: 'code required' });
    if (!groq) return res.json({ explanation: 'AI disabled — set GROQ_API_KEY.' });
    try {
      const resp = await groq.chat.completions.create({
        model:       process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        max_tokens:  250, temperature: 0.2,
        messages: [
          { role: 'system', content: 'Expert code analyst. Concise developer-friendly explanation. 2-3 sentences max.' },
          { role: 'user',   content: `File: ${filePath}\n\n${code.slice(0, 2500)}` },
        ],
      });
      res.json({ explanation: resp.choices[0]?.message?.content?.trim() || '—' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // SSE progress stream
  app.get('/api/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const hb = setInterval(() => res.write('data: {"type":"ping"}\n\n'), 15_000);
    if (!app._progressClients) app._progressClients = new Set();
    app._progressClients.add(res);
    req.on('close', () => { clearInterval(hb); app._progressClients?.delete(res); });
  });

  app.use((_, res) => res.status(404).json({ error: 'Not found' }));
  app.use((err, _req, res, _next) => res.status(500).json({ error: err.message }));

  app.listen(port, () => {
    console.log(chalk.dim(`\n  · Dashboard → http://localhost:${port}`));
    console.log(chalk.dim(`  · API       → http://localhost:${port}/api/health\n`));
  });
  return app;
}

export function emitProgress(app, payload) {
  if (!app?._progressClients?.size) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const c of app._progressClients) c.write(data);
}