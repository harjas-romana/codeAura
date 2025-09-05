import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pipeline } from '@xenova/transformers';
import { Groq } from 'groq-sdk';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

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
      
      // Generate embedding for the query
      const extractor = await pipeline('feature-extraction', process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2');
      const output = await extractor(query, { pooling: 'mean', normalize: true });
      const queryEmbedding = Array.from(output.data);
      
      // Query the collection
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
        include: ['metadatas', 'documents', 'distances']
      });
      
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
      
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a code explanation expert. Explain what this code does in simple terms, focusing on its purpose, inputs, outputs, and relationships to other code. Be concise but informative."
          },
          {
            role: "user",
            content: `Explain this code from ${filePath}:\n\n${code.substring(0, 3000)}`
          }
        ],
        model: process.env.GROQ_MODEL || "mixtral-8x7b-32768",
        temperature: 0.2,
        max_tokens: 200
      });
      
      res.json({ explanation: completion.choices[0]?.message?.content });
      
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