// import simpleGit from 'simple-git';
// import fs from 'fs/promises';
// import path from 'path';
// import chalk from 'chalk';
// import klawSync from 'klaw-sync';
// import { ChromaClient } from 'chromadb';
// import * as tf from '@tensorflow/tfjs';
// import * as use from '@tensorflow-models/universal-sentence-encoder';
// import { HfInference } from '@huggingface/inference';
// import pLimit from 'p-limit';
// import { createHash } from 'crypto';
// import * as dotenv from 'dotenv';

// dotenv.config();

// // Initialize clients
// const chromaClient = new ChromaClient();
// const hf = process.env.HUGGINGFACE_API_KEY ? new HfInference(process.env.HUGGINGFACE_API_KEY) : null;

// // Configuration with prioritized models
// const CONFIG = {
//   BATCH_SIZE: 20,
//   MAX_CONCURRENT_FILES: 10,
//   MAX_CONCURRENT_EMBEDDINGS: 3,
//   MAX_CHUNK_CHARS: 800,
//   MIN_CHUNK_CHARS: 100,
//   EMBEDDING_DIMENSION: 768, // CodeBERT dimension
//   HF_TIMEOUT: 25000,
//   MAX_RETRIES: 2,
//   RETRY_DELAY: 800,
  
//   // Model priority list (try in order)
//   HF_MODELS: [
//     'microsoft/codebert-base',        // Primary: Code-specific
//     'Salesforce/codet5-base',         // Secondary: Code-specific
//     'sentence-transformers/all-MiniLM-L6-v2', // Fallback: General purpose
//     'intfloat/e5-small-v2'            // Backup: Good general embedding
//   ],
  
//   // File type priorities
//   PRIORITY_EXTENSIONS: new Set(['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs']),
//   SECONDARY_EXTENSIONS: new Set(['.html', '.css', '.scss', '.vue', '.svelte']),
//   TERTIARY_EXTENSIONS: new Set(['.json', '.yml', '.yaml', '.xml', '.md', '.txt'])
// };

// // Rate limiters
// const fileLimit = pLimit(CONFIG.MAX_CONCURRENT_FILES);
// const embeddingLimit = pLimit(CONFIG.MAX_CONCURRENT_EMBEDDINGS);

// let sentenceEncoder = null;
// let currentModelIndex = 0;
// let useHuggingFace = !!process.env.HUGGINGFACE_API_KEY;

// // Test Hugging Face models in order
// async function initializeHuggingFace() {
//   if (!hf) return false;
  
//   for (let i = 0; i < CONFIG.HF_MODELS.length; i++) {
//     try {
//       console.log(chalk.blue(`🔗 Testing model: ${CONFIG.HF_MODELS[i]}`));
//       await hf.featureExtraction({
//         model: CONFIG.HF_MODELS[i],
//         inputs: ['test connection'],
//         timeout: 8000
//       });
//       currentModelIndex = i;
//       console.log(chalk.green(`✅ Using model: ${CONFIG.HF_MODELS[i]}`));
//       return true;
//     } catch (error) {
//       console.log(chalk.yellow(`⚠️  Model ${CONFIG.HF_MODELS[i]} unavailable`));
//       if (i === CONFIG.HF_MODELS.length - 1) {
//         console.log(chalk.yellow('⚠️  All Hugging Face models failed, falling back to TensorFlow.js'));
//         return false;
//       }
//     }
//   }
//   return false;
// }

// // Load TensorFlow.js model as final fallback
// async function loadTensorFlowModel() {
//   if (!sentenceEncoder) {
//     console.log(chalk.blue('🧠 Loading Universal Sentence Encoder...'));
//     try {
//       tf.env().set('DEBUG', false);
//       sentenceEncoder = await use.load();
//       console.log(chalk.green('✅ TensorFlow.js model loaded successfully!'));
//     } catch (error) {
//       console.error(chalk.red('❌ Failed to load TensorFlow.js model:'), error.message);
//       throw new Error('Could not load any embedding models');
//     }
//   }
//   return sentenceEncoder;
// }

// // Enhanced file filtering with priorities
// async function getAllCodeFiles(dirPath) {
//   const ignorePatterns = [
//     /node_modules/, /\.git/, /\.env/, /dist/, /build/, /\.vscode/, /\.idea/, 
//     /coverage/, /__pycache__/, /\.next/, /out/, /\.nuxt/, /\.cache/, /\.DS_Store/,
//     /package-lock\.json/, /yarn\.lock/, /\.log$/, /\.tmp$/, /\.min\.js$/, /bundle\.js$/
//   ];

//   try {
//     const allItems = klawSync(dirPath, {
//       nodir: true,
//       filter: (item) => {
//         const filePath = item.path;
        
//         // Skip ignored patterns
//         if (ignorePatterns.some(pattern => pattern.test(filePath))) {
//           return false;
//         }

//         // Check file extension
//         const ext = path.extname(filePath).toLowerCase();
//         return CONFIG.PRIORITY_EXTENSIONS.has(ext) || 
//                CONFIG.SECONDARY_EXTENSIONS.has(ext) || 
//                CONFIG.TERTIARY_EXTENSIONS.has(ext);
//       }
//     });
    
//     // Sort files by priority
//     const codeFilePaths = allItems.map(item => item.path).sort((a, b) => {
//       const extA = path.extname(a).toLowerCase();
//       const extB = path.extname(b).toLowerCase();
      
//       if (CONFIG.PRIORITY_EXTENSIONS.has(extA) && !CONFIG.PRIORITY_EXTENSIONS.has(extB)) return -1;
//       if (!CONFIG.PRIORITY_EXTENSIONS.has(extA) && CONFIG.PRIORITY_EXTENSIONS.has(extB)) return 1;
//       if (CONFIG.SECONDARY_EXTENSIONS.has(extA) && CONFIG.TERTIARY_EXTENSIONS.has(extB)) return -1;
//       if (CONFIG.TERTIARY_EXTENSIONS.has(extA) && CONFIG.SECONDARY_EXTENSIONS.has(extB)) return 1;
      
//       return a.localeCompare(b);
//     });
    
//     console.log(chalk.green(`📁 Found ${codeFilePaths.length} code files to index.`));
//     return codeFilePaths;
//   } catch (error) {
//     console.error(chalk.red('❌ Error walking directory:'), error);
//     throw error;
//   }
// }

// // Robust file reading
// async function readFileContents(filePath, retries = 2) {
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       const content = await fs.readFile(filePath, 'utf-8');
//       return content;
//     } catch (error) {
//       if (attempt === retries) {
//         console.error(chalk.red(`❌ Failed to read ${filePath}:`), error.message);
//         return null;
//       }
//       await new Promise(resolve => setTimeout(resolve, 100 * attempt));
//     }
//   }
//   return null;
// }

// // Advanced code chunking with language-specific parsing
// function chunkCode(filePath, fileContent) {
//   const ext = path.extname(filePath).toLowerCase();
  
//   // Language-specific chunking
//   if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
//     return chunkJavaScriptTypeScript(filePath, fileContent);
//   } else if (ext === '.py') {
//     return chunkPython(filePath, fileContent);
//   } else if (['.java', '.go', '.rs'].includes(ext)) {
//     return chunkStructuredLanguage(filePath, fileContent);
//   } else {
//     return chunkGenericCode(filePath, fileContent);
//   }
// }

// // JavaScript/TypeScript specific chunking
// function chunkJavaScriptTypeScript(filePath, content) {
//   const lines = content.split('\n');
//   const chunks = [];
//   let currentChunk = [];
//   let currentLine = 1;
//   let braceDepth = 0;
//   let inMultiLineComment = false;

//   for (let i = 0; i < lines.length; i++) {
//     const line = lines[i];
//     const trimmedLine = line.trim();

//     // Handle multi-line comments
//     if (inMultiLineComment) {
//       currentChunk.push(line);
//       if (trimmedLine.includes('*/')) {
//         inMultiLineComment = false;
//       }
//       continue;
//     }

//     if (trimmedLine.startsWith('/*')) {
//       inMultiLineComment = true;
//       currentChunk.push(line);
//       continue;
//     }

//     // Skip single-line comments and empty lines for boundary detection
//     const codeLine = trimmedLine.startsWith('//') || trimmedLine === '' ? '' : trimmedLine;

//     // Detect function/class boundaries
//     const isFunctionBoundary = /^(export\s+)?(function|class|const|let|var|interface|type)\s+\w+/.test(codeLine) ||
//                               /=>\s*\{?$/.test(codeLine) ||
//                               /^.*\([^)]*\)\s*\{?$/.test(codeLine);

//     // Update brace depth
//     braceDepth += (line.split('{').length - line.split('}').length);

//     currentChunk.push(line);

//     // Check if we should create a chunk
//     const shouldCreateChunk = (
//       (isFunctionBoundary && currentChunk.length > 1 && braceDepth === 0) ||
//       (braceDepth === 0 && currentChunk.length >= 5) ||
//       (currentChunk.join('\n').length >= CONFIG.MAX_CHUNK_CHARS) ||
//       (i === lines.length - 1)
//     );

//     if (shouldCreateChunk && currentChunk.length > 0) {
//       const chunkContent = currentChunk.join('\n');
//       if (chunkContent.length >= CONFIG.MIN_CHUNK_CHARS) {
//         chunks.push({
//           id: createChunkId(filePath, currentLine, currentLine + currentChunk.length - 1),
//           filePath,
//           code: chunkContent,
//           startLine: currentLine,
//           endLine: currentLine + currentChunk.length - 1,
//           charCount: chunkContent.length
//         });
//       }
//       currentLine += currentChunk.length;
//       currentChunk = [];
//     }
//   }

//   return chunks;
// }

// // Python specific chunking
// function chunkPython(filePath, content) {
//   const lines = content.split('\n');
//   const chunks = [];
//   let currentChunk = [];
//   let currentLine = 1;
//   let indentLevel = 0;

//   for (let i = 0; i < lines.length; i++) {
//     const line = lines[i];
//     const trimmedLine = line.trim();
//     const currentIndent = line.length - line.trimStart().length;

//     // Detect function/class boundaries
//     const isDefBoundary = /^(def|class)\s+\w+/.test(trimmedLine);
//     const isImportBoundary = /^(import|from)\s+\w+/.test(trimmedLine);

//     if ((isDefBoundary || isImportBoundary) && currentChunk.length > 0 && currentIndent === 0) {
//       // Save current chunk
//       const chunkContent = currentChunk.join('\n');
//       if (chunkContent.length >= CONFIG.MIN_CHUNK_CHARS) {
//         chunks.push(createChunk(filePath, currentChunk, currentLine));
//       }
//       currentChunk = [];
//       currentLine = i + 1;
//     }

//     currentChunk.push(line);

//     // Create chunk if too large or at end
//     if (currentChunk.join('\n').length >= CONFIG.MAX_CHUNK_CHARS || i === lines.length - 1) {
//       const chunkContent = currentChunk.join('\n');
//       if (chunkContent.length >= CONFIG.MIN_CHUNK_CHARS) {
//         chunks.push(createChunk(filePath, currentChunk, currentLine));
//       }
//       currentChunk = [];
//       currentLine = i + 2;
//     }
//   }

//   return chunks;
// }

// // Generic structured language chunking (Java, Go, Rust)
// function chunkStructuredLanguage(filePath, content) {
//   const lines = content.split('\n');
//   const chunks = [];
//   let currentChunk = [];
//   let currentLine = 1;
//   let braceDepth = 0;

//   for (let i = 0; i < lines.length; i++) {
//     const line = lines[i];
//     braceDepth += (line.split('{').length - line.split('}').length);

//     currentChunk.push(line);

//     // Create chunk at logical boundaries or size limits
//     if ((braceDepth === 0 && currentChunk.length >= 3) ||
//         currentChunk.join('\n').length >= CONFIG.MAX_CHUNK_CHARS ||
//         i === lines.length - 1) {
//       const chunkContent = currentChunk.join('\n');
//       if (chunkContent.length >= CONFIG.MIN_CHUNK_CHARS) {
//         chunks.push(createChunk(filePath, currentChunk, currentLine));
//       }
//       currentLine += currentChunk.length;
//       currentChunk = [];
//     }
//   }

//   return chunks;
// }

// // Generic chunking for other file types
// function chunkGenericCode(filePath, content) {
//   const lines = content.split('\n');
//   const chunks = [];
//   let currentChunk = [];
//   let currentLine = 1;

//   for (let i = 0; i < lines.length; i++) {
//     currentChunk.push(lines[i]);

//     if (currentChunk.join('\n').length >= CONFIG.MAX_CHUNK_CHARS || i === lines.length - 1) {
//       const chunkContent = currentChunk.join('\n');
//       if (chunkContent.length >= CONFIG.MIN_CHUNK_CHARS) {
//         chunks.push(createChunk(filePath, currentChunk, currentLine));
//       }
//       currentLine += currentChunk.length;
//       currentChunk = [];
//     }
//   }

//   return chunks;
// }

// function createChunk(filePath, lines, startLine) {
//   const chunkContent = lines.join('\n');
//   return {
//     id: createChunkId(filePath, startLine, startLine + lines.length - 1),
//     filePath,
//     code: chunkContent,
//     startLine,
//     endLine: startLine + lines.length - 1,
//     charCount: chunkContent.length
//   };
// }

// function createChunkId(filePath, startLine, endLine) {
//   const hash = createHash('md5').update(`${filePath}:${startLine}:${endLine}`).digest('hex');
//   return `chunk_${hash}`;
// }

// // Robust embedding generation with model fallback
// async function getEmbeddingsBatch(texts, retries = CONFIG.MAX_RETRIES) {
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       if (useHuggingFace && hf) {
//         const response = await hf.featureExtraction({
//           model: CONFIG.HF_MODELS[currentModelIndex],
//           inputs: texts,
//           timeout: CONFIG.HF_TIMEOUT
//         });
        
//         if (Array.isArray(response) && Array.isArray(response[0])) {
//           return response;
//         } else if (Array.isArray(response)) {
//           return [response];
//         }
//         throw new Error('Unexpected response format');
//       } else {
//         // Fallback to TensorFlow.js
//         const model = await loadTensorFlowModel();
//         const embeddings = await model.embed(texts);
//         return await embeddings.array();
//       }
//     } catch (error) {
//       if (attempt === retries) {
//         if (useHuggingFace) {
//           // Try next model in the list
//           if (currentModelIndex < CONFIG.HF_MODELS.length - 1) {
//             currentModelIndex++;
//             console.log(chalk.yellow(`🔄 Switching to model: ${CONFIG.HF_MODELS[currentModelIndex]}`));
//             return getEmbeddingsBatch(texts, 1);
//           } else {
//             console.log(chalk.yellow('⚠️  All Hugging Face models failed, switching to TensorFlow.js'));
//             useHuggingFace = false;
//             return getEmbeddingsBatch(texts, 1);
//           }
//         }
//         throw error;
//       }
      
//       console.log(chalk.yellow(`⚠️  Embedding attempt ${attempt} failed, retrying...`));
//       await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * attempt));
//     }
//   }
// }

// // Process files with better progress tracking
// async function processFilesInBatches(files) {
//   let allChunks = [];
//   let processed = 0;
  
//   for (let i = 0; i < files.length; i += CONFIG.BATCH_SIZE) {
//     const batch = files.slice(i, i + CONFIG.BATCH_SIZE);
//     const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
//     const totalBatches = Math.ceil(files.length / CONFIG.BATCH_SIZE);
    
//     console.log(chalk.blue(`📄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} files)`));

//     const batchPromises = batch.map(filePath => 
//       fileLimit(async () => {
//         const content = await readFileContents(filePath);
//         if (!content) return [];
        
//         const chunks = chunkCode(filePath, content);
//         processed++;
        
//         if (processed % 5 === 0) {
//           console.log(chalk.gray(`   Processed ${processed}/${files.length} files, ${allChunks.length} chunks`));
//         }
        
//         return chunks;
//       })
//     );

//     const batchResults = await Promise.allSettled(batchPromises);
//     const successfulChunks = batchResults
//       .filter(result => result.status === 'fulfilled')
//       .map(result => result.value)
//       .flat();

//     allChunks = allChunks.concat(successfulChunks);

//     // Memory management
//     if (i % 20 === 0) {
//       await new Promise(resolve => setTimeout(resolve, 50));
//     }
//   }
  
//   return allChunks;
// }

// // Process embeddings with better memory management
// async function processEmbeddingsInBatches(chunks) {
//   const chunksWithEmbeddings = [];
//   let processed = 0;

//   for (let i = 0; i < chunks.length; i += CONFIG.BATCH_SIZE) {
//     const batch = chunks.slice(i, i + CONFIG.BATCH_SIZE);
//     const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
//     const totalBatches = Math.ceil(chunks.length / CONFIG.BATCH_SIZE);

//     console.log(chalk.blue(`🧠 Generating embeddings for batch ${batchNumber}/${totalBatches}`));

//     try {
//       const batchTexts = batch.map(chunk => chunk.code);
//       const batchEmbeddings = await embeddingLimit(() => getEmbeddingsBatch(batchTexts));

//       batch.forEach((chunk, index) => {
//         if (batchEmbeddings[index]) {
//           chunk.embedding = batchEmbeddings[index];
//           chunksWithEmbeddings.push(chunk);
//         }
//       });

//       processed += batch.length;
//       console.log(chalk.gray(`   Embedded ${processed}/${chunks.length} chunks`));

//       // Rate limiting
//       await new Promise(resolve => setTimeout(resolve, 300));

//     } catch (error) {
//       console.error(chalk.red(`❌ Failed to process batch ${batchNumber}:`), error.message);
//       // Continue with next batch
//     }
//   }

//   return chunksWithEmbeddings;
// }

// // Store in ChromaDB with better error handling
// async function storeInChromaDB(chunks, collectionName) {
//   try {
//     const collection = await chromaClient.createCollection({
//       name: collectionName,
//       embeddingFunction: null
//     });

//     const batchSize = 50;
//     let stored = 0;

//     for (let i = 0; i < chunks.length; i += batchSize) {
//       const batch = chunks.slice(i, i + batchSize);
      
//       const ids = batch.map(chunk => chunk.id);
//       const embeddings = batch.map(chunk => chunk.embedding);
//       const metadatas = batch.map(chunk => ({
//         filePath: chunk.filePath,
//         code: chunk.code.substring(0, 1500),
//         startLine: chunk.startLine,
//         endLine: chunk.endLine,
//         charCount: chunk.charCount,
//         timestamp: new Date().toISOString()
//       }));

//       await collection.add({
//         ids,
//         embeddings,
//         metadatas
//       });

//       stored += batch.length;
//       if (stored % 100 === 0) {
//         console.log(chalk.gray(`   Stored ${stored}/${chunks.length} chunks`));
//       }
//     }

//     return collection;
//   } catch (error) {
//     console.error(chalk.red('❌ Failed to store in ChromaDB:'), error.message);
//     throw error;
//   }
// }

// // Main indexing function
// export async function indexRepository(inputPath) {
//   const startTime = Date.now();
//   let projectDir;
//   let tempDir = null;

//   try {
//     console.log(chalk.blue('🔮 CodeAura is indexing:'), inputPath);
    
//     // Initialize embedding providers
//     if (useHuggingFace) {
//       useHuggingFace = await initializeHuggingFace();
//     }

//     if (!useHuggingFace) {
//       console.log(chalk.blue('🧠 Using TensorFlow.js for embeddings...'));
//       await loadTensorFlowModel();
//     }

//     // Handle repository input
//     if (inputPath.startsWith('https') || inputPath.startsWith('git@')) {
//       tempDir = path.join(process.cwd(), `codeaura-${Date.now()}`);
//       await fs.mkdir(tempDir, { recursive: true });
//       console.log(chalk.blue(`⬇️ Cloning repository from ${inputPath}...`));
//       await simpleGit().clone(inputPath, tempDir);
//       projectDir = tempDir;
//     } else {
//       projectDir = path.resolve(inputPath);
//       const stats = await fs.stat(projectDir);
//       if (!stats.isDirectory()) {
//         throw new Error('Input path is not a directory');
//       }
//     }

//     console.log(chalk.blue('✂️ Step 2: Chunking code files...'));
    
//     const codeFiles = await getAllCodeFiles(projectDir);
//     if (codeFiles.length === 0) {
//       throw new Error('No code files found in the specified directory');
//     }

//     const allChunks = await processFilesInBatches(codeFiles);
//     console.log(chalk.green(`✅ Created ${allChunks.length} code chunks`));

//     if (allChunks.length === 0) {
//       throw new Error('No valid code chunks could be created');
//     }

//     console.log(chalk.blue(`🧠 Step 3: Generating embeddings... (${allChunks.length} chunks)`));
//     const chunksWithEmbeddings = await processEmbeddingsInBatches(allChunks);

//     if (chunksWithEmbeddings.length === 0) {
//       throw new Error('Failed to generate embeddings for any chunks');
//     }

//     const collectionName = `codeaura-${path.basename(projectDir)}-${Date.now()}`.toLowerCase();
//     console.log(chalk.blue('💾 Step 4: Storing in ChromaDB...'));
    
//     const collection = await storeInChromaDB(chunksWithEmbeddings, collectionName);

//     const endTime = Date.now();
//     const duration = ((endTime - startTime) / 1000).toFixed(2);

//     console.log(chalk.green('\n✅ Indexing complete!'));
//     console.log(chalk.green(`⏱️  Duration: ${duration}s`));
//     console.log(chalk.green(`📊 Files: ${codeFiles.length}, Chunks: ${chunksWithEmbeddings.length}`));
//     console.log(chalk.green(`🗄️  Collection: ${collectionName}`));
//     console.log(chalk.green(`🔧 Embedding provider: ${useHuggingFace ? CONFIG.HF_MODELS[currentModelIndex] : 'TensorFlow.js'}`));

//     return { 
//       collection,
//       projectDir,
//       chunks: chunksWithEmbeddings,
//       collectionName,
//       stats: {
//         files: codeFiles.length,
//         chunks: chunksWithEmbeddings.length,
//         duration,
//         embeddingProvider: useHuggingFace ? 'huggingface' : 'tensorflow',
//         model: useHuggingFace ? CONFIG.HF_MODELS[currentModelIndex] : 'universal-sentence-encoder'
//       }
//     };

//   } catch (error) {
//     console.error(chalk.red('\n❌ Indexing failed:'), error.message);
    
//     // Cleanup temp directory on error
//     if (tempDir) {
//       try {
//         await fs.rm(tempDir, { recursive: true, force: true });
//       } catch (cleanupError) {
//         console.error(chalk.yellow('⚠️  Could not clean up temp directory:'), cleanupError.message);
//       }
//     }
    
//     throw error;
//   } finally {
//     // Clean up TensorFlow memory
//     if (sentenceEncoder) {
//       tf.disposeVariables();
//     }
//   }
// }



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
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE) || 1000;
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP) || 200;
const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile"; // Free model on Groq
const SUPPORTED_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', 
  '.go', '.rb', '.php', '.rs', '.swift', '.kt', '.scala', 
  '.html', '.css', '.scss', '.less', '.vue', '.svelte',
  '.md', '.txt', '.json', '.yml', '.yaml', '.xml', '.sql',
  '.sh', '.bat', '.dockerfile', '.gitignore'
]);

// Directories to skip during indexing
const SKIP_DIRECTORIES = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage', 
  '.next', '.nuxt', 'vendor', '__pycache__', '.pytest_cache',
  'target', 'bin', 'obj', '.gradle', '.idea', '.vscode'
]);

// Cache for embeddings and descriptions to avoid recomputing
const embeddingCache = new Map();
const descriptionCache = new Map();

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
  return (text.match(/\n/g) || []).length;
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
    '.sql': 'sql', '.sh': 'bash', '.yml': 'yaml', '.yaml': 'yaml'
  };
  return languageMap[ext] || 'text';
}

/**
 * Extract meaningful chunks from code with better context awareness
 */
async function extractCodeChunks(filePath, content) {
  const chunks = [];
  const language = detectLanguage(filePath);
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
      const endLine = countLines(content.substring(0, start + finalChunk.length)) + startLine - 1;
      
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
  if (embeddingCache.has(textHash)) {
    return embeddingCache.get(textHash);
  }
  
  try {
    // Check if we have an API key for HuggingFace
    if (!process.env.HUGGINGFACE_API_KEY) {
      throw new Error('HUGGINGFACE_API_KEY is not set in environment variables');
    }
    
    // Use HuggingFace Inference API for embeddings
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${EMBEDDING_MODEL}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ 
          inputs: text,
          options: {
            wait_for_model: true // Wait if model is loading
          }
        }),
      }
    );
    
    if (response.status === 401) {
      throw new Error('Authentication failed. Please check your HUGGINGFACE_API_KEY');
    }
    
    if (response.status === 404) {
      throw new Error(`Model ${EMBEDDING_MODEL} not found or not accessible with your API key`);
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
    }
    
    const result = await response.json();
    
    // Handle different response formats from different models
    let embedding;
    if (Array.isArray(result)) {
      // Some models return array directly
      embedding = Array.isArray(result[0]) ? result[0] : result;
    } else if (result.embeddings) {
      // Some models return object with embeddings property
      embedding = result.embeddings[0];
    } else if (result[0] && result[0].embedding) {
      // Qwen format might be different
      embedding = result[0].embedding;
    } else {
      console.warn('Unexpected response format from HuggingFace API, using fallback');
      throw new Error('Unexpected response format from HuggingFace API');
    }
    
    // Ensure we have a proper embedding array
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Invalid embedding format received from API');
    }
    
    embeddingCache.set(textHash, embedding);
    return embedding;
  } catch (error) {
    console.error(chalk.red(`❌ Embedding generation failed: ${error.message}`));
    
    // Fallback to simple TF-IDF like embedding if API fails
    console.log(chalk.yellow('⚠️  Using fallback embedding method'));
    
    // Simple word frequency based embedding (very basic fallback)
    const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Create a simple hash-based embedding (384 dimensions like many models)
    const simpleEmbedding = Array(384).fill(0);
    Object.keys(wordCount).forEach(word => {
      const hash = createHash('md5').update(word).digest('hex');
      const index = parseInt(hash.substring(0, 8), 16) % 384;
      simpleEmbedding[index] += wordCount[word];
    });
    
    // Normalize
    const magnitude = Math.sqrt(simpleEmbedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < simpleEmbedding.length; i++) {
        simpleEmbedding[i] /= magnitude;
      }
    }
    
    embeddingCache.set(textHash, simpleEmbedding);
    return simpleEmbedding;
  }
}

/**
 * Generate enhanced semantic description of code using Groq API
 */
async function generateCodeDescription(code, filePath, language) {
  const cacheKey = hashText(code + filePath);
  
  // Check cache first
  if (descriptionCache.has(cacheKey)) {
    return descriptionCache.get(cacheKey);
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
          content: `File: ${filePath}\nLanguage: ${language}\n\nCode:\n${code.substring(0, 2500)}`
        }
      ],
      model: GROQ_MODEL,
      temperature: 0.1,
      max_tokens: 150,
      top_p: 0.9
    });
    
    const description = completion.choices[0]?.message?.content?.trim() || "No description generated";
    descriptionCache.set(cacheKey, description);
    
    return description;
  } catch (error) {
    console.error(chalk.red(`❌ Code description generation failed for ${filePath}: ${error.message}`));
    return "Description unavailable due to API error";
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
  const { maxFiles = 10000, debug = false } = options;
  
  try {
    const files = await readdir(dirPath);
    
    for (const file of files) {
      // Skip common directories and files to ignore
      if (SKIP_DIRECTORIES.has(file) || file.startsWith('.') && file !== '.env.example') {
        if (debug) console.log(chalk.gray(`⏭️  Skipping: ${join(dirPath, file)}`));
        continue;
      }
      
      if (fileList.length >= maxFiles) {
        console.log(chalk.yellow(`⚠️  Reached maximum file limit (${maxFiles})`));
        break;
      }
      
      const filePath = join(dirPath, file);
      const fileStat = await stat(filePath);
      
      if (fileStat.isDirectory()) {
        await readAllFiles(filePath, fileList, options);
      } else {
        const ext = file.substring(file.lastIndexOf('.')).toLowerCase();
        if (SUPPORTED_EXTENSIONS.has(ext) && fileStat.size < 1024 * 1024) { // Skip files > 1MB
          fileList.push(filePath);
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
async function initializeChromaClient() {
  const maxRetries = 3;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const client = new ChromaClient({ 
        host: 'localhost',
        port: 8000,
        ssl: false
      });
      
      // Test connection
      await client.heartbeat();
      console.log(chalk.green(`✅ Connected to ChromaDB at ${CHROMA_URL}`));
      return client;
    } catch (error) {
      retries++;
      console.error(chalk.red(`❌ ChromaDB connection attempt ${retries}/${maxRetries} failed: ${error.message}`));
      
      if (retries === maxRetries) {
        throw new Error(`Failed to connect to ChromaDB after ${maxRetries} attempts. Please ensure ChromaDB is running at ${CHROMA_URL}`);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000 * retries));
    }
  }
}

/**
 * Index a repository or local directory with enhanced processing
 */
export async function indexRepository(path, options = {}) {
  const { 
    forceReindex = false, 
    debug = false, 
    maxFiles = 5000,
    batchSize = 50
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
  
  // Process files with much smaller batches to avoid memory issues
  for (let i = 0; i < allFiles.length; i += batchSize) {
    const batch = allFiles.slice(i, i + batchSize);
    
    // Process files sequentially instead of in parallel to reduce memory pressure
    for (const filePath of batch) {
      try {
        const result = await processFile(filePath, projectDir, collection, debug);
        
        if (result.processed) {
          processedFiles++;
          totalChunks += result.chunks;
        } else {
          skippedFiles++;
        }
        
        // Clear some cache periodically to prevent memory buildup
        if ((processedFiles + skippedFiles) % 50 === 0) {
          // Keep only recent cache entries
          if (embeddingCache.size > 500) {
            const entries = Array.from(embeddingCache.entries());
            embeddingCache.clear();
            // Keep last 300 entries
            entries.slice(-300).forEach(([key, value]) => embeddingCache.set(key, value));
          }
          if (descriptionCache.size > 200) {
            const entries = Array.from(descriptionCache.entries());
            descriptionCache.clear();
            // Keep last 100 entries
            entries.slice(-100).forEach(([key, value]) => descriptionCache.set(key, value));
          }
        }
        
      } catch (error) {
        console.error(chalk.red(`❌ Error processing file ${filePath}: ${error.message}`));
        skippedFiles++;
      }
    }
    
    // Progress update
    const progress = Math.round(((i + batch.length) / allFiles.length) * 100);
    console.log(chalk.blue(`⏳ Progress: ${progress}% (${processedFiles}/${allFiles.length} files processed, ${skippedFiles} skipped, ${totalChunks} chunks)`));
  }
  
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  console.log(chalk.green('✅ Indexing completed!'));
  console.log(chalk.gray(`📈 Stats:`));
  console.log(chalk.gray(`   - Duration: ${duration}s`));
  console.log(chalk.gray(`   - Files processed: ${processedFiles}`));
  console.log(chalk.gray(`   - Files skipped: ${skippedFiles}`));
  console.log(chalk.gray(`   - Total chunks: ${totalChunks}`));
  console.log(chalk.gray(`   - Cache hits: ${embeddingCache.size} embeddings, ${descriptionCache.size} descriptions`));
  
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

/**
 * Process a single file
 */
async function processFile(filePath, projectDir, collection, debug = false) {
  try {
    const content = await readFile(filePath, 'utf8');
    const relativePath = filePath.replace(projectDir, '').replace(/^[\\/]/, '');
    
    if (debug && Math.random() < 0.1) { // Debug log for ~10% of files
      console.log(chalk.gray(`📄 Processing: ${relativePath}`));
    }
    
    // Skip very large files or binary-like content
    if (content.length > 100000 || content.includes('\0')) {
      return { chunks: 0, processed: false };
    }
    
    // Split file into chunks
    const chunks = await extractCodeChunks(relativePath, content);
    
    if (chunks.length === 0) {
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
        if (i === 0 || chunk.content.length > CHUNK_SIZE * 0.8) {
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
          description: description,
          functions: codeStructure.functions.slice(0, 10), // Limit to avoid metadata bloat
          classes: codeStructure.classes.slice(0, 10),
          imports: codeStructure.imports.slice(0, 10),
          indexed_at: new Date().toISOString()
        });
      } catch (error) {
        console.error(chalk.red(`❌ Error processing chunk in ${relativePath}: ${error.message}`));
      }
    }
    
    // Add batch to collection
    if (batchData.ids.length > 0) {
      await collection.add(batchData);
    }
    
    return { chunks: chunks.length, processed: true };
  } catch (error) {
    console.error(chalk.red(`❌ Error processing file ${filePath}: ${error.message}`));
    return { chunks: 0, processed: false };
  }
}