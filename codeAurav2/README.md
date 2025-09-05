# Code Aura 🔍✨

A powerful CLI tool for semantic code search and exploration using AI-powered embeddings and GROQ's lightning-fast inference.

![Code Aura](https://img.shields.io/badge/Code-Aura-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge)
![GROQ](https://img.shields.io/badge/GROQ-API-orange?style=for-the-badge)

## Features

- **Semantic Code Search**: Find code using natural language queries
- **AI-Powered Explanations**: Get detailed explanations of code snippets
- **Visualization**: Generate HTML and image visualizations of search results
- **Multi-language Support**: Works with JavaScript, TypeScript, Python, Java, C++, and more
- **Smart Chunking**: Intelligent code splitting for better search results

## Installation

```bash
npm install -g code-aura
```

Or use directly with npx:

```bash
npx code-aura@latest <command>
```

## Quick Start

1. **Get a GROQ API Key**:
   - Visit [console.groq.com](https://console.groq.com)
   - Sign up and get your free API key

2. **Setup your codebase**:
   ```bash
   code-aura setup /path/to/your/codebase
   ```

3. **Search your code**:
   ```bash
   code-aura search
   ```

## Usage

### Setup a Codebase
```bash
code-aura setup /path/to/your/project
```

### Semantic Search
```bash
code-aura search
```

### Generate HTML Visualization
```bash
code-aura html "your search query"
```

### Explain a File
```bash
code-aura explain path/to/file.js
```

### Debug Information
```bash
code-aura debug
```

### Clear Cache
```bash
code-aura clear
```

## Commands

- `setup <path>` - Process a codebase for semantic search
- `search` - Interactive semantic search
- `html <query>` - Generate HTML visualization for a query
- `explain <file>` - Get explanation of a specific file
- `debug` - Show debug information
- `clear` - Clear cached data
- `reprocess` - Reprocess codebase with improved chunking

## API Key Setup

The tool will automatically prompt you for your GROQ API key on first run. You can:

1. Enter it interactively when prompted
2. Create a `.env` file with `GROQ_API_KEY=your_key_here`
3. Set it as an environment variable

## Supported Languages

- JavaScript/TypeScript (.js, .jsx, .ts, .tsx)
- Python (.py)
- Java (.java)
- C/C++ (.c, .cpp, .h, .hpp)
- Ruby (.rb)
- Go (.go)
- Rust (.rs)
- PHP (.php)
- C# (.cs)

## How It Works

1. **Code Processing**: Splits your code into semantic chunks
2. **Embedding Generation**: Creates vector embeddings for each chunk
3. **Semantic Search**: Uses cosine similarity to find relevant code
4. **AI Explanation**: Leverages GROQ's LLM for intelligent code explanations

## Performance

- Fast processing with optimized chunking
- Efficient similarity search
- Low memory footprint
- Quick response times with GROQ's accelerated inference

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this tool for your projects!

## Support

For issues and questions:
- GitHub Issues: [github.com/harjas-romana/codeAura](https://github.com/harjas-romana/codeAura)
- LinkedIn: [Harjas Singh](https://www.linkedin.com/in/harjas04)

## Star History

If you find this tool useful, please give it a star ⭐ on GitHub!

---

**Developed by Harjas Singh**  
[LinkedIn](https://www.linkedin.com/in/harjas04) | [GitHub](https://github.com/harjas-romana)
```