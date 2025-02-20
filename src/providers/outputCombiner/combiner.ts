import { CombinerConfig, ResearchOutput } from './types';
import { readMarkdownFile, writeMarkdownFile } from './fileUtils';

/**
 * Combines research outputs from Perplexity and Deep Research
 */
export async function combineResearchOutputs(config: CombinerConfig): Promise<void> {
  try {
    // 1. Read both markdown files
    const perplexityOutput = await readMarkdownFile(
      config.perplexityPath,
      'perplexity'
    );
    
    const deepResearchOutput = await readMarkdownFile(
      config.deepResearchPath,
      'deep-research'
    );

    // 2. For now, just combine them with a simple separator
    const combinedContent = [
      '# Combined Research Output\n',
      '## Perplexity Research\n',
      perplexityOutput.content,
      '\n---\n',
      '## Deep Research Output\n',
      deepResearchOutput.content
    ].join('\n');

    // 3. Write the combined output
    await writeMarkdownFile(config.outputPath, combinedContent);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to combine research outputs: ${errorMessage}`);
  }
} 