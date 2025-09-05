// import chalk from 'chalk';
// import { HfInference } from '@huggingface/inference';
// import * as tf from '@tensorflow/tfjs';
// import * as use from '@tensorflow-models/universal-sentence-encoder';
// import * as dotenv from 'dotenv';

// dotenv.config();

// // Configuration
// const CONFIG = {
//   EMBEDDING_MODEL: 'sentence-transformers/all-MiniLM-L6-v2', // More reliable model
//   MIN_SIMILARITY: 0.15, // Minimum similarity threshold
//   MAX_RESULTS: 8, // Increased from 5 to 8
//   HF_TIMEOUT: 15000,
//   MAX_RETRIES: 2
// };

// let hf = null;
// let sentenceEncoder = null;
// let useHuggingFace = false;

// // Initialize embedding providers
// async function initializeEmbeddingProviders() {
//   // Initialize Hugging Face if API key is available
//   if (process.env.HUGGINGFACE_API_KEY) {
//     hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
//     useHuggingFace = true;
    
//     // Test Hugging Face connection
//     try {
//       await hf.featureExtraction({
//         model: CONFIG.EMBEDDING_MODEL,
//         inputs: ['test connection'],
//         timeout: 5000
//       });
//       console.log(chalk.green('✅ Hugging Face connection successful'));
//     } catch (error) {
//       console.log(chalk.yellow('⚠️  Hugging Face unavailable, using TensorFlow.js'));
//       useHuggingFace = false;
//     }
//   }

//   // Load TensorFlow.js model as fallback
//   if (!useHuggingFace && !sentenceEncoder) {
//     try {
//       console.log(chalk.blue('🧠 Loading TensorFlow.js model...'));
//       sentenceEncoder = await use.load();
//       console.log(chalk.green('✅ TensorFlow.js model loaded'));
//     } catch (error) {
//       console.error(chalk.red('❌ Failed to load TensorFlow.js model:'), error.message);
//       throw new Error('No embedding providers available');
//     }
//   }
// }

// // Helper function to get query embedding with fallback
// async function getQueryEmbedding(query, retries = CONFIG.MAX_RETRIES) {
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       if (useHuggingFace && hf) {
//         const response = await hf.featureExtraction({
//           model: CONFIG.EMBEDDING_MODEL,
//           inputs: [query],
//           timeout: CONFIG.HF_TIMEOUT
//         });
        
//         if (Array.isArray(response) && Array.isArray(response[0])) {
//           return response[0];
//         } else if (Array.isArray(response)) {
//           return response;
//         }
//         throw new Error('Unexpected response format');
//       } else {
//         // Use TensorFlow.js
//         if (!sentenceEncoder) {
//           await initializeEmbeddingProviders();
//         }
//         const embeddings = await sentenceEncoder.embed([query]);
//         const embeddingArray = await embeddings.array();
//         return embeddingArray[0];
//       }
//     } catch (error) {
//       if (attempt === retries) {
//         if (useHuggingFace) {
//           console.log(chalk.yellow('⚠️  Hugging Face failed, switching to TensorFlow.js'));
//           useHuggingFace = false;
//           return getQueryEmbedding(query, 1); // Retry with TensorFlow
//         }
//         throw error;
//       }
      
//       console.log(chalk.yellow(`⚠️  Embedding attempt ${attempt} failed, retrying...`));
//       await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
//     }
//   }
// }

// // Function to calculate cosine similarity
// function cosineSimilarity(vecA, vecB) {
//   if (!vecA || !vecB || vecA.length !== vecB.length) {
//     return 0;
//   }
  
//   // Ensure vectors are arrays of numbers
//   const a = Array.isArray(vecA) ? vecA : Array.from(vecA);
//   const b = Array.isArray(vecB) ? vecB : Array.from(vecB);
  
//   const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
//   const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
//   const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
//   if (normA === 0 || normB === 0) return 0;
//   return dotProduct / (normA * normB);
// }

// // Enhanced code highlighting with better patterns
// function highlightCode(code, query) {
//   const lines = code.split('\n');
//   const queryKeywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);
//   const programmingKeywords = new Set([
//     'function', 'class', 'const', 'let', 'var', 'import', 'export', 'return',
//     'if', 'else', 'for', 'while', 'switch', 'case', 'try', 'catch', 'throw'
//   ]);

//   return lines.map(line => {
//     let formattedLine = line;
    
//     // Highlight query keywords
//     queryKeywords.forEach(keyword => {
//       const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
//       formattedLine = formattedLine.replace(regex, chalk.bgYellow.black('$&'));
//     });
    
//     // Highlight programming keywords (subtle)
//     programmingKeywords.forEach(keyword => {
//       const regex = new RegExp(`\\b${keyword}\\b`, 'g');
//       formattedLine = formattedLine.replace(regex, chalk.blue('$&'));
//     });
    
//     // Highlight strings
//     formattedLine = formattedLine.replace(/('.*?'|".*?")/g, chalk.green('$1'));
    
//     // Highlight numbers
//     formattedLine = formattedLine.replace(/\b(\d+)\b/g, chalk.cyan('$1'));
    
//     // Highlight comments
//     formattedLine = formattedLine.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/g, chalk.gray('$1'));
    
//     return formattedLine;
//   }).join('\n');
// }

// // Improved result display formatting
// function displayResult(result, rank, totalResults) {
//   const { metadata, similarity } = result;
//   const scorePercent = (similarity * 100).toFixed(1);
//   const maxWidth = process.stdout.columns || 80;
//   const separator = '─'.repeat(Math.min(80, maxWidth));

//   console.log(chalk.cyan(separator));
//   console.log(chalk.yellow(`#${rank} 📄 ${metadata.filePath}`));
//   console.log(chalk.gray(`   📍 Lines ${metadata.startLine}-${metadata.endLine} • 🔥 ${scorePercent}% relevant`));
//   console.log(chalk.cyan(separator));
  
//   // Display highlighted code
//   const highlightedCode = highlightCode(metadata.code, '');
//   const lines = highlightedCode.split('\n');
  
//   lines.forEach((line, lineIndex) => {
//     const lineNum = metadata.startLine + lineIndex;
//     console.log(chalk.gray(`${lineNum.toString().padStart(4)} │ `) + line);
//   });
  
//   console.log('');
// }

// // Main search function with improved error handling
// export async function searchInTerminal(collection, query) {
//   try {
//     console.log(chalk.blue(`🔍 Searching for: "${query}"`));
    
//     // Initialize embedding providers if not already done
//     if (!hf && !sentenceEncoder) {
//       await initializeEmbeddingProviders();
//     }
    
//     // Get embedding for the query
//     const queryEmbedding = await getQueryEmbedding(query);
    
//     if (!queryEmbedding) {
//       console.log(chalk.yellow('❌ Failed to generate query embedding.'));
//       return;
//     }

//     // Get all data from collection
//     const allData = await collection.get({
//       include: ['embeddings', 'metadatas', 'documents']
//     });

//     if (!allData.ids || allData.ids.length === 0) {
//       console.log(chalk.yellow('📭 No indexed data found in collection.'));
//       return;
//     }

//     // Calculate similarity scores for all chunks
//     const scoredResults = allData.ids.map((id, index) => {
//       const embedding = allData.embeddings[index];
//       const metadata = allData.metadatas[index] || {};
//       const similarity = cosineSimilarity(queryEmbedding, embedding);
      
//       return {
//         id,
//         metadata: {
//           ...metadata,
//           code: allData.documents?.[index] || metadata.code || ''
//         },
//         similarity,
//         embedding
//       };
//     });

//     // Filter and sort results
//     const filteredResults = scoredResults.filter(result => 
//       result.similarity >= CONFIG.MIN_SIMILARITY && result.metadata.code
//     );
    
//     filteredResults.sort((a, b) => b.similarity - a.similarity);
    
//     const topResults = filteredResults.slice(0, CONFIG.MAX_RESULTS);

//     if (topResults.length === 0) {
//       console.log(chalk.yellow('🤷 No relevant results found for your query.'));
//       console.log(chalk.gray('   Try using different keywords or a more specific query.'));
//       return;
//     }

//     console.log(chalk.green(`\n✨ Found ${topResults.length} relevant code snippets:\n`));

//     // Display results
//     topResults.forEach((result, index) => {
//       displayResult(result, index + 1, topResults.length);
//     });

//     // Show summary
//     console.log(chalk.green('📊 Search Summary:'));
//     console.log(chalk.gray(`   Total indexed chunks: ${allData.ids.length}`));
//     console.log(chalk.gray(`   Results shown: ${topResults.length}`));
//     console.log(chalk.gray(`   Best match: ${(topResults[0].similarity * 100).toFixed(1)}% relevance`));
//     console.log(chalk.gray(`   Embedding provider: ${useHuggingFace ? 'Hugging Face' : 'TensorFlow.js'}`));
    
//     console.log(chalk.green('\n🎯 Search complete!'));

//   } catch (error) {
//     console.error(chalk.red('❌ Search failed:'), error.message);
    
//     // Provide specific error messages
//     if (error.message.includes('401') || error.message.includes('403')) {
//       console.log(chalk.yellow('💡 Check your HUGGINGFACE_API_KEY in the .env file'));
//     } else if (error.message.includes('429')) {
//       console.log(chalk.yellow('💡 Rate limited. Try again in a moment.'));
//     } else if (error.message.includes('404')) {
//       console.log(chalk.yellow('💡 Model not found. Using TensorFlow.js fallback.'));
//     } else if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
//       console.log(chalk.yellow('💡 Network error. Check your internet connection.'));
//     }
//   }
// }

// // Enhanced batch search with better error handling
// export async function batchSearchInTerminal(collection, queries) {
//   for (const query of queries) {
//     try {
//       const separator = '='.repeat(Math.min(60, process.stdout.columns || 60));
//       console.log(chalk.magenta(`\n${separator}`));
//       console.log(chalk.magenta(`🔍 BATCH SEARCH: "${query}"`));
//       console.log(chalk.magenta(`${separator}\n`));
      
//       await searchInTerminal(collection, query);
      
//       // Add delay between searches to avoid rate limiting
//       if (queries.indexOf(query) < queries.length - 1) {
//         await new Promise(resolve => setTimeout(resolve, 1500));
//       }
//     } catch (error) {
//       console.error(chalk.red(`❌ Failed to search for "${query}":`), error.message);
//       // Continue with next query
//     }
//   }
// }

// // Utility function to check collection health
// export async function checkCollectionHealth(collection) {
//   try {
//     const info = await collection.count();
//     console.log(chalk.green(`✅ Collection health: ${info} chunks indexed`));
//     return true;
//   } catch (error) {
//     console.error(chalk.red('❌ Collection health check failed:'), error.message);
//     return false;
//   }
// }

import chalk from 'chalk';
import { Groq } from 'groq-sdk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pipeline } from '@xenova/transformers';

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
    
    // Generate embedding for the query using local model
    let queryEmbedding;
    try {
      const extractor = await pipeline('feature-extraction', process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2');
      const output = await extractor(enhancedQuery, { pooling: 'mean', normalize: true });
      queryEmbedding = Array.from(output.data);
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
    
    // Query the collection
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: 10,
      include: ['metadatas', 'documents', 'distances']
    });
    
    if (!results.ids[0] || results.ids[0].length === 0) {
      console.log(chalk.yellow('🤷 No results found for your query.'));
      return;
    }
    
    // Format results for display
    const formattedResults = results.ids[0].map((id, index) => ({
      id,
      metadata: results.metadatas[0][index],
      document: results.documents[0][index],
      similarity: (1 - results.distances[0][index]) * 100
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
    });
    
    return completion.choices[0]?.message?.content || query;
  } catch (error) {
    console.error(chalk.yellow(`⚠️ Query enhancement failed, using original query: ${error.message}`));
    return query;
  }
}

/**
 * Generate a summary of search results using Groq
 */
async function generateSearchSummary(query, results) {
  if (!groq) {
    return;
  }
  
  try {
    // Prepare context from top results
    const context = results.ids[0].slice(0, 3).map((id, index) => {
      const metadata = results.metadatas[0][index];
      const document = results.documents[0][index];
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