import { config } from 'dotenv';
// Load environment variables from .env.local before any other imports
config({ path: '.env.local' });

import * as fs from 'fs/promises';
import * as readline from 'readline';

import { deepResearch, writeFinalReport } from './deep-research';
import { generateFeedback } from './feedback';
import { OutputManager } from './output-manager';

const output = new OutputManager();

// Helper function for consistent logging
function log(...args: any[]) {
  output.log(...args);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to get user input
function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer);
    });
  });
}

// run the agent
async function run(query?: string) {
  // Get initial query
  const initialQuery = query || await askQuestion('What would you like to research? ');

  // Get breath and depth parameters with defaults
  const breadth = 4;  // default breadth
  const depth = 2;    // default depth

  log(`Creating research plan...`);

  // Generate follow-up questions
  const followUpQuestions = await generateFeedback({
    query: initialQuery,
  });

  // When query is provided, use default answers to keep it non-interactive
  const answers = query 
    ? followUpQuestions.map(() => "Proceed with default approach") 
    : await Promise.all(followUpQuestions.map(async (question) => {
        return await askQuestion(`\n${question}\nYour answer: `);
      }));

  // Combine all information for deep research
  const combinedQuery = `
Initial Query: ${initialQuery}
Follow-up Questions and Answers:
${followUpQuestions.map((q: string, i: number) => `Q: ${q}\nA: ${answers[i]}`).join('\n')}
`;

  log('\nResearching your topic...');
  log('\nStarting research with progress tracking...\n');
  
  const { learnings, visitedUrls } = await deepResearch({
    query: combinedQuery,
    breadth,
    depth,
    onProgress: (progress) => {
      output.updateProgress(progress);
    },
  });

  log(`\n\nLearnings:\n\n${learnings.join('\n')}`);
  log(`\n\nVisited URLs (${visitedUrls.length}):\n\n${visitedUrls.join('\n')}`);
  log('Writing final report...');

  const report = await writeFinalReport({
    prompt: combinedQuery,
    learnings,
    visitedUrls,
  });

  // Save report to file
  await fs.writeFile('output.md', report, 'utf-8');

  console.log(`\n\nFinal Report:\n\n${report}`);
  console.log('\nReport has been saved to output.md');
  rl.close();
}

// If run directly, check for command line argument
if (require.main === module) {
  const query = process.argv[2];
  run(query);
}
