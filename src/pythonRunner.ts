import { spawn } from 'child_process';
import path from 'path';

/**
 * Runs a query through the Python provider
 * Returns the path to the markdown output file
 */
export function runPythonQuery(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'run_query.py');
    
    // Set PYTHONPATH to include the project root
    const env = {
      ...process.env,
      PYTHONPATH: process.cwd()
    };
    
    // Configure stdio:
    // - STDIN: inherit (for interactive input)
    // - STDOUT: pipe (to capture file path)
    // - STDERR: inherit (to see progress messages)
    const pythonProcess = spawn('python', [scriptPath, query], {
      stdio: ['inherit', 'pipe', 'inherit'],
      env
    });

    let output = '';

    // Collect STDOUT (file path)
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        // Trim the output to get just the file path
        const filePath = output.trim();
        if (filePath) {
          resolve(filePath);
        } else {
          reject(new Error('No output file path received'));
        }
      } else {
        reject(new Error(`Python process exited with code ${code}`));
      }
    });
  });
}

// Example usage if run directly
if (require.main === module) {
  const query = process.argv[2];
  if (!query) {
    console.error('Please provide a query as an argument');
    process.exit(1);
  }

  runPythonQuery(query)
    .then((filePath) => {
      console.log('\nQuery completed successfully!');
      console.log(`Markdown file saved to: ${filePath}`);
    })
    .catch((error) => {
      console.error('Error:', error.message);
      process.exit(1);
    });
} 