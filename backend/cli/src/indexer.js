import { ChromaClient } from 'chromadb';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { readFile, readdir, stat } from 'fs/promises';
import { createHash } from 'crypto';
import { Groq } from 'groq-sdk';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

// Configuration with fallbacks - using free models
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE) || 1000;
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP) || 150;
const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const HUGGINGFACE_MAX_RETRIES = parseInt(process.env.HUGGINGFACE_MAX_RETRIES) || 3;
const HUGGINGFACE_RETRY_DELAY = parseInt(process.env.HUGGINGFACE_RETRY_DELAY) || 2000;
const MAX_CONCURRENT_REQUESTS = parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 1;
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB) || 1;

const SUPPORTED_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', 
  '.go', '.rb', '.php', '.rs', '.swift', '.kt', '.scala', 
  '.html', '.css', '.scss', '.less', '.vue', '.svelte',
  '.md', '.txt', '.json', '.yml', '.yaml', '.xml', '.sql'
]);

// Directories to skip during indexing
const SKIP_DIRECTORIES = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage', 
  '.next', '.nuxt', 'vendor', '__pycache__', '.pytest_cache',
  'target', 'bin', 'obj', '.gradle', '.idea', '.vscode',
  'logs', 'temp', 'tmp', '.DS_Store', 'package-lock.json',
  'yarn.lock', '.env', '.env.local', '.env.production'
]);

// Initialize Groq with error handling
let groq;
try {
  if (!process.env.GROQ_API_KEY) {
    console.warn(chalk.yellow('⚠️  GROQ_API_KEY not set. Code descriptions will be disabled.'));
  } else {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      timeout: 15000
    });
  }
} catch (error) {
  console.error(chalk.red(`❌ Groq initialization failed: ${error.message}`));
}

// Cache for embeddings and descriptions with LRU behavior
class LRUCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }
  
  get(key) {
    if (!this.cache.has(key)) return undefined;
    
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }
  
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove the least recently used item
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
  
  has(key) {
    return this.cache.has(key);
  }
  
  get size() {
    return this.cache.size;
  }
  
  clear() {
    this.cache.clear();
  }
}

const embeddingCache = new LRUCache(2000);
const descriptionCache = new LRUCache(1000);

/**
 * Generate a hash for a text to use as cache key
 */
function hashText(text) {
  return createHash('md5').update(text).digest('hex');
}

/**
 * Count lines in text
 */
function countLines(text) {
  return (text.match(/\n/g) || []).length + 1;
}

/**
 * Detect programming language from file extension
 */
function detectLanguage(filePath) {
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  const languageMap = {
    '.js': 'javascript', '.jsx': 'javascript', '.ts': 'typescript', '.tsx': 'typescript',
    '.py': 'python', '.java': 'java', '.cpp': 'cpp', '.c': 'c', '.h': 'c',
    '.go': 'go', '.rb': 'ruby', '.php': 'php', '.rs': 'rust', '.swift': 'swift',
    '.kt': 'kotlin', '.scala': 'scala', '.html': 'html', '.css': 'css',
    '.scss': 'scss', '.vue': 'vue', '.svelte': 'svelte', '.md': 'markdown',
    '.sql': 'sql', '.sh': 'bash', '.yml': 'yaml', '.yaml': 'yaml',
    '.json': 'json', '.xml': 'xml'
  };
  return languageMap[ext] || 'text';
}

/**
 * Extract meaningful chunks from code with better context awareness
 */
function extractCodeChunks(filePath, content) {
  const chunks = [];
  const language = detectLanguage(filePath);
  
  if (content.length <= CHUNK_SIZE) {
    // For small files, use the entire content as one chunk
    const startLine = 1;
    const endLine = countLines(content);
    
    chunks.push({
      content: content.trim(),
      filePath,
      language,
      startLine,
      endLine,
      size: content.length
    });
    
    return chunks;
  }
  
  let start = 0;
  
  // Language-specific break patterns
  const getBreakPatterns = (lang) => {
    const common = ['\n\n', ';\n', '}\n', '{\n'];
    const patterns = {
      javascript: [...common, '\nfunction', '\nclass', '\nconst', '\nlet', '\nvar', '\nexport', '\nimport'],
      typescript: [...common, '\nfunction', '\nclass', '\ninterface', '\ntype', '\nexport', '\nimport'],
      python: ['\n\n', '\ndef ', '\nclass ', '\nif __name__', '\nimport ', '\nfrom '],
      java: [...common, '\npublic ', '\nprivate ', '\nprotected ', '\nclass ', '\ninterface'],
      go: [...common, '\nfunc ', '\ntype ', '\nvar ', '\nconst ', '\npackage '],
      default: common
    };
    return patterns[lang] || patterns.default;
  };
  
  const breakPatterns = getBreakPatterns(language);
  
  // Simple chunking with overlap and smart breaking
  while (start < content.length) {
    const end = Math.min(start + CHUNK_SIZE, content.length);
    let chunk = content.substring(start, end);
    
    // Find natural break point
    let breakPoint = chunk.length;
    for (const pattern of breakPatterns) {
      const pos = chunk.lastIndexOf(pattern);
      if (pos > CHUNK_SIZE * 0.6 && pos < CHUNK_SIZE) {
        breakPoint = pos + pattern.length;
        break;
      }
    }
    
    // If no good break found, try to break at word boundary
    if (breakPoint === chunk.length && end < content.length) {
      const spacePos = chunk.lastIndexOf(' ');
      const newlinePos = chunk.lastIndexOf('\n');
      breakPoint = Math.max(spacePos, newlinePos);
      if (breakPoint < CHUNK_SIZE * 0.5) {
        breakPoint = chunk.length;
      }
    }
    
    const finalChunk = chunk.substring(0, breakPoint).trim();
    
    if (finalChunk.length > 50) { // Only add substantial chunks
      const startLine = countLines(content.substring(0, start)) + 1;
      const endLine = countLines(content.substring(0, start + finalChunk.length));
      
      chunks.push({
        content: finalChunk,
        filePath,
        language,
        startLine,
        endLine,
        size: finalChunk.length
      });
    }
    
    start += Math.max(breakPoint - CHUNK_OVERLAP, 1);
    if (start >= content.length) break;
  }
  
  return chunks;
}

/**
 * Generate embedding for a text chunk using HuggingFace API
 */
async function generateEmbedding(text) {
  const textHash = hashText(text);
  
  // Check cache first
  const cached = embeddingCache.get(textHash);
  if (cached) {
    return cached;
  }
  
  // Use HuggingFace API for embeddings with better error handling
  if (process.env.HUGGINGFACE_API_KEY) {
    let retries = 0;
    
    while (retries < HUGGINGFACE_MAX_RETRIES) {
      try {
        // Limit text length to prevent API issues
        const limitedText = text.substring(0, 512);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(
          `https://api-inference.huggingface.co/models/${EMBEDDING_MODEL}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify({ 
              inputs: limitedText
            }),
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        
        if (response.status === 401) {
          throw new Error('Authentication failed. Please check your HUGGINGFACE_API_KEY');
        }
        
        if (response.status === 404) {
          throw new Error(`Model ${EMBEDDING_MODEL} not found or not accessible with your API key`);
        }
        
        if (response.status === 503) {
          console.warn(chalk.yellow(`⚠️  Model ${EMBEDDING_MODEL} is loading, retrying...`));
          retries++;
          await new Promise(resolve => setTimeout(resolve, HUGGINGFACE_RETRY_DELAY * retries));
          continue;
        }
        
        if (response.status === 429) {
          console.warn(chalk.yellow(`⚠️  Rate limited, retrying in ${HUGGINGFACE_RETRY_DELAY}ms...`));
          retries++;
          await new Promise(resolve => setTimeout(resolve, HUGGINGFACE_RETRY_DELAY * retries));
          continue;
        }
        
        if (response.status === 400) {
          console.warn(chalk.yellow(`⚠️  Bad request, using fallback embedding for text: ${limitedText.substring(0, 50)}...`));
          break; // Use fallback for bad requests
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Handle different response formats
        let embedding;
        if (Array.isArray(result)) {
          embedding = Array.isArray(result[0]) ? result[0] : result;
        } else if (result.embeddings) {
          embedding = result.embeddings[0];
        } else if (result[0] && result[0].embedding) {
          embedding = result[0].embedding;
        } else if (result.embedding) {
          embedding = result.embedding;
        } else {
          throw new Error('Unexpected response format from HuggingFace API');
        }
        
        if (!Array.isArray(embedding) || embedding.length === 0) {
          throw new Error('Invalid embedding format received from API');
        }
        
        embeddingCache.set(textHash, embedding);
        return embedding;
        
      } catch (error) {
        retries++;
        if (error.name === 'AbortError') {
          console.error(chalk.red(`❌ Embedding generation timed out, attempt ${retries}/${HUGGINGFACE_MAX_RETRIES}`));
        } else {
          console.error(chalk.red(`❌ Embedding generation attempt ${retries}/${HUGGINGFACE_MAX_RETRIES} failed: ${error.message}`));
        }
        
        if (retries >= HUGGINGFACE_MAX_RETRIES) {
          console.error(chalk.red('❌ All embedding attempts failed, using fallback'));
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, HUGGINGFACE_RETRY_DELAY * Math.pow(2, retries - 1)));
      }
    }
  }
  
  // Enhanced fallback embedding method
  console.log(chalk.yellow('⚠️  Using enhanced fallback embedding method'));
  return generateFallbackEmbedding(text);
}


/**
 * Generate fallback embedding using enhanced method
 */
function generateFallbackEmbedding(text) {
  // Extract meaningful features from the text
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !/^\d+$/.test(word)); // Filter out short words and numbers
  
  // Create word frequency map
  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  // Extract programming keywords and patterns
  const programmingKeywords = [
    'function', 'class', 'method', 'variable', 'constant', 'import', 'export',
    'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'try', 'catch',
    'async', 'await', 'promise', 'callback', 'event', 'handler', 'listener',
    'component', 'props', 'state', 'hook', 'effect', 'context', 'provider',
    'router', 'route', 'middleware', 'controller', 'service', 'model', 'schema',
    'database', 'query', 'mutation', 'subscription', 'api', 'endpoint', 'request',
    'response', 'error', 'exception', 'validation', 'authentication', 'authorization',
    'session', 'token', 'cookie', 'header', 'body', 'status', 'code'
  ];
  
  const keywordCount = {};
  programmingKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) {
      keywordCount[keyword] = matches.length;
    }
  });
  
  // Create a 384-dimensional embedding using multiple features
  const embedding = Array(384).fill(0);
  
  // Word frequency features (first 256 dimensions)
  Object.keys(wordCount).forEach(word => {
    const hash = createHash('md5').update(word).digest('hex');
    const index = parseInt(hash.substring(0, 8), 16) % 256;
    embedding[index] += wordCount[word];
  });
  
  // Programming keyword features (next 64 dimensions)
  Object.keys(keywordCount).forEach(keyword => {
    const hash = createHash('md5').update(keyword).digest('hex');
    const index = 256 + (parseInt(hash.substring(0, 8), 16) % 64);
    embedding[index] += keywordCount[keyword];
  });
  
  // Text structure features (last 64 dimensions)
  const lines = text.split('\n').length;
  const chars = text.length;
  const totalWords = text.split(/\s+/).length;
  
  embedding[320] = Math.min(lines / 100, 1); // Normalized line count
  embedding[321] = Math.min(chars / 1000, 1); // Normalized character count
  embedding[322] = Math.min(totalWords / 100, 1); // Normalized word count
  
  // Add some randomness based on text content for uniqueness
  const contentHash = createHash('md5').update(text).digest('hex');
  for (let i = 323; i < 384; i++) {
    const hashIndex = (i - 323) * 2;
    const hashValue = parseInt(contentHash.substring(hashIndex, hashIndex + 2), 16);
    embedding[i] = (hashValue / 255) * 0.1; // Small random component
  }
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }
  
  return embedding;
}

/**
 * Generate enhanced semantic description of code using Groq API
 */
async function generateCodeDescription(code, filePath, language) {
  const cacheKey = hashText(code + filePath);
  
  // Check cache first
  const cached = descriptionCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // If Groq is not available, return a basic description
  if (!groq) {
    return `Code from ${filePath} (${language})`;
  }
  
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert code analyst. Analyze the provided ${language} code and generate a concise semantic description focusing on:
1. Primary purpose and functionality
2. Key components, functions, or classes
3. Data flow or architectural patterns
4. Business logic or domain concepts

Keep it under 3 sentences and focus on WHAT the code does, not HOW it's written.`
        },
        {
          role: "user",
          content: `File: ${filePath}\nLanguage: ${language}\n\nCode:\n${code.substring(0, 2000)}`
        }
      ],
      model: GROQ_MODEL,
      temperature: 0.1,
      max_tokens: 150,
      top_p: 0.9
      // Removed timeout parameter as it's not supported
    });
    
    const description = completion.choices[0]?.message?.content?.trim() || `Code from ${filePath}`;
    descriptionCache.set(cacheKey, description);
    
    return description;
  } catch (error) {
    console.error(chalk.red(`❌ Code description generation failed for ${filePath}: ${error.message}`));
    return `Code from ${filePath} (${language})`;
  }
}

/**
 * Extract key functions/classes for better metadata
 */
function extractCodeStructure(content, language) {
  const structure = {
    functions: [],
    classes: [],
    imports: [],
    exports: []
  };
  
  const patterns = {
    javascript: {
      functions: /(?:function\s+(\w+)|const\s+(\w+)\s*=.*?=>|(\w+)\s*:\s*(?:function|async))/g,
      classes: /class\s+(\w+)/g,
      imports: /import.*?from\s+['"]([^'"]+)['"]/g,
      exports: /export\s+(?:default\s+)?(?:function\s+(\w+)|class\s+(\w+)|const\s+(\w+))/g
    },
    python: {
      functions: /def\s+(\w+)/g,
      classes: /class\s+(\w+)/g,
      imports: /(?:from\s+(\S+)\s+)?import\s+([^#\n]+)/g
    }
  };
  
  const langPatterns = patterns[language] || patterns.javascript;
  
  Object.entries(langPatterns).forEach(([type, pattern]) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1] || match[2] || match[3];
      if (name && !structure[type].includes(name)) {
        structure[type].push(name);
      }
    }
  });
  
  return structure;
}

/**
 * Recursively read all files in a directory with better filtering
 */
async function readAllFiles(dirPath, fileList = [], options = {}) {
  const { maxFiles = 5000, debug = false } = options;
  
  try {
    const files = await readdir(dirPath);
    
    for (const file of files) {
      if (fileList.length >= maxFiles) {
        console.log(chalk.yellow(`⚠️  Reached maximum file limit (${maxFiles})`));
        break;
      }
      
      const filePath = join(dirPath, file);
      
      // Skip common directories and files
      if (SKIP_DIRECTORIES.has(file) || file.startsWith('.') && file !== '.env.example') {
        if (debug) console.log(chalk.gray(`⏭️  Skipping: ${filePath}`));
        continue;
      }
      
      const fileStat = await stat(filePath);
      
      if (fileStat.isDirectory()) {
        await readAllFiles(filePath, fileList, options);
      } else {
        const ext = file.substring(file.lastIndexOf('.')).toLowerCase();
        if (SUPPORTED_EXTENSIONS.has(ext) && fileStat.size <= MAX_FILE_SIZE_MB * 1024 * 1024) {
          fileList.push(filePath);
        } else if (debug) {
          console.log(chalk.gray(`⏭️  Skipping unsupported file: ${filePath}`));
        }
      }
    }
    
    return fileList;
  } catch (error) {
    console.error(chalk.red(`❌ Error reading directory ${dirPath}: ${error.message}`));
    return fileList;
  }
}

/**
 * Initialize ChromaDB client with retry logic
 */
// In the initializeChromaClient function, replace it with this:
async function initializeChromaClient() {
  const maxRetries = 3;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      // Try to connect to ChromaDB with proper configuration
      let client;
      
      if (CHROMA_URL && CHROMA_URL !== "http://localhost:8000") {
        // Parse URL for proper configuration
        const url = new URL(CHROMA_URL);
        client = new ChromaClient({ 
          host: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          ssl: url.protocol === 'https:'
        });
      } else {
        // Default to localhost with proper configuration
        client = new ChromaClient({ 
          host: 'localhost',
          port: 8000,
          ssl: false
        });
      }
      
      // Test connection
      await client.heartbeat();
      console.log(chalk.green(`✅ Connected to ChromaDB`));
      return client;
    } catch (error) {
      retries++;
      console.log(chalk.yellow(`⚠️  ChromaDB connection attempt ${retries}/${maxRetries} failed: ${error.message}`));
      
      if (retries >= maxRetries) {
        console.log(chalk.yellow('💡 ChromaDB not available, using in-memory mode...'));
        // Fallback to in-memory mode
        try {
          const client = new ChromaClient();
          console.log(chalk.green(`✅ Using ChromaDB in-memory mode`));
          return client;
        } catch (fallbackError) {
          console.error(chalk.red(`❌ Failed to initialize ChromaDB in-memory: ${fallbackError.message}`));
          throw new Error('Could not initialize ChromaDB in any mode');
        }
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * retries));
    }
  }
}

/**
 * Process a single file
 */
async function processFile(filePath, projectDir, collection, debug = false) {
  try {
    const content = await readFile(filePath, 'utf8');
    const relativePath = filePath.replace(projectDir, '').replace(/^[\\/]/, '');
    
    if (debug && Math.random() < 0.05) { // Debug log for ~5% of files
      console.log(chalk.gray(`📄 Processing: ${relativePath}`));
    }
    
    // Skip very large files or binary-like content
    if (content.length > MAX_FILE_SIZE_MB * 1024 * 1024 || content.includes('\0')) {
      if (debug) console.log(chalk.gray(`⏭️  Skipping large/binary file: ${relativePath}`));
      return { chunks: 0, processed: false };
    }
    
    // Split file into chunks
    const chunks = extractCodeChunks(relativePath, content);
    
    if (chunks.length === 0) {
      if (debug) console.log(chalk.gray(`⏭️  No chunks extracted from: ${relativePath}`));
      return { chunks: 0, processed: false };
    }
    
    // Extract code structure for the whole file
    const codeStructure = extractCodeStructure(content, detectLanguage(relativePath));
    
    // Process each chunk
    const batchData = { ids: [], embeddings: [], metadatas: [], documents: [] };
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Generate embedding
        const embedding = await generateEmbedding(chunk.content);
        
        // Generate description (only for first chunk of each file or significant chunks)
        let description;
        if (i === 0 || chunk.content.length > CHUNK_SIZE * 0.7) {
          description = await generateCodeDescription(chunk.content, relativePath, chunk.language);
        } else {
          description = `Code segment from ${relativePath}`;
        }
        
        const id = `${relativePath}:${chunk.startLine}-${chunk.endLine}`;
        
        batchData.ids.push(id);
        batchData.embeddings.push(embedding);
        batchData.documents.push(chunk.content);
        batchData.metadatas.push({
          filePath: relativePath,
          language: chunk.language,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          chunkSize: chunk.size,
          description: description.substring(0, 500), // Limit description length
          functions: codeStructure.functions.slice(0, 3),
          classes: codeStructure.classes.slice(0, 3),
          imports: codeStructure.imports.slice(0, 3),
          indexed_at: new Date().toISOString()
        });
      } catch (error) {
        console.error(chalk.red(`❌ Error processing chunk in ${relativePath}: ${error.message}`));
      }
    }
    
    // Add batch to collection
    if (batchData.ids.length > 0) {
      try {
        await collection.add(batchData);
        return { chunks: batchData.ids.length, processed: true };
      } catch (error) {
        console.error(chalk.red(`❌ Error adding to collection: ${error.message}`));
        // Try to add chunks individually if batch fails
        let successCount = 0;
        for (let j = 0; j < batchData.ids.length; j++) {
          try {
            await collection.add({
              ids: [batchData.ids[j]],
              embeddings: [batchData.embeddings[j]],
              documents: [batchData.documents[j]],
              metadatas: [batchData.metadatas[j]]
            });
            successCount++;
          } catch (singleError) {
            console.error(chalk.red(`❌ Error adding single chunk ${batchData.ids[j]}: ${singleError.message}`));
          }
        }
        return { chunks: successCount, processed: successCount > 0 };
      }
    }
    
    return { chunks: 0, processed: false };
  } catch (error) {
    console.error(chalk.red(`❌ Error processing file ${filePath}: ${error.message}`));
    return { chunks: 0, processed: false };
  }
}

/**
 * Index a repository or local directory with enhanced processing
 */
export async function indexRepository(path, options = {}) {
  const { 
    forceReindex = false, 
    debug = false, 
    maxFiles = 2000,
    batchSize = 5 // Small batch size for better memory management
  } = options;
  
  console.log(chalk.blue('🚀 Code Aura - Starting codebase indexing...'));
  const startTime = Date.now();
  
  const projectDir = resolve(path);
  
  if (debug) {
    console.log(chalk.gray(`📂 Indexing directory: ${projectDir}`));
    console.log(chalk.gray(`⚙️  Configuration:`));
    console.log(chalk.gray(`   - Embedding Model: ${EMBEDDING_MODEL}`));
    console.log(chalk.gray(`   - Chunk Size: ${CHUNK_SIZE}`));
    console.log(chalk.gray(`   - Chunk Overlap: ${CHUNK_OVERLAP}`));
    console.log(chalk.gray(`   - Max Files: ${maxFiles}`));
  }
  
  // Initialize ChromaDB client
  const chromaClient = await initializeChromaClient();
  
  // Create or get collection
  const collectionName = `codebase_${createHash('md5').update(projectDir).digest('hex')}`;
  let collection;
  
  try {
    if (forceReindex) {
      try {
        await chromaClient.deleteCollection({ name: collectionName });
        console.log(chalk.yellow('🗑️  Deleted existing collection for reindexing'));
      } catch (error) {
        // Collection might not exist, that's fine
      }
    }
    
    collection = await chromaClient.getOrCreateCollection({
      name: collectionName,
      metadata: { 
        "hnsw:space": "cosine",
        "indexed_at": new Date().toISOString(),
        "project_path": projectDir
      }
    });
    
    console.log(chalk.green(`📚 Collection ready: ${collectionName}`));
  } catch (error) {
    throw new Error(`Failed to create/get collection: ${error.message}`);
  }
  
  // Get all files
  console.log(chalk.blue('🔍 Scanning files...'));
  const allFiles = await readAllFiles(projectDir, [], { maxFiles, debug });
  
  console.log(chalk.green(`📊 Found ${allFiles.length} files to process`));
  
  let processedFiles = 0;
  let totalChunks = 0;
  let skippedFiles = 0;
  
  // Process files one by one to avoid memory issues and segmentation faults
  for (let i = 0; i < allFiles.length; i++) {
    const filePath = allFiles[i];
    
    try {
      const result = await processFile(filePath, projectDir, collection, debug);
      
      if (result.processed) {
        processedFiles++;
        totalChunks += result.chunks;
      } else {
        skippedFiles++;
      }
      
      // Clear caches periodically to prevent memory buildup
      if (i % 10 === 0) {
        if (embeddingCache.size > 1000) {
          // Clear half the cache
          const keys = Array.from(embeddingCache.cache.keys());
          for (let k = 0; k < Math.floor(keys.length / 2); k++) {
            embeddingCache.cache.delete(keys[k]);
          }
        }
        
        if (descriptionCache.size > 500) {
          const keys = Array.from(descriptionCache.cache.keys());
          for (let k = 0; k < Math.floor(keys.length / 2); k++) {
            descriptionCache.cache.delete(keys[k]);
          }
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Error processing file ${filePath}: ${error.message}`));
      skippedFiles++;
      
      // If we get a segmentation fault or memory error, try to recover
      if (error.message.includes('segmentation') || error.message.includes('bus error')) {
        console.log(chalk.yellow('⚠️  Memory error detected, clearing caches and continuing...'));
        embeddingCache.clear();
        descriptionCache.clear();
      }
    }
    
    // Progress update every 5 files
    if (i % 5 === 0 || i === allFiles.length - 1) {
      const progress = Math.round(((i + 1) / allFiles.length) * 100);
      console.log(chalk.blue(`⏳ Progress: ${progress}% (${processedFiles}/${allFiles.length} files processed, ${skippedFiles} skipped, ${totalChunks} chunks)`));
    }
  }
  
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  console.log(chalk.green('✅ Indexing completed!'));
  console.log(chalk.gray(`📈 Stats:`));
  console.log(chalk.gray(`   - Duration: ${duration}s`));
  console.log(chalk.gray(`   - Files processed: ${processedFiles}`));
  console.log(chalk.gray(`   - Files skipped: ${skippedFiles}`));
  console.log(chalk.gray(`   - Total chunks: ${totalChunks}`));
  console.log(chalk.gray(`   - Cache size: ${embeddingCache.size} embeddings, ${descriptionCache.size} descriptions`));
  
  return {
    collection,
    collectionName,
    projectDir,
    stats: {
      fileCount: processedFiles,
      totalFiles: allFiles.length,
      skippedFiles,
      chunkCount: totalChunks,
      duration,
      cacheStats: {
        embeddings: embeddingCache.size,
        descriptions: descriptionCache.size
      }
    }
  };
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('❌ Unhandled Rejection at:', promise, 'reason:', reason));
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('❌ Uncaught Exception:', error));
  process.exit(1);
});

// Export for testing
export {
  generateEmbedding,
  generateCodeDescription,
  extractCodeChunks,
  detectLanguage
};