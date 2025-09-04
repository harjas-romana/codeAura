#!/usr/bin/env node
import { indexRepository } from '../src/indexer.js';
import chalk from 'chalk';

async function testFullIndexing() {
  try {
    // Test with the frontend directory (or any small test directory)
    const testPath = '/Users/harjas/Desktop/Misc/codeAura/frontend';
    console.log(`Testing indexing on: ${testPath}`);
    
    const result = await indexRepository(testPath);
    
    console.log(chalk.green('✅ Indexing completed successfully!'));
    console.log(`Project directory: ${result.projectDir}`);
    console.log(`Total chunks created: ${result.chunks.length}`);
    
    // Show the first 3 chunks as a sample
    console.log('\n📋 Sample chunks:');
    result.chunks.slice(0, 3).forEach((chunk, index) => {
      console.log(`\n--- Chunk ${index + 1} ---`);
      console.log(`File: ${chunk.filePath}`);
      console.log(`Lines: ${chunk.startLine}-${chunk.endLine}`);
      console.log(`Code:\n${chunk.code}`);
      console.log('----------------');
    });
    
  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error);
  }
}

testFullIndexing();