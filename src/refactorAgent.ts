import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as z from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { getRefactorSystemPrompt } from './utils/utils';

dotenv.config();

// Define the refactoring result schema
const refactoringSchema = z.object({
   keyProblems: z.array(z.string()).describe('Identified architectural issues'),
   strategy: z.string().describe('High-level refactoring approach'),
   updatedFiles: z.array(
      z.object({
         filePath: z.string().describe('Absolute path to the updated file'),
         updatedCode: z.string().describe('Full updated file contents'),
         changeSummary: z.string().describe('Summary of the applied change'),
      })
   ).describe('Files that were modified'),
   improvements: z.string().describe('Performance and maintainability benefits'),
   furtherImprovements: z.array(z.string()).describe('Optional enhancements'),
});

type RefactoringResult = z.infer<typeof refactoringSchema>;

type FileContent = {
   filePath: string;
   content: string;
};

const gpt35 = new ChatOpenAI({
   model: 'gpt-3.5-turbo',
   apiKey: process.env.OPENAI_API_KEY,
   temperature: 0.1,
});

const gpt4 = new ChatOpenAI({
   model: 'gpt-4o',
   apiKey: process.env.OPENAI_API_KEY,
   temperature: 0.1,
});

// Step 1: Fast contextualization with GPT-3.5
async function contextualizeQuery(prompt: string, filePaths: string[]) {
   const response = await gpt35.invoke([
      {
         role: 'user',
         content: `Analyze the requested change:

        Request: ${prompt}
        Files: ${filePaths.join(', ')}
       
       Identify:
       1. File types and purposes
       2. Key refactoring areas needed to satisfy the request
       3. Priority level (high/medium/low)
       
       Be concise.`,
      },
   ]);

   return response.content as string;
}

// Retrieval: Pure file system I/O (no LLM)
async function retrieveFileContent(filePaths: string[]): Promise<FileContent[]> {
   return Promise.all(
      filePaths.map((filePath) =>
         fs.promises.readFile(filePath, 'utf8').then((content) => ({ filePath, content }))
      )
   );
}

function normalizeFilePath(filePath: string) {
   return path.resolve(filePath).toLowerCase();
}

// Reasoning: Fast GPT-3.5 analysis
async function analyzeRefactoringNeeds(prompt: string, context: string) {
   const response = await gpt35.invoke([
      {
         role: 'user',
         content: `Based on the request and context below:

        Request: ${prompt}
        Context: ${context}
       
       Provide metadata:
       - primary_issue: (string)
      - refactoring_type: (enum: 'state_management' | 'logic_extraction' | 'hook_separation' | 'other')
      - complexity: (enum: 'low' | 'medium' | 'high')
      - estimated_scope: (enum: 'single_file' | 'multi_file' | 'full_codebase')
      
      JSON format only.`,
      },
   ]);

   // Ensure we only parse the JSON part if there's markdown wrapping
   const content = (response.content as string).replace(/```json|```/g, '').trim();
   return JSON.parse(content);
}

// Step 2: Run retrieval and reasoning in parallel
async function parallelPreprocessing(filePaths: string[], prompt: string, context: string) {
   const [retrievedContent, analysisMetadata] = await Promise.all([
      // Path A: Retrieval (file system lookup)
      retrieveFileContent(filePaths),

      // Path B: Reasoning (GPT-3.5 analysis)
      analyzeRefactoringNeeds(prompt, context),
   ]);

   return { retrievedContent, analysisMetadata };
}

// Step 3: Final synthesis with GPT-4
async function synthesizeRefactoredCode(
   files: FileContent[],
   analysisMetadata: any,
   prompt: string,
   contextSummary: string
): Promise<RefactoringResult> {
   const systemPrompt = `You are a Senior Frontend Engineer.
 Task: Refactor provided code based on the request and pre-analysis metadata.
 Focus: ${analysisMetadata.primary_issue}
 Complexity level: ${analysisMetadata.complexity}`;

   const response = await gpt4.invoke([
      {
         role: 'system',
         content: systemPrompt,
      },
      {
         role: 'user',
         content: `Request:
${prompt}

Pre-analysis indicates:
 - Issue: ${analysisMetadata.primary_issue}
 - Type: ${analysisMetadata.refactoring_type}
 - Scope: ${analysisMetadata.estimated_scope}
 - Context Summary: ${contextSummary}

Code files:
${files.map(({ filePath, content }, i) => `File ${i + 1}: ${filePath}\n${content}`).join('\n---\n')}

Return JSON only with these top-level keys:
- keyProblems: string[]
- strategy: string
- updatedFiles: [{ filePath: string, updatedCode: string, changeSummary: string }]
- improvements: string
- furtherImprovements: string[]

Only include files from the provided input set and return full file contents for each updated file.`,
      },
   ]);

   const content = (response.content as string).replace(/```json|```/g, '').trim();
   return refactoringSchema.parse(JSON.parse(content));
}

function validateUpdatedFiles(result: RefactoringResult, files: FileContent[]) {
   const allowedFiles = new Set(files.map((file) => normalizeFilePath(file.filePath)));

   for (const file of result.updatedFiles) {
      if (!allowedFiles.has(normalizeFilePath(file.filePath))) {
         throw new Error(`Refactor output referenced an unexpected file: ${file.filePath}`);
      }
   }
}

async function writeRefactoredFiles(result: RefactoringResult) {
   const writtenFiles = await Promise.all(
      result.updatedFiles.map(async (file) => {
         await fs.promises.writeFile(file.filePath, file.updatedCode, 'utf8');
         return file.filePath;
      })
   );

   return writtenFiles;
}

// Step 4: Main task agent function
async function refactorAgent(filePaths: string[]) {
   const reviewPrompt = await getRefactorSystemPrompt("");
   try {
      // Step 1: Quick contextualization (GPT-3.5)
      console.log('📋 Contextualizing query...');
      const contextSummary = await contextualizeQuery(reviewPrompt, filePaths);

      // Step 2: Parallel retrieval + reasoning (No token waste)
      console.log('⚡ Parallel processing...');
      const { retrievedContent, analysisMetadata } = await parallelPreprocessing(
         filePaths,
         reviewPrompt,
         contextSummary
      );

      // Step 3: Final synthesis (GPT-4 only)
      console.log('🧠 Synthesizing refactored code...');
      const result = await synthesizeRefactoredCode(
         retrievedContent,
         analysisMetadata,
         reviewPrompt,
         contextSummary
      );

      validateUpdatedFiles(result, retrievedContent);

      console.log('✍️ Writing updates to shared files...');
      const writtenFiles = await writeRefactoredFiles(result);

      console.log('✅ Refactoring complete');
      return {
         ...result,
         writtenFiles,
      };
   } catch (error) {
      console.error('Task Agent Error:', error);
      throw error;
   }
}

export default refactorAgent;
