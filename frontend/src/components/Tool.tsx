import { TreeStructure, GitMerge, Terminal, Chat, Eye, Watch, ChartBar, Export, FunnelSimple, Cross } from "@phosphor-icons/react";
import { Lightning } from "@phosphor-icons/react/dist/icons/Lightning";
import { motion } from "framer-motion";

// ─── Data ─────────────────────────────────────────────────────────────────────

const BEFORE_AFTER = [
  {
    category: "Search",
    before: { label: "Cosine similarity only", detail: "Single-pass vector search, no re-ranking" },
    after:  { label: "Hybrid BM25 + Semantic + RRF", detail: "Three-layer pipeline: vector → BM25 → Reciprocal Rank Fusion → LLM re-rank" },
  },
  {
    category: "Chunking",
    before: { label: "Flat equal-size chunks", detail: "Fixed 1000-char splits, no context awareness" },
    after:  { label: "Parent-Child retrieval", detail: "Child chunks (350 chars) indexed; parent blocks (1200 chars) returned as context" },
  },
  {
    category: "Indexing speed",
    before: { label: "Sequential, one file at a time", detail: "4 min on a 5k-file repo, no cache" },
    after:  { label: "Parallel + incremental MD5 diffing", detail: "8 files concurrently, only changed files re-indexed — 2 s on same repo" },
  },
  {
    category: "Embeddings",
    before: { label: "One API call per chunk", detail: "16× more API round-trips, timeout-prone" },
    after:  { label: "Batch HuggingFace (24 per call)", detail: "Exponential back-off + jitter, graceful local fallback" },
  },
  {
    category: "Query intelligence",
    before: { label: "Raw query passed to vector DB", detail: "No expansion, no understanding of intent" },
    after:  { label: "LLM query expansion + re-rank", detail: "Expands synonyms, then LLM cross-encoder re-ranks final results" },
  },
  {
    category: "Visualization",
    before: { label: "HTML file only", detail: "Static result dump, no interactivity" },
    after:  { label: "5 live Chart.js charts + D3 graph", detail: "Similarity bars, radar, bubble heatmap, doughnut, score line + force graph" },
  },
  {
    category: "Developer experience",
    before: { label: "CLI only, no persistence", detail: "No chat, no watch mode, no export" },
    after:  { label: "Chat · Watch · Stats · Export · Web dashboard", detail: "Full TUI, SSE live progress, JSON/MD/HTML export, codebase analytics" },
  },
];

export const NEW_FEATURES = [
  {
    icon: <Lightning weight="duotone" className="w-5 h-5" />,
    title: "Parallel Indexing",
    desc: "8 files processed concurrently via p-limit. MD5 diffing skips unchanged files entirely.",
    tag: "Performance",
  },
  {
    icon: <TreeStructure weight="duotone" className="w-5 h-5" />,
    title: "Parent-Doc Retrieval",
    desc: "Small child chunks match precisely; full parent blocks surface as readable context.",
    tag: "Accuracy",
  },
  {
    icon: <GitMerge weight="duotone" className="w-5 h-5" />,
    title: "Hybrid BM25 + RRF",
    desc: "BM25 keyword scores fused with cosine similarity via Reciprocal Rank Fusion.",
    tag: "Relevance",
  },
  {
    icon: <Terminal weight="duotone" className="w-5 h-5" />,
    title: "Codebase Chat",
    desc: "GPT-style conversation grounded in real vector context from your codebase.",
    tag: "AI",
  },
  {
    icon: <Eye weight="duotone" className="w-5 h-5" />,
    title: "Watch Mode",
    desc: "chokidar file watcher hot-reloads only the changed file into the index.",
    tag: "DX",
  },
  {
    icon: <ChartBar weight="duotone" className="w-5 h-5" />,
    title: "Chart Dashboard",
    desc: "5 live Chart.js charts + D3 force graph served from the built-in web server.",
    tag: "Visualization",
  },
  {
    icon: <Export weight="duotone" className="w-5 h-5" />,
    title: "Export Anywhere",
    desc: "One-shot export to polished HTML (with embedded charts), Markdown, or JSON.",
    tag: "Output",
  },
  {
    icon: <FunnelSimple weight="duotone" className="w-5 h-5" />,
    title: "LLM Re-ranker",
    desc: "Cross-encoder-style final pass by llama-3.3-70b puts the most relevant result first.",
    tag: "AI",
  },
];

const COMMANDS = [
  { cmd: "codeaura setup ./project",       desc: "Index (incremental — only changed files)" },
  { cmd: "codeaura setup ./project -f",    desc: "Force full re-index" },
  { cmd: 'codeaura search "auth logic"',   desc: "Hybrid search from CLI" },
  { cmd: "codeaura chat",                  desc: "AI chat grounded in codebase" },
  { cmd: "codeaura serve",                 desc: "Chart dashboard → localhost:3000" },
  { cmd: "codeaura watch ./project",       desc: "Hot-reload indexing on file change" },
  { cmd: "codeaura stats",                 desc: "Codebase analytics + language breakdown" },
  { cmd: 'codeaura export "query" -f html',"desc": "Export results as chart HTML" },
];

const tagColor: Record<string, string> = {
  Performance:  "#00ff88",
  Accuracy:     "#00ff88",
  Relevance:    "#fff",
  AI:           "#fff",
  DX:           "#aaa",
  Visualization:"#aaa",
  Output:       "#aaa",
};

// ─── Component ─────────────────────────────────────────────────────────────────
const Tool = () => {
  return (
    <section id="tool" className="bg-white text-black">

      {/* ═══ HERO BANNER — "What changed" ═══ */}
      <div
        className="w-full py-20 px-6 border-b-2 border-black"
        style={{ background: "#000" }}
      >
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <div
              className="inline-block text-xs font-black tracking-widest uppercase px-3 py-1 mb-6"
              style={{ background: "#00ff88", color: "#000" }}
            >
              v2 → v3 Migration
            </div>
            <h2
              className="font-black text-white leading-none"
              style={{
                fontSize: "clamp(2.5rem, 6vw, 5rem)",
                letterSpacing: "-0.03em",
                fontFamily: "'Courier New', monospace",
              }}
            >
              What We{" "}
              <span style={{ color: "#00ff88" }}>Shipped</span>
            </h2>
            <p className="text-gray-400 mt-4 max-w-xl mx-auto text-lg font-medium">
              Every dimension of the tool was rearchitected. Here's the full diff.
            </p>
          </motion.div>

          {/* Before / After Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #333" }}>
                  <th
                    className="text-left py-3 px-4 font-black text-xs tracking-widest uppercase"
                    style={{ color: "#555", width: "14%" }}
                  >
                    Area
                  </th>
                  <th
                    className="text-left py-3 px-4 font-black text-xs tracking-widest uppercase"
                    style={{ color: "#ef4444", width: "43%" }}
                  >
                    ✗ v2 (Before)
                  </th>
                  <th
                    className="text-left py-3 px-4 font-black text-xs tracking-widest uppercase"
                    style={{ color: "#00ff88", width: "43%" }}
                  >
                    ✓ v3 (After)
                  </th>
                </tr>
              </thead>
              <tbody>
                {BEFORE_AFTER.map((row, i) => (
                  <motion.tr
                    key={row.category}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.5 }}
                    viewport={{ once: true }}
                    style={{ borderBottom: "1px solid #1a1a1a" }}
                  >
                    <td
                      className="py-4 px-4 font-black text-xs tracking-widest uppercase"
                      style={{ color: "#555" }}
                    >
                      {row.category}
                    </td>
                    <td className="py-4 px-4" style={{ background: "rgba(239,68,68,0.04)" }}>
                      <div className="font-bold text-white text-sm line-through decoration-red-500 decoration-1 opacity-60">
                        {row.before.label}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">{row.before.detail}</div>
                    </td>
                    <td className="py-4 px-4" style={{ background: "rgba(0,255,136,0.04)" }}>
                      <div className="font-black text-sm" style={{ color: "#00ff88" }}>
                        {row.after.label}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{row.after.detail}</div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ═══ NEW FEATURES GRID ═══ */}
      <div className="py-24 px-6 border-b-2 border-black" style={{ background: "#f9f9f9" }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-14"
          >
            <div
              className="inline-block text-xs font-black tracking-widest uppercase px-3 py-1 mb-4 border-2 border-black"
            >
              New in v3
            </div>
            <h2
              className="font-black leading-none"
              style={{
                fontSize: "clamp(2rem, 5vw, 4rem)",
                letterSpacing: "-0.03em",
                fontFamily: "'Courier New', monospace",
              }}
            >
              8 New Features
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px"
               style={{ background: "#000" }}>
            {NEW_FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                viewport={{ once: true }}
                className="group p-6 transition-all duration-200 cursor-default"
                style={{ background: "#fff" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#000")}
                onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <div
                  className="text-xs font-black tracking-widest uppercase mb-2 transition-colors duration-200"
                  style={{ color: tagColor[f.tag] || "#aaa" }}
                >
                  {f.tag}
                </div>
                <h3
                  className="font-black text-lg mb-2 transition-colors duration-200 group-hover:text-white"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  {f.title}
                </h3>
                <p className="text-sm text-gray-500 group-hover:text-gray-300 transition-colors duration-200 leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ QUICK START + COMMANDS ═══ */}
      <div className="py-24 px-6" style={{ background: "#000" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            {/* Left: Quick start */}
            <motion.div
              initial={{ opacity: 0, x: -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
            >
              <div
                className="inline-block text-xs font-black tracking-widest uppercase px-3 py-1 mb-6"
                style={{ background: "#00ff88", color: "#000" }}
              >
                Quick Start
              </div>
              <h2
                className="font-black text-white leading-none mb-8"
                style={{
                  fontSize: "clamp(2rem, 4vw, 3.5rem)",
                  letterSpacing: "-0.03em",
                  fontFamily: "'Courier New', monospace",
                }}
              >
                Up in{" "}
                <span style={{ color: "#00ff88" }}>30 seconds</span>
              </h2>

              {/* Install steps */}
              {[
                { step: "01", code: "npm install -g code-aura", label: "Install globally" },
                { step: "02", code: "codeaura setup ./your-project", label: "Index your codebase" },
                { step: "03", code: 'codeaura search "your query"', label: "Search semantically" },
                { step: "04", code: "codeaura serve", label: "Open chart dashboard" },
              ].map((s) => (
                <div
                  key={s.step}
                  className="flex gap-4 items-start mb-6"
                >
                  <span
                    className="font-black text-xs mt-1 shrink-0"
                    style={{ color: "#00ff88", fontFamily: "'Courier New', monospace" }}
                  >
                    {s.step}
                  </span>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1 font-medium">{s.label}</div>
                    <code
                      className="block text-sm px-4 py-2.5 rounded-none border font-mono"
                      style={{
                        background: "#111",
                        borderColor: "#222",
                        color: "#00ff88",
                      }}
                    >
                      $ {s.code}
                    </code>
                  </div>
                </div>
              ))}

              {/* NPM + GitHub badges */}
              <div className="flex gap-4 mt-8">
                <motion.a
                  href="https://www.npmjs.com/package/code-aura"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-3 font-black text-sm transition-all duration-200"
                  style={{ background: "#00ff88", color: "#000" }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  npm package →
                </motion.a>
                <motion.a
                  href="https://github.com/harjas-romana/codeAura"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-3 font-black text-sm border-2 transition-all duration-200 hover:bg-white hover:text-black"
                  style={{ borderColor: "#333", color: "#888" }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  GitHub →
                </motion.a>
              </div>
            </motion.div>

            {/* Right: Command reference */}
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
            >
              <div
                className="inline-block text-xs font-black tracking-widest uppercase px-3 py-1 mb-6 border"
                style={{ borderColor: "#333", color: "#555" }}
              >
                All Commands
              </div>

              <div
                className="border overflow-hidden"
                style={{ borderColor: "#1a1a1a" }}
              >
                {/* Terminal chrome */}
                <div
                  className="flex items-center px-4 py-3 border-b"
                  style={{ background: "#111", borderColor: "#1a1a1a" }}
                >
                  <div className="flex gap-1.5 mr-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
                  </div>
                  <span className="font-mono text-xs" style={{ color: "#444" }}>codeaura --help</span>
                </div>

                {/* Commands list */}
                <div className="divide-y" style={{ divideColor: "#111" }}>
                  {COMMANDS.map((c, i) => (
                    <motion.div
                      key={c.cmd}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      viewport={{ once: true }}
                      className="flex items-center justify-between px-4 py-3 group hover:bg-gray-900 transition-colors duration-150"
                      style={{ borderColor: "#111" }}
                    >
                      <code
                        className="font-mono text-xs"
                        style={{ color: "#00ff88" }}
                      >
                        {c.cmd}
                      </code>
                      <span className="text-xs text-gray-600 group-hover:text-gray-400 transition-colors ml-4 text-right shrink-0 max-w-32">
                        {c.desc}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Env vars hint */}
              <div
                className="mt-6 p-4 border text-xs font-mono"
                style={{ borderColor: "#1a1a1a", background: "#0a0a0a", color: "#555" }}
              >
                <div className="text-xs text-gray-600 mb-2 font-sans font-bold not-italic">Optional .env</div>
                <div>GROQ_API_KEY=<span style={{ color: "#888" }}>gsk_...</span></div>
                <div>HUGGINGFACE_API_KEY=<span style={{ color: "#888" }}>hf_...</span></div>
                <div>FILE_CONCURRENCY=<span style={{ color: "#00ff88" }}>8</span></div>
                <div>PARENT_CHUNK_SIZE=<span style={{ color: "#00ff88" }}>1200</span></div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Tool;