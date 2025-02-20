import { promises as fs } from 'fs';
import { ResearchOutput } from './types';

/**
 * Reads a markdown file and returns its contents as a ResearchOutput object
 */
export async function readMarkdownFile(
  path: string,
  source: 'perplexity' | 'deep-research'
): Promise<ResearchOutput> {
  try {
    const content = await fs.readFile(path, 'utf-8');
    return {
      path,
      source,
      content,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read markdown file at ${path}: ${errorMessage}`);
  }
}

/**
 * Writes content to a markdown file
 */
export async function writeMarkdownFile(path: string, content: string): Promise<void> {
  try {
    await fs.writeFile(path, content, 'utf-8');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to write markdown file to ${path}: ${errorMessage}`);
  }
} 