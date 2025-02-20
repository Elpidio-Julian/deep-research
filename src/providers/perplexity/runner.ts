import { spawn } from 'child_process';
import path from 'path';

/**
 * Runs the Perplexity provider through Python
 */
export async function runPerplexityProvider(query: string): Promise<void> {
  console.log('Starting Perplexity Provider...');
  console.log('Query:', query);
  
  const scriptPath = path.join(process.cwd(), 'scripts', 'run_perplexity.py');
  
  // Run the Python script with inherited stdio for full interactive support
  const pythonProcess = spawn('python', [scriptPath, query], {
    stdio: 'inherit', // This ensures full interactive terminal access
  });

  return new Promise((resolve, reject) => {
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Perplexity Provider completed successfully');
        resolve();
      } else {
        reject(new Error(`Perplexity Provider failed with code ${code}`));
      }
    });
  });
}

// If run directly
if (require.main === module) {
  const query = process.argv[2];
  if (!query) {
    console.error('Please provide a query as an argument');
    process.exit(1);
  }

  runPerplexityProvider(query)
    .catch((error) => {
      console.error('Error:', error.message);
      process.exit(1);
    });
} 