import { runPythonQuery } from './pythonRunner';
import { spawn } from 'child_process';
import { processDocs } from "../markdown-tools/combine-markdown-docs";
import fs from "fs/promises";
import path from "path";

async function runDeepResearch(query: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn('npx', ['tsx', 'src/run.ts', query], {
      stdio: 'inherit'
    });

    process.on('close', (code) => {
      if (code === 0) {
        console.log('Deep Research completed successfully');
        resolve();
      } else {
        reject(new Error(`Deep Research failed with code ${code}`));
      }
    });
  });
}

async function main() {
  const query = process.argv[2];
  if (!query) {
    console.error('Please provide a research query as an argument');
    process.exit(1);
  }

  console.log('\n=== Starting Research Process ===\n');
  
  try {
    // First run Perplexity
    console.log('Step 1: Running Perplexity Provider...\n');
    const perplexityOutputPath = await runPythonQuery(query);
    
    console.log('\n=== Perplexity Complete ===');
    console.log(`Output saved to: ${perplexityOutputPath}\n`);

    // Then run Deep Research
    console.log('Step 2: Running Deep Research...\n');
    await runDeepResearch(query);
    
    console.log('\n=== Research Complete ===\n');
    console.log('Both providers have completed successfully!');
    console.log('Output files:');
    console.log(`1. Perplexity: ${perplexityOutputPath}`);
    console.log('2. Deep Research: output.md');

    // Step 3: Combine output files using the combine-markdown-docs tool
    console.log('Step 3: Combining output files...\n');
    
    // Log file existence checks
    console.log('Checking input files...');
    console.log('Current working directory:', process.cwd());
    
    const rootDir = process.cwd();
    const perplexityPath = path.join(rootDir, 'perplexity-output.md');
    const deepResearchPath = path.join(rootDir, 'output.md');
    const combinedOutputPath = path.join(rootDir, 'combined_output.md');
    
    try {
      await fs.access(perplexityPath);
      console.log(`✓ Found ${perplexityPath}`);
    } catch (e) {
      throw new Error(`Could not find ${perplexityPath} in directory ${rootDir}`);
    }
    
    try {
      await fs.access(deepResearchPath);
      console.log(`✓ Found ${deepResearchPath}`);
    } catch (e) {
      throw new Error(`Could not find ${deepResearchPath} in directory ${rootDir}`);
    }

    console.log('Starting document combination process...');
    console.log(`Combining:\n1. ${perplexityPath}\n2. ${deepResearchPath}`);
    
    // Add more detailed logging around the processDocs call
    console.log('Calling processDocs...');
    const combined = await processDocs(
      perplexityPath,
      deepResearchPath
    );
    console.log('Received response from processDocs');
    
    console.log('Writing combined output...');
    await fs.writeFile(combinedOutputPath, combined);
    console.log(`✓ Combined output created at: ${combinedOutputPath}`);

  } catch (error) {
    console.error('\nResearch process failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 