import { runPythonQuery } from './pythonRunner';
import { spawn } from 'child_process';

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
    console.log('2. Deep Research: ./output.md');
    
  } catch (error) {
    console.error('\nResearch process failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 