# CodeAura v3

> Hybrid semantic + keyword search engine for your codebase. Built for developers who need answers, not suggestions.

[![npm version](https://img.shields.io/npm/v/code-aura?style=flat-square&color=00ff88&labelColor=000)](https://www.npmjs.com/package/code-aura)
[![npm downloads](https://img.shields.io/npm/dm/code-aura?style=flat-square&color=00ff88&labelColor=000)](https://www.npmjs.com/package/code-aura)

```bash
npm install -g code-aura
```

-----

## What’s New in v3

v3 is a ground-up rewrite of the search and indexing pipeline. The old single-pass cosine search is gone. In its place: a four-layer ranking system, parent-document retrieval, parallel incremental indexing, and a live chart dashboard.

|          |v2                                  |v3                                      |
|----------|------------------------------------|----------------------------------------|
|Search    |Cosine only                         |BM25 + Cosine + RRF + LLM re-rank       |
|Indexing  |Sequential, full re-index every time|Parallel (p-limit), MD5 diffing         |
|Chunking  |Flat equal-size chunks              |Parent-child hierarchy                  |
|Embeddings|One per API call                    |Batched (24/call), auto-fallback        |
|Output    |Terminal text                       |Terminal + HTML export + Chart dashboard|
|Watch mode|✗                                   |chokidar hot-reload                     |
|Chat      |✗                                   |Full conversation with vector context   |

-----

## How the Search Pipeline Works

```
query
  │
  ├─ 1. ChromaDB cosine similarity   →  top-k semantic candidates
  ├─ 2. BM25 re-rank                 →  keyword-aware reorder
  │      (camelCase/snake_case aware tokenization)
  ├─ 3. Reciprocal Rank Fusion       →  fuses both ranked lists
  └─ 4. LLM cross-encoder re-rank   →  llama-3.3-70b final pass
            │
            └─ parent-doc retrieval  →  child matched → parent returned
```

Each layer is additive. BM25 catches exact token matches that cosine misses. RRF is the same fusion approach used in enterprise search systems — no arbitrary score weighting. The LLM re-ranker does a final cross-encoder-style pass so the top result is actually the top result.

-----

## Installation

```bash
# Global install
npm install -g code-aura

# Or run directly
npx code-aura@latest <command>
```

**Requirements:**

- Node.js 18+
- A [Groq API key](https://console.groq.com) (free tier works)
- Optional: ChromaDB running locally or remotely for persistent vector storage

-----

## Quick Start

```bash
# 1. Index your codebase
codeaura setup ./your-project

# 2. Search it
codeaura search "handle authentication errors"

# 3. Open the chart dashboard
codeaura serve
```

On first run you’ll be prompted for your Groq API key. Or set it in `.env`:

```
GROQ_API_KEY=your_key_here
```

-----

## Commands

```
codeaura setup <path>          Index a codebase. Incremental on repeat runs.
codeaura search                Interactive hybrid search with terminal UI.
codeaura search "<query>"      Direct query, skips interactive prompt.
codeaura chat                  Conversational mode grounded in your codebase.
codeaura serve                 Launch the Chart.js + D3 dashboard on localhost.
codeaura watch                 Hot-reload indexer via chokidar.
codeaura stats                 File count, chunk count, language breakdown, cache status.
codeaura export "<query>"      One-shot export to HTML / Markdown / JSON.
```

-----

## Indexing

### Incremental MD5 Diffing

File hashes are stored in `.codeaura-hashes.json`. On every subsequent `setup` run, only files whose content has actually changed are re-indexed.

```
First run  (5,000 files):  ~4 min
After edit (3 files changed):  ~3 sec
```

### Parallel Processing

8 files processed concurrently by default. Configurable:

```bash
FILE_CONCURRENCY=16 codeaura setup ./project
```

### Batch Embeddings

Sends 24 chunks per HuggingFace API call instead of one-by-one. Exponential backoff with ±30% jitter on 429/503. Falls back to a local 384-d embedding if HuggingFace is unavailable — with structural signals (async density, nesting depth, import count, etc.) and a SHA-256 uniqueness fingerprint in dims 360–383.

### Parent-Child Chunking

```
parent block  (1200 tokens)  ←  what you see in results
    └── child chunk (350 tokens)  ←  what gets embedded and matched
    └── child chunk (350 tokens)
    └── child chunk (350 tokens)
```

Children are what the vector index sees. When a child matches, its parent is surfaced — so you always get a complete, readable block of code, never a fragment.

-----

## Chat Mode

```bash
codeaura chat
```

Every message triggers a hybrid search to pull relevant code from your codebase. That code is injected into the LLM system prompt so answers are grounded in your actual implementation, not general knowledge.

- Model: `llama-3.3-70b-versatile`
- Context: last 8 turns in-session, last 40 turns persisted to `.code-aura-chat.json`

-----

## Dashboard

```bash
codeaura serve
# → http://localhost:3000
```

Five live Chart.js charts:

- **Horizontal bar** — similarity scores per result, color-coded by match quality
- **Doughnut** — language distribution across your codebase
- **Bubble** — hotspot map: file × line number × match strength
- **Radar** — code pattern profile (functions, async, error handling, etc.) for top 4 results
- **Line** — relevance score curve across all results

Plus a D3 force-directed dependency graph — nodes sized by similarity score, colored by language, clickable to open code view, with real import-chain link detection.

Live indexing progress is pushed to the dashboard via SSE (`/api/progress`) — no polling.

-----

## Export

```bash
codeaura export "authentication flow"
# → Prompts: HTML / Markdown / JSON

codeaura export "authentication flow" --format html
# → Non-interactive
```

HTML export includes embedded Chart.js similarity bars and a language doughnut. No external image generation.

-----

## Watch Mode

```bash
codeaura watch
```

chokidar watches your project root. File save → only that file is re-indexed. Everything else stays warm.

-----

## Code Structure Extraction

For each indexed file, CodeAura extracts and stores as ChromaDB metadata:

- Functions, classes, imports, exports
- HTTP route handlers
- React hooks
- Async patterns

Supported: JavaScript, TypeScript, Python, Go, Rust, Ruby, PHP, Kotlin, Scala.

-----

## ChromaDB Fallback Chain

```
1. Remote URL (CHROMA_URL env var)
2. localhost:8000
3. In-memory (no persistence)
```

Each tier is tested with `heartbeat()` before use. In-memory mode works for single-session search without any external dependencies.

-----

## Environment Variables

```bash
GROQ_API_KEY=            # Required. Groq inference API.
HF_API_KEY=              # Optional. HuggingFace embeddings.
CHROMA_URL=              # Optional. Remote ChromaDB endpoint.
FILE_CONCURRENCY=8       # Parallel file workers (default: 8).
HF_BATCH_SIZE=24         # Embedding batch size (default: 24).
DESCRIBE_RATIO=0.25      # Fraction of chunks that get LLM descriptions (default: 25%).
```

-----

## Supported Languages

JavaScript · TypeScript · Python · Go · Rust · Ruby · PHP · Kotlin · Scala · Java · C · C++ · C#

-----

## Contributing

```bash
git clone https://github.com/harjas-romana/codeAura
cd codeAura
npm install
```

Issues and pull requests are open. If you’re adding a new ranking layer or language extractor, open an issue first so we can align on the interface.

-----

## License

MIT — [Harjas Singh](https://github.com/harjas-romana)