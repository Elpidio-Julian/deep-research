/**
 * Represents a research output from either Perplexity or Deep Research
 */
export interface ResearchOutput {
  /** Path to the markdown file */
  path: string;
  /** Source of the research - either 'perplexity' or 'deep-research' */
  source: 'perplexity' | 'deep-research';
  /** The content of the markdown file */
  content: string;
}

/**
 * Configuration for the output combiner
 */
export interface CombinerConfig {
  /** Path to the Perplexity markdown file */
  perplexityPath: string;
  /** Path to the Deep Research markdown file */
  deepResearchPath: string;
  /** Path where the combined output should be saved */
  outputPath: string;
} 