#!/usr/bin/env node
// This lets you run this file directly: node test-file-walker.js

import klawSync from 'klaw-sync';
import path from 'path';

// 1. Paste your function here (or import it if it's in another file)
async function getAllCodeFiles(dirPath) {
  const ignoredDirs = ['node_modules', '.git', 'dist', 'build'];
  const targetExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.css', '.html'];

  try {
    const allItems = klawSync(dirPath, {
      nodir: true,
      filter: (item) => {
        const filePath = item.path;
        const shouldIgnore = ignoredDirs.some(ignoredDir => filePath.includes(`/${ignoredDir}/`));
        if (shouldIgnore) {
          return false;
        }
        const hasValidExtension = targetExtensions.some(ext => filePath.endsWith(ext));
        return hasValidExtension;
      }
    });
    const codeFilePaths = allItems.map(item => item.path);
    console.log(`📁 Found ${codeFilePaths.length} code files to index.`);
    return codeFilePaths;
  } catch (error) {
    console.error('❌ Error walking the directory structure:', error);
    throw error;
  }
}

// 2. Call your function with a test path
// Get the path from the command line argument, or use the current directory
const testPath = process.argv[2] || process.cwd(); 
console.log(`Testing on path: ${testPath}`);

// 3. Run the function and print the results
getAllCodeFiles(testPath)
  .then(fileList => {
    console.log("Here are the files I found:");
    // Print each file path on a new line
    fileList.forEach(file => console.log("  - " + file));
  })
  .catch(console.error);