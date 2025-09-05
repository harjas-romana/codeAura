import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Groq } from 'groq-sdk';
import chalk from 'chalk';
import { config } from 'dotenv';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '.env') });

// Initialize Groq client with error handling
let groq = null;
try {
  if (process.env.GROQ_API_KEY) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      timeout: 15000
    });
  } else {
    console.warn(chalk.yellow('⚠️  GROQ_API_KEY not set. AI features will be disabled.'));
  }
} catch (error) {
  console.error(chalk.red(`❌ Groq initialization failed: ${error.message}`));
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
 * Start the web server interface
 */
export function startServer(projectDir, collection, port = 3000) {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.static(join(__dirname, 'public')));
  
  // API Routes
  app.post('/api/search', async (req, res) => {
    try {
      const { query, limit = 10 } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }
      
      // Generate embedding for the query using fallback method
      let queryEmbedding;
      try {
        queryEmbedding = generateFallbackEmbedding(query);
      } catch (error) {
        console.error(chalk.red('❌ Failed to generate embedding:'), error.message);
        return res.status(500).json({ error: 'Failed to generate query embedding' });
      }
      
      // Query the collection
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
        include: ['metadatas', 'documents', 'distances']
      });
      
      if (!results.ids[0] || results.ids[0].length === 0) {
        return res.json({
          results: [],
          graph: { nodes: [], links: [] }
        });
      }
      
      // Format results
      const formattedResults = results.ids[0].map((id, index) => ({
        id,
        filePath: results.metadatas[0][index].filePath,
        startLine: results.metadatas[0][index].startLine,
        endLine: results.metadatas[0][index].endLine,
        description: results.metadatas[0][index].description,
        content: results.documents[0][index],
        similarity: (1 - results.distances[0][index]) * 100
      }));
      
      // Generate graph data
      const graphData = generateGraphData(formattedResults);
      
      res.json({
        results: formattedResults,
        graph: graphData
      });
      
    } catch (error) {
      console.error(chalk.red('❌ Search error:'), error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/api/explain', async (req, res) => {
    try {
      const { code, filePath } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'Code is required' });
      }
      
      if (!groq) {
        return res.status(503).json({ error: 'AI explanation service not available. Please set GROQ_API_KEY.' });
      }
      
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a code explanation expert. Explain what this code does in simple terms, focusing on its purpose, inputs, outputs, and relationships to other code. Be concise but informative."
          },
          {
            role: "user",
            content: `Explain this code from ${filePath || 'unknown file'}:\n\n${code.substring(0, 3000)}`
          }
        ],
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 200
      });
      
      const explanation = completion.choices[0]?.message?.content || 'Unable to generate explanation.';
      res.json({ explanation });
      
    } catch (error) {
      console.error(chalk.red('❌ Explanation error:'), error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Start server
  app.listen(port, () => {
    console.log(chalk.green(`🚀 CodeAura server running at http://localhost:${port}`));
    console.log(chalk.green(`📁 Project directory: ${projectDir}`));
  });
  
  return app;
}

/**
 * Generate graph data from search results
 */
function generateGraphData(results) {
  const nodes = [];
  const links = [];
  const fileMap = new Map();
  
  // Create nodes for each file
  results.forEach(result => {
    if (!fileMap.has(result.filePath)) {
      const nodeId = nodes.length;
      fileMap.set(result.filePath, nodeId);
      
      nodes.push({
        id: nodeId,
        label: result.filePath,
        type: 'file',
        value: result.similarity,
        filePath: result.filePath
      });
    }
  });
  
  // Create links based on imports/requires and similar patterns
  results.forEach(result => {
    const sourceId = fileMap.get(result.filePath);
    
    // Look for import/require statements
    const importRegex = /(?:import|require)\(?['"]([^'"]+)['"]\)?/g;
    let match;
    
    while ((match = importRegex.exec(result.content)) !== null) {
      const importedFile = match[1];
      
      // Try to find if this imported file is in our results
      for (const [filePath, targetId] of fileMap.entries()) {
        if (filePath.includes(importedFile) || importedFile.includes(filePath)) {
          links.push({
            source: sourceId,
            target: targetId,
            value: 5 // Default strength for imports
          });
          break;
        }
      }
    }
  });
  
  return { nodes, links };
}