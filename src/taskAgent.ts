import dotenv from 'dotenv';
import * as fs from 'fs';
import * as z from 'zod';
import { ChatOpenAI } from '@langchain/openai';

dotenv.config();

// Define the refactoring result schema
const refactoringSchema = z.object({
   keyProblems: z.array(z.string()).describe('Identified architectural issues'),
   strategy: z.string().describe('High-level refactoring approach'),
   refactoredCode: z.string().describe('The refactored code'),
   improvements: z.string().describe('Performance and maintainability benefits'),
   furtherImprovements: z.array(z.string()).describe('Optional enhancements'),
});

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
async function contextualizeQuery(filePaths: string[]) {
   const response = await gpt35.invoke([
      {
         role: 'user',
         content: `Analyze what's needed: ${filePaths.join(', ')}
      
      Identify:
      1. File types and purposes
      2. Key refactoring areas (reset logic, state management, etc.)
      3. Priority level (high/medium/low)
      
      Be concise.`,
      },
   ]);

   return response.content as string;
}

// Retrieval: Pure file system I/O (no LLM)
async function retrieveFileContent(filePaths: string[]) {
   return Promise.all(
      filePaths.map((path) =>
         fs.promises.readFile(path, 'utf8').catch(() => `File not found: ${path}`)
      )
   );
}

// Reasoning: Fast GPT-3.5 analysis
async function analyzeRefactoringNeeds(context: string) {
   const response = await gpt35.invoke([
      {
         role: 'user',
         content: `Based on: ${context}
      
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
async function parallelPreprocessing(filePaths: string[], context: string) {
   const [retrievedContent, analysisMetadata] = await Promise.all([
      // Path A: Retrieval (file system lookup)
      retrieveFileContent(filePaths),

      // Path B: Reasoning (GPT-3.5 analysis)
      analyzeRefactoringNeeds(context),
   ]);

   return { retrievedContent, analysisMetadata };
}

// Step 3: Final synthesis with GPT-4
async function synthesizeRefactoredCode(
   fileContents: string[],
   analysisMetadata: any,
   contextSummary: string
) {
   const systemPrompt = `You are a Senior Frontend Engineer.
Task: Refactor provided code based on pre-analysis metadata.
Focus: ${analysisMetadata.primary_issue}
Complexity level: ${analysisMetadata.complexity}`;

   const response = await gpt4.invoke([
      {
         role: 'system',
         content: systemPrompt,
      },
      {
         role: 'user',
         content: `Pre-analysis indicates:
- Issue: ${analysisMetadata.primary_issue}
- Type: ${analysisMetadata.refactoring_type}
- Scope: ${analysisMetadata.estimated_scope}
- Context Summary: ${contextSummary}

Code files:
${fileContents.map((content, i) => `File ${i + 1}:\n${content}`).join('\n---\n')}

Provide refactored code with explanations using the schema: ${JSON.stringify(refactoringSchema)}`,
      },
   ]);

   return response.content;
}

// Step 4: Main task agent function
async function taskAgent(filePaths: string[]) {
   try {
      // Step 1: Quick contextualization (GPT-3.5)
      console.log('📋 Contextualizing query...');
      const contextSummary = await contextualizeQuery(filePaths);

      // Step 2: Parallel retrieval + reasoning (No token waste)
      console.log('⚡ Parallel processing...');
      const { retrievedContent, analysisMetadata } = await parallelPreprocessing(
         filePaths,
         contextSummary
      );

      // Step 3: Final synthesis (GPT-4 only)
      console.log('🧠 Synthesizing refactored code...');
      const result = await synthesizeRefactoredCode(
         retrievedContent,
         analysisMetadata,
         contextSummary
      );

      console.log('✅ Refactoring complete');
      return result;
   } catch (error) {
      console.error('Task Agent Error:', error);
      throw error;
   }
}

export default taskAgent;
