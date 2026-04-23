import dotenv from 'dotenv';
import * as fs from 'fs';
import * as z from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { createAgent, tool } from 'langchain';

dotenv.config();

// Define the refactoring result schema
const refactoringSchema = z.object({
   keyProblems: z.array(z.string()).describe('Identified architectural issues'),
   strategy: z.string().describe('High-level refactoring approach'),
   refactoredCode: z.string().describe('The refactored code'),
   improvements: z.string().describe('Performance and maintainability benefits'),
   furtherImprovements: z.array(z.string()).describe('Optional enhancements'),
});

// Tool to provide file content to the agent
const getFileContent = tool(
   async ({ filePath }: { filePath: string }) => {
      if (fs.existsSync(filePath)) {
         return fs.readFileSync(filePath, 'utf8');
      }
      return `File not found: ${filePath}`;
   },
   {
      name: 'get_file_content',
      description: 'Retrieve the content of a TypeScript/TSX file',
      schema: z.object({
         filePath: z.string().describe('Full path to the file'),
      }),
   }
);

const model = new ChatOpenAI({
   model: 'gpt-4o',
   apiKey: process.env.OPENAI_API_KEY,
   temperature: 0.1,
});

async function taskAgent(filePaths: string[]) {
   const systemPrompt = `You are a Senior Frontend Engineer with deep expertise in:
- React (architecture, hooks, state management)
- React Three Fiber (R3F) lifecycle and rendering behavior
- Separation of concerns and scalable component design
- Code maintainability, readability, and reusability
- Performance optimization (CPU vs GPU in browser rendering)

Your task:
1. Identify all "reset" responsibilities across the codebase:
   - State resets (React state, refs)
   - Scene resets (R3F objects, meshes, camera)
   - UI resets (controls, selections, forms)
   - Side effects (effects, subscriptions, listeners)

2. Extract reset logic into:
   - Dedicated hooks (e.g., useResetScene, useResetCamera)
   - Utility functions where appropriate
   - Clearly defined boundaries (no mixed concerns)

3. Eliminate anti-patterns:
   - Duplicate reset logic
   - Inline reset code inside components
   - Tight coupling between unrelated systems

4. Provide refactored code with clear explanations.`;

   const agent = createAgent({
      model,
      tools: [getFileContent],
      systemPrompt,
      responseFormat: refactoringSchema,
   });

   try {
      const fileList = filePaths.join(', ');
      const result = await agent.invoke({
         messages: [
            {
               role: 'user',
               content: `Analyze and refactor these files for better reset logic separation: ${fileList}. 
                    
                    Please provide:
                    1. Key Problems Identified
                    2. Refactoring Strategy
                    3. Refactored Code
                    4. Why This is Better
                    5. Optional Further Improvements`,
            },
         ],
      });

      const response = result.messages.at(-1)?.content;
      console.log('Agent Analysis:', response);
      return response;
   } catch (error) {
      console.error('Task Agent Error:', error);
      throw error;
   }
}

export default taskAgent;
