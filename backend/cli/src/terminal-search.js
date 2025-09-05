import chalk from 'chalk';
import { Groq } from 'groq-sdk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHash } from 'crypto';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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
    console.warn(chalk.yellow('⚠️  GROQ_API_KEY not set. AI features will be limited.'));
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
 * Search and display results in terminal
 */
export async function searchInTerminal(collection, query, options = {}) {
  const { debug = false } = options;
  
  if (debug) {
    console.log(chalk.gray(`🔍 Searching for: "${query}"`));
  }
  
  try {
    // First, use Groq to enhance the query with semantic understanding (if available)
    let enhancedQuery = query;
    if (groq) {
      enhancedQuery = await enhanceQuery(query);
      if (debug) {
        console.log(chalk.gray(`💡 Enhanced query: "${enhancedQuery}"`));
      }
    }
    
    // Generate embedding for the query using fallback method
    let queryEmbedding;
    try {
      // Use the same enhanced fallback method as the indexer
      queryEmbedding = generateFallbackEmbedding(enhancedQuery);
    } catch (error) {
      console.error(chalk.red(`❌ Failed to generate embedding: ${error.message}`));
      console.log(chalk.yellow('⚠️  Using fallback search method...'));
      
      // Fallback: simple text search
      const allData = await collection.get({
        include: ['metadatas', 'documents']
      });
      
      if (!allData.ids || allData.ids.length === 0) {
        console.log(chalk.yellow('🤷 No indexed data found.'));
        return;
      }
      
      // Simple text matching
      const queryWords = query.toLowerCase().split(/\s+/);
      const results = allData.ids.map((id, index) => {
        const metadata = allData.metadatas[index];
        const document = allData.documents[index];
        const text = (metadata.description + ' ' + document).toLowerCase();
        
        let score = 0;
        queryWords.forEach(word => {
          if (text.includes(word)) score++;
        });
        
        return {
          id,
          metadata,
          document,
          similarity: score / queryWords.length
        };
      }).filter(r => r.similarity > 0).sort((a, b) => b.similarity - a.similarity).slice(0, 10);
      
      displayResults(results, query);
      return;
    }
    
    // Query the collection - FIXED: Use proper query format for ChromaDB
    const results = await collection.query({
      queryEmbeddings: queryEmbedding,
      nResults: 10,
      include: ['metadatas', 'documents', 'distances']
    });
    
    if (!results.ids || results.ids.length === 0) {
      console.log(chalk.yellow('🤷 No results found for your query.'));
      return;
    }
    
    // Format results for display - FIXED: Handle different result structure
    const formattedResults = results.ids.map((id, index) => ({
      id,
      metadata: results.metadatas[index],
      document: results.documents[index],
      similarity: results.distances ? (1 - results.distances[index]) * 100 : 0
    }));
    
    displayResults(formattedResults, query);
    
    // Generate summary using Groq (if available)
    if (groq) {
      await generateSearchSummary(query, results);
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ Search error: ${error.message}`));
    if (debug) {
      console.error(chalk.red('🔍 Stack trace:'), error.stack);
    }
  }
}

/**
 * Display search results in a formatted way
 */
function displayResults(results, query) {
  console.log(chalk.green(`\n🎯 Found ${results.length} relevant code sections:\n`));
  
  results.forEach((result, index) => {
    const { metadata, document, similarity } = result;
    
    console.log(chalk.blue(`📁 ${metadata.filePath} [Lines ${metadata.startLine}-${metadata.endLine}]`));
    console.log(chalk.gray(`📝 ${metadata.description}`));
    console.log(chalk.gray(`🔗 Similarity: ${similarity.toFixed(1)}%`));
    console.log(chalk.gray('─'.repeat(process.stdout.columns || 80)));
    
    // Display code snippet with syntax highlighting simulation
    const lines = document.split('\n');
    lines.slice(0, 10).forEach(line => {
      // Simple syntax highlighting simulation
      if (line.includes('function') || line.includes('class') || line.includes('def')) {
        console.log(chalk.cyan(`  ${line}`));
      } else if (line.includes('import') || line.includes('require')) {
        console.log(chalk.magenta(`  ${line}`));
      } else if (line.includes('//') || line.includes('#') || line.includes('/*')) {
        console.log(chalk.green(`  ${line}`));
      } else {
        console.log(`  ${line}`);
      }
    });
    
    if (lines.length > 10) {
      console.log(chalk.gray(`  ... ${lines.length - 10} more lines`));
    }
    
    console.log('\n');
  });
}

/**
 * Enhance the search query using Groq for better semantic understanding
 */
// In the enhanceQuery function, remove the timeout parameter:
async function enhanceQuery(query) {
  if (!groq) {
    return query;
  }
  
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a code search assistant. Rewrite the user's query to be more effective for semantic code search. Focus on the intent and key concepts. Return only the enhanced query without additional explanation."
        },
        {
          role: "user",
          content: query
        }
      ],
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 100
      // Removed timeout parameter
    });
    
    return completion.choices[0]?.message?.content || query;
  } catch (error) {
    console.error(chalk.yellow(`⚠️ Query enhancement failed, using original query: ${error.message}`));
    return query;
  }
}

// In the generateSearchSummary function, remove the timeout parameter:
async function generateSearchSummary(query, results) {
  if (!groq) {
    return;
  }
  
  try {
    // Prepare context from top results
    const context = results.ids.slice(0, 3).map((id, index) => {
      const metadata = results.metadatas[index];
      const document = results.documents[index];
      return `File: ${metadata.filePath}\nCode:\n${document.substring(0, 500)}`;
    }).join('\n\n');
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a code analysis expert. Provide a concise summary of what the search results reveal about the codebase. Focus on patterns, key findings, and potential relationships between the code sections. Keep it under 3 sentences."
        },
        {
          role: "user",
          content: `Query: ${query}\n\nTop results:\n${context}`
        }
      ],
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 150
      // Removed timeout parameter
    });
    
    const summary = completion.choices[0]?.message?.content;
    if (summary) {
      console.log(chalk.blue('📋 AI Summary:'));
      console.log(chalk.gray(summary));
      console.log('\n');
    }
  } catch (error) {
    console.error(chalk.yellow(`⚠️ Summary generation failed: ${error.message}`));
  }
}

// /**
//  * Generate a summary of search results using Groq
//  */
// async function generateSearchSummary(query, results) {
//   if (!groq) {
//     return;
//   }
  
//   try {
//     // Prepare context from top results
//     const context = results.ids.slice(0, 3).map((id, index) => {
//       const metadata = results.metadatas[index];
//       const document = results.documents[index];
//       return `File: ${metadata.filePath}\nCode:\n${document.substring(0, 500)}`;
//     }).join('\n\n');
    
//     const completion = await groq.chat.completions.create({
//       messages: [
//         {
//           role: "system",
//           content: "You are a code analysis expert. Provide a concise summary of what the search results reveal about the codebase. Focus on patterns, key findings, and potential relationships between the code sections. Keep it under 3 sentences."
//         },
//         {
//           role: "user",
//           content: `Query: ${query}\n\nTop results:\n${context}`
//         }
//       ],
//       model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
//       temperature: 0.3,
//       max_tokens: 150
//     });
    
//     const summary = completion.choices[0]?.message?.content;
//     if (summary) {
//       console.log(chalk.blue('📋 AI Summary:'));
//       console.log(chalk.gray(summary));
//       console.log('\n');
//     }
//   } catch (error) {
//     console.error(chalk.yellow(`⚠️ Summary generation failed: ${error.message}`));
//   }
// }