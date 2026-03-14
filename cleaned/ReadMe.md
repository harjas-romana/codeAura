# CodeAura v3.1.0

**Developer velocity engine.** Hybrid BM25 + semantic code search with parent-document retrieval, parallel indexing, and AI-powered explanations.

---

## Install

```bash
npm install -g codeaura
```

Or try without installing:

```bash
npx codeaura@latest setup ./your-project
```

---

## Quick Start

```bash
# 1. First-time setup wizard
codeaura init

# 2. Or go directly
codeaura setup ./your-project
codeaura search "authentication middleware"
```

---

## Commands

| Command | Description |
|---|---|
| `codeaura init` | Interactive first-time setup wizard |
| `codeaura setup <path>` | Index a codebase (incremental) |
| `codeaura setup <path> -f` | Force full re-index |
| `codeaura search "query"` | Hybrid BM25 + semantic search |
| `codeaura chat` | AI conversation grounded in your code |
| `codeaura serve` | Start chart dashboard at localhost:3000 |
| `codeaura watch <path>` | Hot-reload indexing on file changes |
| `codeaura diff <path>` | Preview what would be re-indexed |
| `codeaura stats` | Codebase analytics (language breakdown, file count) |
| `codeaura explain <file>` | AI explanation of any file |
| `codeaura export "query" -f html` | Export results as HTML with charts |
| `codeaura doctor` | System health check |
| `codeaura clear` | Clear index cache / chat history / API key |
| `codeaura api-key` | Manage GROQ API key |

### Search flags

```bash
codeaura search "query" --top 10        # return top 10
codeaura search "query" --no-rerank     # skip LLM re-ranking (faster)
codeaura search "query" --no-expand     # skip query expansion (faster)
codeaura search "query" --page 1        # pagination
codeaura search "query" -f markdown     # auto-export as markdown
```

---

## Configuration

Create a `.env` file in the directory where you run `codeaura`:

```env
# Required for AI features
GROQ_API_KEY=gsk_...

# Optional — real embeddings (falls back to local if not set)
HUGGINGFACE_API_KEY=hf_...

# Optional tuning
FILE_CONCURRENCY=8
PARENT_CHUNK_SIZE=1200
CHILD_CHUNK_SIZE=350
```

See `.env.example` for all options.

---

## How it works

**Indexing**
1. Scans your codebase with `fast-glob` (3-5× faster than readdir)
2. MD5 hashes every file — only changed files are re-indexed
3. Splits files into parent blocks (1200 chars) and child chunks (350 chars)
4. Embeds child chunks via HuggingFace API (batched, 24 per call) or local fallback
5. Stores in ChromaDB with full metadata (functions, classes, routes, imports)

**Search**
1. Expands your query using an LLM for better recall
2. Runs cosine similarity against all child chunk embeddings
3. Runs BM25 keyword scoring on the same candidate set
4. Fuses both rankings with Reciprocal Rank Fusion (RRF)
5. Returns the parent block (full context) for each matched child
6. Optional LLM re-ranker for final ordering

---

## Requirements

- Node.js >= 18
- ChromaDB (optional — falls back to in-memory if not running)
- GROQ API key (free at [console.groq.com](https://console.groq.com))

---

## Local Development

```bash
git clone https://github.com/harjas-romana/codeAura
cd codeAura/cleaned
chmod +x run.sh
./run.sh              # install + link + smoke test
./run.sh publish      # dry-run + publish to npm
./run.sh clean        # remove node_modules + cache
```

---

## License

MIT — built by [Harjas Singh](https://github.com/harjas-romana)