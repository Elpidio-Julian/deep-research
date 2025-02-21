import { config } from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { marked } from "marked";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import fs from "fs/promises";
import path from "path";

config();

// Initialize models and tools
const model = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0,
});

const embeddings = new OpenAIEmbeddings();
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 100,
});

// Define types
interface ProcessedDocument {
  content: string;
  sources: string;
}

// Create prompts
const compareDocsPrompt = ChatPromptTemplate.fromTemplate(`
You are analyzing two related sections from markdown documents. Compare them and create a combined version that:
1. Merges overlapping information
2. Preserves unique points from each
3. Maintains a coherent flow

First section:
{section1}

Second section:
{section2}

Combined version:
`);

const combineSourcesPrompt = ChatPromptTemplate.fromTemplate(`
Combine and deduplicate these sources, maintaining proper markdown footnote format.
Ensure each source keeps its original reference number if possible.

Sources from first document:
{sources1}

Sources from second document:
{sources2}

Combined sources:
`);

// Helper function to load and process a markdown file
async function loadMDFile(filePath: string): Promise<ProcessedDocument> {
  console.log(`Loading markdown file: ${filePath}`);
  const content = await fs.readFile(filePath, "utf-8");
  console.log(`File loaded, content length: ${content.length} characters`);
  
  console.log('Tokenizing markdown content...');
  const tokens = marked.lexer(content);
  let mainContent: string[] = [];
  let sources: string[] = [];
  const footnotePattern = /\[\^[^\]]+\]:.+/;

  console.log('Processing markdown tokens...');
  function processToken(token: any) {
    if (token.type === 'paragraph' && 'text' in token && footnotePattern.test(token.text)) {
      sources.push(token.text);
    } else if ('raw' in token) {
      mainContent.push(token.raw);
    }
    if ('tokens' in token && token.tokens) {
      token.tokens.forEach(processToken);
    }
  }

  tokens.forEach(processToken);
  console.log(`Processed ${tokens.length} tokens`);
  console.log(`Found ${sources.length} sources`);

  return {
    content: mainContent.join('\n'),
    sources: sources.join('\n')
  };
}

// Find similar sections between two documents
async function findSimilarSections(doc1: ProcessedDocument, doc2: ProcessedDocument): Promise<Array<{ doc1Section: string; doc2Section: string }>> {
  console.log('Starting to find similar sections between documents');
  
  console.log('Creating document chunks for doc1...');
  const doc1Chunks = await textSplitter.createDocuments([doc1.content]);
  console.log(`Created ${doc1Chunks.length} chunks for doc1`);
  
  console.log('Creating document chunks for doc2...');
  const doc2Chunks = await textSplitter.createDocuments([doc2.content]);
  console.log(`Created ${doc2Chunks.length} chunks for doc2`);

  console.log('Creating vector store from doc1 chunks...');
  const vectorStore1 = await MemoryVectorStore.fromDocuments(doc1Chunks, embeddings);
  console.log('Vector store created');

  const similarSections: Array<{ doc1Section: string; doc2Section: string }> = [];
  const processedChunks = new Set<string>();

  console.log(`Processing ${doc2Chunks.length} chunks from doc2 for similarity...`);
  for (const chunk of doc2Chunks) {
    console.log('Searching for similar content...');
    const results = await vectorStore1.similaritySearch(chunk.pageContent, 1);
    if (results[0]) {
      similarSections.push({
        doc1Section: results[0].pageContent,
        doc2Section: chunk.pageContent,
      });
      processedChunks.add(chunk.pageContent);
      processedChunks.add(results[0].pageContent);
    }
  }

  console.log('Processing remaining chunks from doc1...');
  for (const chunk of doc1Chunks) {
    if (!processedChunks.has(chunk.pageContent)) {
      similarSections.push({
        doc1Section: chunk.pageContent,
        doc2Section: "",
      });
    }
  }

  console.log(`Found ${similarSections.length} total sections to combine`);
  return similarSections;
}

// Combine sections using a prompt
async function combineSections(similarSections: Array<{ doc1Section: string; doc2Section: string }>): Promise<string> {
  console.log('Starting to combine sections');
  let combinedContent = "";
  
  for (const section of similarSections) {
    if (!section.doc2Section) {
      console.log('No matching section in doc2, using doc1 content directly');
      combinedContent += section.doc1Section + '\n\n';
    } else {
      console.log('Combining matching sections using AI...');
      const result = await compareDocsPrompt
        .pipe(model)
        .pipe(new StringOutputParser())
        .invoke({
          section1: section.doc1Section,
          section2: section.doc2Section,
        });
      console.log('AI combination complete for this section');
      combinedContent += result + '\n\n';
    }
  }
  
  console.log('All sections combined');
  return combinedContent;
}

// Combine sources using a prompt
async function combineSources(sources1: string, sources2: string): Promise<string> {
  console.log('Starting to combine sources');
  console.log(`Sources1 length: ${sources1.length}, Sources2 length: ${sources2.length}`);
  
  const combinedSources = await combineSourcesPrompt
    .pipe(model)
    .pipe(new StringOutputParser())
    .invoke({
      sources1,
      sources2,
    });
  
  console.log('Sources combined successfully');
  return combinedSources;
}

// Main processing function
async function processDocs(file1Path: string, file2Path: string): Promise<string> {
  console.log('\n=== Starting Document Processing ===');
  console.log(`Processing files:\n1. ${file1Path}\n2. ${file2Path}`);

  console.log('\nLoading documents...');
  const doc1 = await loadMDFile(file1Path);
  const doc2 = await loadMDFile(file2Path);
  console.log('Both documents loaded successfully');

  console.log('\nFinding similar sections...');
  const similarSections = await findSimilarSections(doc1, doc2);
  console.log('Similar sections identified');

  console.log('\nCombining content sections...');
  const combinedContent = await combineSections(similarSections);
  console.log('Content sections combined');

  console.log('\nCombining sources...');
  const combinedSources = await combineSources(doc1.sources, doc2.sources);
  console.log('Sources combined');

  console.log('\n=== Document Processing Complete ===\n');
  return `${combinedContent}\n\n${combinedSources}`;
}

// Run the process
async function main() {
  try {
    const scriptDir = path.dirname(new URL(import.meta.url).pathname);
    const doc1Path = path.join(scriptDir, "doc1.md");
    const doc2Path = path.join(scriptDir, "doc2.md");
    const outputPath = path.join(scriptDir, "combined_output.md");
    
    const result = await processDocs(doc1Path, doc2Path);
    await fs.writeFile(outputPath, result);
    console.log("Documents successfully combined!");
  } catch (error) {
    console.error("Error processing documents:", error);
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}
export { processDocs }; 