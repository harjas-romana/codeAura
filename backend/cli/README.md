# CodeAura - Visual Codebase Semantic Search & Explorer

A powerful CLI tool for semantic codebase search that understands the meaning of your code, not just keywords. Built with free models and designed to work offline.

## Features

- 🔍 **Semantic Search**: Find code by meaning, not just text matching
- 🧠 **AI-Powered**: Uses HuggingFace models and GROQ API for intelligent search
- 🚀 **Fast & Local**: Works offline with local embedding models
- 📊 **Visual Explorer**: Web interface with code relationship graphs
- 🎯 **Smart Chunking**: Intelligent code splitting for better context
- 💡 **Code Explanations**: AI-powered code analysis and explanations

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd codeAura/backend/cli

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 2. Configuration

Edit `.env` file with your API keys (optional but recommended):

```bash
# Get free GROQ API key at https://console.groq.com/
GROQ_API_KEY=your_groq_api_key_here

# Optional: Get free HuggingFace API key at https://huggingface.co/settings/tokens
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
```

### 3. Usage

#### Basic Search
```bash
# Index and search a project
node src/index.js /path/to/your/project -p "show me authentication logic"

# Start web server
node src/index.js /path/to/your/project -s

# Force re-index
node src/index.js /path/to/your/project --force
```

#### Advanced Usage
```bash
# Debug mode with verbose output
node src/index.js /path/to/your/project -p "find error handling" --debug

# Custom server port
node src/index.js /path/to/your/project -s --port 8080

# Help
node src/index.js --help
```

## How It Works

1. **Indexing**: Scans your codebase and creates semantic embeddings
2. **Chunking**: Intelligently splits code into meaningful chunks
3. **Embedding**: Uses local models (Xenova) or HuggingFace API
4. **Storage**: Stores embeddings in ChromaDB (local or in-memory)
5. **Search**: Semantic similarity search with AI-enhanced queries
6. **Display**: Beautiful terminal output with syntax highlighting

## Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | - | GROQ API key for AI features |
| `HUGGINGFACE_API_KEY` | - | HuggingFace API key (optional) |
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | Embedding model |
| `LOCAL_EMBEDDING_MODEL` | `Xenova/all-MiniLM-L6-v2` | Local embedding model |
| `USE_LOCAL_EMBEDDINGS` | `true` | Use local models (free) |
| `CHUNK_SIZE` | `1000` | Code chunk size |
| `CHUNK_OVERLAP` | `150` | Overlap between chunks |
| `MAX_FILE_SIZE_MB` | `1` | Maximum file size to process |

## Supported File Types

- JavaScript/TypeScript (`.js`, `.jsx`, `.ts`, `.tsx`)
- Python (`.py`)
- Java (`.java`)
- C/C++ (`.c`, `.cpp`, `.h`)
- Go (`.go`)
- Ruby (`.rb`)
- PHP (`.php`)
- Rust (`.rs`)
- Swift (`.swift`)
- Kotlin (`.kt`)
- HTML/CSS (`.html`, `.css`, `.scss`)
- Vue/Svelte (`.vue`, `.svelte`)
- Markdown (`.md`)
- JSON/YAML (`.json`, `.yml`, `.yaml`)

## Examples

### Search Examples
```bash
# Find authentication logic
node src/index.js . -p "where is user authentication handled"

# Find error handling
node src/index.js . -p "show me error handling patterns"

# Find database operations
node src/index.js . -p "find database queries and connections"

# Find API endpoints
node src/index.js . -p "show me REST API routes and handlers"
```

### Web Interface
```bash
# Start web server
node src/index.js . -s

# Open http://localhost:3000 in your browser
```

## Troubleshooting

### Common Issues

1. **ChromaDB Connection Error**
   - The tool will automatically fall back to in-memory mode
   - No action needed, it will work fine

2. **Embedding Generation Failed**
   - Check your internet connection
   - Verify HuggingFace API key if using API mode
   - Local models should work offline

3. **No Results Found**
   - Try different search terms
   - Check if files are in supported formats
   - Use `--debug` flag for more information

### Performance Tips

- Use `--force` to re-index if code changes significantly
- Increase `CHUNK_SIZE` for better context (but slower processing)
- Use local models for faster processing
- Limit `MAX_FILE_SIZE_MB` for large codebases

## Development

### Project Structure
```
src/
├── index.js          # Main CLI entry point
├── indexer.js        # Code indexing and embedding
├── terminal-search.js # Terminal search interface
└── server.js         # Web server interface
```

### Adding New Features
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions:
1. Check the troubleshooting section
2. Open an issue on GitHub
3. Check the debug output with `--debug` flag

---

**Happy Coding! 🚀**