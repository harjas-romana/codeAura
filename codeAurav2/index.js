#!/usr/bin/env node

require('dotenv').config();
const { program } = require('commander');
const { Groq } = require('groq-sdk');
const fs = require('fs').promises;
const path = require('path');
const inquirer = require('inquirer');
const nodeHtmlToImage = require('node-html-to-image');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { HuggingFaceTransformersEmbeddings } = require('@langchain/community/embeddings/hf_transformers');
const chalk = require('chalk');
const figlet = require('figlet');
const gradient = require('gradient-string');

// Configuration
const CONFIG = {
  maxChunkSize: 800,
  chunkOverlap: 100,
  similarityThreshold: 0.1,
  dataFile: '.code-aura-data.json',
  apiKeyFile: '.code-aura-api-key'
};

// Initialize GROQ client (will be set after getting API key)
let groq = null;

// Initialize embeddings model
const embeddings = new HuggingFaceTransformersEmbeddings({
  model: 'Xenova/all-MiniLM-L6-v2'
});

// Store for code snippets with embeddings
let codeSnippets = [];

// Display beautiful banner
function displayBanner() {
  console.log('\n');
  console.log(gradient.rainbow(figlet.textSync('Code Aura', { font: 'Big Money-nw' })));
  console.log(gradient.pastel('╔═══════════════════════════════════════════════════════════════╗'));
  console.log(gradient.pastel('║                 Semantic Code Search & Explorer               ║'));
  console.log(gradient.pastel('╚═══════════════════════════════════════════════════════════════╝'));
  console.log(chalk.cyan('           Developed by - Harjas Singh'));
  console.log(chalk.blue('           LinkedIn: https://www.linkedin.com/in/harjas04'));
  console.log(chalk.magenta('           GitHub: https://www.github.com/harjas-romana/codeAura'));
  console.log('\n');
}

// Get API key from user or storage
async function getGroqApiKey() {
  // First check environment variable
  if (process.env.GROQ_API_KEY) {
    return process.env.GROQ_API_KEY;
  }

  // Then check stored API key file
  try {
    const storedKey = await fs.readFile(CONFIG.apiKeyFile, 'utf-8');
    if (storedKey.trim()) {
      console.log(chalk.green('✓ Using stored GROQ API key.'));
      return storedKey.trim();
    }
  } catch (error) {
    // File doesn't exist, continue to prompt
  }

  // Prompt user for API key
  console.log(chalk.yellow('🔑 GROQ API key not found.'));
  console.log(chalk.blue('You can get a free API key from: https://console.groq.com/'));
  
  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: chalk.blue('Enter your GROQ API key:'),
      prefix: chalk.green('🔐'),
      validate: (input) => {
        if (!input.trim()) {
          return 'API key cannot be empty';
        }
        if (!input.startsWith('gsk_')) {
          return 'GROQ API keys typically start with "gsk_"';
        }
        return true;
      }
    },
    {
      type: 'confirm',
      name: 'saveKey',
      message: chalk.blue('Save this API key locally for future use?'),
      default: true,
      prefix: chalk.green('💾')
    }
  ]);

  if (answers.saveKey) {
    try {
      await fs.writeFile(CONFIG.apiKeyFile, answers.apiKey);
      console.log(chalk.green('✓ API key saved locally.'));
    } catch (error) {
      console.log(chalk.yellow('⚠ Could not save API key, but will use it for this session.'));
    }
  }

  return answers.apiKey;
}

// Initialize GROQ client with API key
async function initializeGroq() {
  if (groq) return groq; // Already initialized
  
  const apiKey = await getGroqApiKey();
  groq = new Groq({ apiKey });
  
  // Test the API key
  try {
    console.log(chalk.blue('🧪 Testing GROQ API key...'));
    await groq.chat.completions.create({
      messages: [{ role: "user", content: "Hello" }],
      model: "llama-3.1-8b-instant",
      max_tokens: 1,
    });
    console.log(chalk.green('✓ GROQ API key is valid!'));
  } catch (error) {
    console.error(chalk.red('✗ Invalid GROQ API key. Please check your key and try again.'));
    // Remove invalid stored key
    try {
      await fs.unlink(CONFIG.apiKeyFile);
    } catch {}
    process.exit(1);
  }
  
  return groq;
}

// Load data from disk
async function loadData() {
  try {
    const data = await fs.readFile(CONFIG.dataFile, 'utf-8');
    codeSnippets = JSON.parse(data);
    console.log(chalk.green(`✓ Loaded ${codeSnippets.length} code snippets from cache.`));
  } catch (error) {
    codeSnippets = [];
  }
}

// Save data to disk
async function saveData() {
  try {
    await fs.writeFile(CONFIG.dataFile, JSON.stringify(codeSnippets, null, 2));
  } catch (error) {
    console.error(chalk.red(`✗ Error saving data: ${error.message}`));
  }
}

// Display colorful header for commands
function displayCommandHeader(command) {
  console.log('\n' + chalk.bgBlue.white.bold(` ${command} `) + '\n');
}

program
  .name('code-aura')
  .description('CLI tool for semantic code search and exploration')
  .version('1.0.0')
  .hook('preAction', () => {
    displayBanner();
  });

// HTML visualization command
program
  .command('html <query>')
  .description('Generate HTML visualization for a search query')
  .action(async (query) => {
    displayCommandHeader('HTML VISUALIZATION');
    await loadData();
    
    if (codeSnippets.length === 0) {
      console.log(chalk.yellow('⚠ Please process a codebase first using the setup command.'));
      return;
    }

    console.log(chalk.blue(`🔍 Searching for: "${query}"`));
    const results = await semanticSearch(query);
    
    if (results.length === 0) {
      console.log(chalk.yellow('❌ No results found.'));
      return;
    }
    
    const htmlContent = createHtmlContent(results, query);
    await fs.writeFile('./code-aura-results.html', htmlContent);
    console.log(chalk.green('✓ HTML visualization saved as code-aura-results.html'));
  });

// Debug command
program
  .command('debug')
  .description('Show debug information about the processed codebase')
  .action(async () => {
    displayCommandHeader('DEBUG INFORMATION');
    await loadData();
    
    console.log(chalk.cyan(`📊 Total code snippets: ${codeSnippets.length}`));
    
    const fileMap = {};
    codeSnippets.forEach(snippet => {
      const file = snippet.filePath;
      fileMap[file] = (fileMap[file] || 0) + 1;
    });
    
    console.log(chalk.cyan('\n📁 Files processed:'));
    Object.entries(fileMap).forEach(([file, count]) => {
      console.log(chalk.white(`   - ${file}: ${chalk.yellow(count)} snippets`));
    });
    
    console.log(chalk.cyan('\n🔍 Sample code snippets:'));
    codeSnippets.slice(0, 3).forEach((snippet, index) => {
      console.log(chalk.green(`\n${index + 1}. ${snippet.filePath}`));
      console.log(chalk.gray(truncateCode(snippet.content, 150)));
    });
  });

// Setup command
program
  .command('setup <repo_path>')
  .description('Process a codebase for semantic search')
  .action(async (repoPath) => {
    displayCommandHeader('SETUP CODEBASE');
    console.log(chalk.blue(`📂 Processing codebase at: ${repoPath}`));
    await processCodebase(repoPath);
    await saveData();
    console.log(chalk.green('✓ Codebase processed successfully!'));
  });

// Reprocess command
program
  .command('reprocess')
  .description('Reprocess the codebase with improved chunking')
  .action(async () => {
    displayCommandHeader('REPROCESS CODEBASE');
    await loadData();
    
    if (codeSnippets.length === 0) {
      console.log(chalk.yellow('⚠ No code snippets found. Please run setup first.'));
      return;
    }
    
    const firstFile = codeSnippets[0].filePath;
    const repoPath = firstFile.split('/').slice(0, -1).join('/');
    console.log(chalk.blue(`🔄 Reprocessing codebase at: ${repoPath}`));
    
    await processCodebase(repoPath);
    await saveData();
    console.log(chalk.green('✓ Codebase reprocessed successfully!'));
  });

// Search command
program
  .command('search')
  .description('Search the codebase semantically')
  .action(async () => {
    displayCommandHeader('SEMANTIC SEARCH');
    await loadData();
    
    if (codeSnippets.length === 0) {
      console.log(chalk.yellow('⚠ Please process a codebase first using the setup command.'));
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: chalk.blue('🔍 Enter your search query:'),
        prefix: chalk.green('✨')
      }
    ]);

    console.log(chalk.blue(`\n🔍 Searching for: "${answers.query}"`));
    const results = await semanticSearch(answers.query);
    displayResults(results);
    
    const visualizeAnswer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'visualize',
        message: chalk.blue('🎨 Would you like to generate a visualization of these results?'),
        default: false,
        prefix: chalk.green('✨')
      }
    ]);
    
    if (visualizeAnswer.visualize) {
      await generateVisualization(results, answers.query);
    }
  });

// Explain command
program
  .command('explain <file_path>')
  .description('Get an explanation of a specific file')
  .action(async (filePath) => {
    displayCommandHeader('EXPLAIN FILE');
    await initializeGroq(); // Ensure GROQ is initialized
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const explanation = await getCodeExplanation(content, filePath);
      console.log(chalk.blue(`📄 Explanation for ${filePath}:`));
      console.log(chalk.green(explanation));
    } catch (error) {
      console.error(chalk.red(`✗ Error reading file: ${error.message}`));
    }
  });

// Clear command - now also clears API key
program
  .command('clear')
  .description('Clear the cached code snippets and optionally API key')
  .action(async () => {
    displayCommandHeader('CLEAR CACHE');
    
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'clearData',
        message: chalk.blue('Clear cached code snippets?'),
        default: true,
        prefix: chalk.green('🗑️')
      },
      {
        type: 'confirm',
        name: 'clearApiKey',
        message: chalk.blue('Also clear stored API key?'),
        default: false,
        prefix: chalk.green('🔑')
      }
    ]);

    if (answers.clearData) {
      try {
        await fs.unlink(CONFIG.dataFile);
        codeSnippets = [];
        console.log(chalk.green('✓ Code snippets cache cleared!'));
      } catch (error) {
        console.log(chalk.yellow('ℹ No code snippets cache to clear.'));
      }
    }

    if (answers.clearApiKey) {
      try {
        await fs.unlink(CONFIG.apiKeyFile);
        groq = null; // Reset groq client
        console.log(chalk.green('✓ Stored API key cleared!'));
      } catch (error) {
        console.log(chalk.yellow('ℹ No stored API key to clear.'));
      }
    }
  });

// API Key management command
program
  .command('api-key')
  .description('Manage GROQ API key')
  .action(async () => {
    displayCommandHeader('API KEY MANAGEMENT');
    
    const choices = ['Update API Key', 'View Current Status', 'Remove Stored Key'];
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: chalk.blue('What would you like to do?'),
        choices,
        prefix: chalk.green('🔑')
      }
    ]);

    switch (answer.action) {
      case 'Update API Key':
        groq = null; // Reset to force re-initialization
        try {
          await fs.unlink(CONFIG.apiKeyFile);
        } catch {}
        await initializeGroq();
        break;
        
      case 'View Current Status':
        if (process.env.GROQ_API_KEY) {
          console.log(chalk.green('✓ Using API key from environment variable'));
        } else {
          try {
            await fs.readFile(CONFIG.apiKeyFile, 'utf-8');
            console.log(chalk.green('✓ Using stored API key'));
          } catch {
            console.log(chalk.yellow('⚠ No API key configured'));
          }
        }
        break;
        
      case 'Remove Stored Key':
        try {
          await fs.unlink(CONFIG.apiKeyFile);
          groq = null;
          console.log(chalk.green('✓ Stored API key removed'));
        } catch {
          console.log(chalk.yellow('ℹ No stored API key to remove'));
        }
        break;
    }
  });

// Process codebase function
async function processCodebase(repoPath) {
  try {
    const files = await getCodeFiles(repoPath);
    codeSnippets = [];
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const chunks = await splitCodeIntoChunks(content, file);
        
        for (const chunk of chunks) {
          const embedding = await embeddings.embedQuery(chunk.content);
          codeSnippets.push({
            content: chunk.content,
            filePath: file,
            embedding,
            type: chunk.type
          });
        }
      } catch (error) {
        console.error(chalk.yellow(`⚠ Skipping file ${file}: ${error.message}`));
      }
    }

    console.log(chalk.green(`✓ Processed ${codeSnippets.length} code snippets from ${files.length} files.`));
  } catch (error) {
    console.error(chalk.red(`✗ Error processing codebase: ${error.message}`));
  }
}

// Get code files function
async function getCodeFiles(dir, extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.rb', '.go', '.rs', '.php', '.cs']) {
  let results = [];
  
  try {
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'vendor') {
        continue;
      }
      
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        const subFiles = await getCodeFiles(fullPath, extensions);
        results = results.concat(subFiles);
      } else if (extensions.includes(path.extname(item.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  } catch (error) {
    console.error(chalk.red(`✗ Error reading directory ${dir}: ${error.message}`));
  }
  
  return results;
}

// Split code into chunks function
async function splitCodeIntoChunks(code, filePath) {
  const extension = path.extname(filePath);
  
  if (code.length <= 500) {
    return [{
      content: code,
      filePath,
      type: getLanguageFromExtension(extension),
      chunkIndex: 0
    }];
  }
  
  try {
    if (['.js', '.jsx', '.ts', '.tsx'].includes(extension)) {
      const functionRegex = /(function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>|class\s+\w+)/g;
      const matches = [...code.matchAll(functionRegex)];
      
      if (matches.length > 1) {
        const chunks = [];
        for (let i = 0; i < matches.length; i++) {
          const start = matches[i].index;
          const end = i < matches.length - 1 ? matches[i + 1].index : code.length;
          chunks.push(code.substring(start, end).trim());
        }
        
        return chunks.map((chunk, index) => ({
          content: chunk,
          filePath,
          type: 'javascript',
          chunkIndex: index
        }));
      }
    }
  } catch (error) {
    console.log(chalk.yellow(`⚠ Could not split by functions for ${filePath}, using default splitter`));
  }
  
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CONFIG.maxChunkSize,
    chunkOverlap: CONFIG.chunkOverlap,
  });
  
  try {
    const chunks = await splitter.splitText(code);
    return chunks.map((chunk, index) => ({
      content: chunk,
      filePath,
      type: getLanguageFromExtension(extension),
      chunkIndex: index
    }));
  } catch (error) {
    console.error(chalk.red(`✗ Error splitting code for ${filePath}: ${error.message}`));
    return [{
      content: code,
      filePath,
      type: getLanguageFromExtension(extension),
      chunkIndex: 0
    }];
  }
}

// Semantic search function
async function semanticSearch(query) {
  try {
    console.log(chalk.blue('🧠 Generating embedding for query...'));
    const queryEmbedding = await embeddings.embedQuery(query);
    
    const similarities = codeSnippets.map(snippet => {
      const similarity = cosineSimilarity(queryEmbedding, snippet.embedding);
      const contentLower = snippet.content.toLowerCase();
      const queryLower = query.toLowerCase();
      const keywordMatch = contentLower.includes(queryLower) ? 0.2 : 0;
      
      return { 
        ...snippet, 
        similarity: Math.max(similarity, keywordMatch)
      };
    });
    
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    console.log(chalk.blue('📊 Top similarities:'), similarities.slice(0, 5).map(s => chalk.yellow(s.similarity.toFixed(3))).join(', '));
    
    const results = similarities
      .filter(item => item.similarity >= CONFIG.similarityThreshold)
      .slice(0, 10);
    
    console.log(chalk.green(`✓ Found ${results.length} results above threshold`));
    
    if (results.length === 0) {
      const topResults = similarities.slice(0, 3);
      console.log(chalk.yellow('⚠ Showing top 3 results despite low similarity:'));
      topResults.forEach((result, index) => {
        console.log(chalk.cyan(`${index + 1}. ${result.filePath} (Similarity: ${chalk.yellow(result.similarity.toFixed(3))})`));
        console.log(chalk.gray(truncateCode(result.content, 150)));
        console.log('---');
      });
      return topResults;
    }
    
    // Initialize GROQ before getting explanations
    await initializeGroq();
    
    const enhancedResults = await Promise.all(
      results.map(async (result) => {
        try {
          const explanation = await getCodeExplanation(result.content, result.filePath, query);
          return { ...result, explanation };
        } catch (error) {
          console.error(chalk.red(`✗ Error getting explanation for ${result.filePath}: ${error.message}`));
          return { ...result, explanation: "Could not generate explanation" };
        }
      })
    );
    
    return enhancedResults;
  } catch (error) {
    console.error(chalk.red(`✗ Error during semantic search: ${error.message}`));
    
    const textResults = codeSnippets
      .filter(snippet => snippet.content.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
      .map(snippet => ({ ...snippet, similarity: 0.5, explanation: "Text match found" }));
    
    return textResults;
  }
}

// Helper functions
function getLanguageFromExtension(extension) {
  const languageMap = {
    '.js': 'javascript', '.jsx': 'javascript', '.ts': 'typescript', '.tsx': 'typescript',
    '.py': 'python', '.java': 'java', '.c': 'c', '.cpp': 'cpp', '.h': 'c', '.hpp': 'cpp',
    '.rb': 'ruby', '.go': 'go', '.rs': 'rust', '.php': 'php', '.cs': 'csharp'
  };
  return languageMap[extension] || 'unknown';
}

function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getCodeExplanation(code, filePath, query = null) {
  if (!groq) {
    await initializeGroq();
  }
  
  try {
    const prompt = query 
      ? `Explain how this code relates to "${query}":\n\n${code}\n\nFile: ${filePath}`
      : `Explain this code:\n\n${code}\n\nFile: ${filePath}`;
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful code assistant. Provide clear, concise explanations of code snippets."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 500,
    });
    
    return completion.choices[0]?.message?.content || "No explanation available.";
  } catch (error) {
    console.error(chalk.red(`✗ Error getting code explanation: ${error.message}`));
    return "Unable to generate explanation due to an error.";
  }
}

function displayResults(results) {
  if (results.length === 0) {
    console.log(chalk.yellow('❌ No relevant code found for your query.'));
    return;
  }

  console.log(chalk.bgGreen.white.bold('\n 📋 SEARCH RESULTS ') + '\n');

  results.forEach((result, index) => {
    console.log(chalk.green.bold(`\n${index + 1}. ${result.filePath} `) + chalk.yellow(`(Similarity: ${result.similarity.toFixed(3)})`));
    console.log(chalk.blue('🔍 Code snippet:'));
    console.log(chalk.white('─'.repeat(40)));
    console.log(chalk.gray(truncateCode(result.content, 300)));
    console.log(chalk.white('─'.repeat(40)));
    console.log(chalk.cyan('💡 Explanation:'));
    console.log(chalk.white(result.explanation));
    console.log(chalk.white('─'.repeat(40)) + '\n');
  });
}

function truncateCode(code, maxLength) {
  return code.length <= maxLength ? code : code.substring(0, maxLength) + '...';
}

function createHtmlContent(results, query) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Code Aura: ${query}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #0f172a; color: #e2e8f0; }
    .header { text-align: center; margin-bottom: 30px; padding: 20px; background: #1e293b; border-radius: 10px; }
    .result { margin-bottom: 25px; padding: 15px; background: #1e293b; border-radius: 8px; border-left: 4px solid #3b82f6; }
    .file-path { font-weight: bold; color: #60a5fa; margin-bottom: 10px; }
    .similarity { background: #3b82f6; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px; }
    .code-snippet { background: #334155; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 10px 0; font-family: monospace; font-size: 13px; white-space: pre-wrap; }
    .explanation { margin-top: 10px; padding: 10px; background: #475569; border-radius: 6px; font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Code Aura Search Results</h1>
    <h2>Query: "${query}"</h2>
    <p>Found ${results.length} relevant code snippets</p>
    <p>Developed by Harjas Singh | LinkedIn: harjas04 | GitHub: harjas-romana</p>
  </div>
  ${results.map((result, index) => `
    <div class="result">
      <div class="file-path">
        ${index + 1}. ${result.filePath}
        <span class="similarity">Similarity: ${result.similarity.toFixed(3)}</span>
      </div>
      <div class="code-snippet">${escapeHtml(truncateCode(result.content, 500))}</div>
      <div class="explanation">${escapeHtml(result.explanation)}</div>
    </div>
  `).join('')}
</body>
</html>`;
}

async function generateVisualization(results, query) {
  try {
    if (results.length === 0) {
      console.log(chalk.yellow('⚠ No results to visualize.'));
      return;
    }
    
    await nodeHtmlToImage({
      output: './code-aura-results.png',
      html: createHtmlContent(results, query),
      type: 'png',
      quality: 100,
      puppeteerArgs: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
    });
    
    console.log(chalk.green('✓ Visualization saved as code-aura-results.png'));
  } catch (error) {
    console.error(chalk.red(`✗ Error generating visualization: ${error.message}`));
    try {
      await fs.writeFile('./code-aura-results.html', createHtmlContent(results, query));
      console.log(chalk.green('✓ HTML visualization saved as code-aura-results.html'));
    } catch (htmlError) {
      console.error(chalk.red(`✗ Error creating HTML file: ${htmlError.message}`));
    }
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace (/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

program.parse(process.argv);