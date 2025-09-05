#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import { startServer } from './server.js';
import { indexRepository } from './indexer.js';
import { searchInTerminal } from './terminal-search.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

// Check for required environment variables
if (!process.env.GROQ_API_KEY) {
  console.warn(chalk.yellow('⚠️  GROQ_API_KEY not set. AI features will be disabled.'));
  console.warn(chalk.yellow('   Get your free API key at: https://console.groq.com/'));
}

// Enhanced CLI with better UX
const program = new Command();

// Add fancy banner
console.log(
  chalk.blue(
    figlet.textSync('CodeAura', {
      font: 'Big',
      horizontalLayout: 'default',
      verticalLayout: 'default',
      font: 'Big Money-ne',
    })
  )
);

program
  .name('codeaura')
  .description('CLI tool to index and semantically search your codebase.')
  .version('1.0.0')
  .argument('[path]', 'path to the project directory or GitHub URL', process.cwd())
  .option('-p, --prompt <query>', 'search query to execute immediately')
  .option('-s, --server', 'start web server interface', false)
  .option('-q, --port <number>', 'port for web server', '3000')
  .option('-d, --debug', 'enable debug mode with verbose logging', false)
  .option('-f, --force', 'force re-indexing of codebase', false)
  .action(async (path, options) => {
    const startTime = Date.now();
    
    if (options.debug) {
      console.log(chalk.gray(`🔧 Debug mode enabled`));
      console.log(chalk.gray(`📁 Working directory: ${path}`));
      console.log(chalk.gray(`⚙️ Options: ${JSON.stringify(options, null, 2)}`));
    }
    
    console.log(chalk.blue(`🔮 CodeAura is indexing: ${path}`));
    
    try {
      // 1. Index the Code
      const { collection, projectDir, stats } = await indexRepository(path, {
        forceReindex: options.force,
        debug: options.debug
      });
      
      const indexingTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(chalk.green(`✅ Indexing complete! Processed ${stats.fileCount} files in ${indexingTime}s`));
      
      if (options.debug) {
        console.log(chalk.gray(`📊 Index stats: ${JSON.stringify(stats, null, 2)}`));
      }

      // 2. Handle different modes
      if (options.prompt) {
        // Terminal mode: search and display results in terminal
        await searchInTerminal(collection, options.prompt, { debug: options.debug });
        process.exit(0); // Exit after showing results
      } else if (options.server) {
        // Server mode: start web interface
        startServer(projectDir, collection, parseInt(options.port));
      } else {
        // Interactive mode or default behavior
        console.log(chalk.yellow('\n💡 Usage tips:'));
        console.log(chalk.yellow('  - Use -p "your query" for immediate search'));
        console.log(chalk.yellow('  - Use -s to start web server'));
        console.log(chalk.yellow('  - Use --port to specify server port (default: 3000)'));
        console.log(chalk.yellow('  - Use --force to force re-indexing'));
        console.log(chalk.yellow('  - Use --debug for verbose output'));
        console.log(chalk.yellow('\n🚀 Example: codeaura /path/to/project -p "show authentication logic"'));
        process.exit(0);
      }

    } catch (error) {
      console.error(chalk.red('❌ Error:'), error.message);
      if (options.debug) {
        console.error(chalk.red('🔍 Stack trace:'), error.stack);
      }
      process.exit(1);
    }
  });

// Add better error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('💥 Uncaught Exception:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('💥 Unhandled Rejection at:'), promise, 'reason:', reason);
  process.exit(1);
});

program.parse();