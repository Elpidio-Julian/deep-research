export * from './types';
export * from './fileUtils';
export * from './combiner';

// Example usage:
if (require.main === module) {
  const config = {
    perplexityPath: process.argv[2] || './perplexity-output.md',
    deepResearchPath: process.argv[3] || './output.md',
    outputPath: process.argv[4] || './combined-output.md'
  };

  combineResearchOutputs(config)
    .then(() => console.log('Successfully combined research outputs'))
    .catch(error => {
      console.error('Error combining research outputs:', error);
      process.exit(1);
    });
} 