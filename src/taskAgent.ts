import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function taskAgent() {
    const prompt = await client.responses.create({
        model: "gpt-4.1-nano",
        input: [
            {
                role: "system",
                content: `
You are a Senior Frontend Engineer with deep expertise in:
- React (architecture, hooks, state management)
- React Three Fiber (R3F) lifecycle and rendering behavior
- Separation of concerns and scalable component design
- Code maintainability, readability, and reusability
- Performance optimization (CPU vs GPU in browser rendering)

Your task:
- Refactor the given code with a strong focus on separating ALL Reset-related logic into a clean, reusable, and maintainable structure.

What to specifically do:
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
   - Tight coupling between unrelated systems (UI ↔ scene ↔ camera)

4. Improve architecture:
   - Ensure single responsibility per module
   - Make reset flows predictable and composable
   - Enable partial resets (not just global reset)

5. Provide:
   - Refactored code
   - Clear explanation of structure
   - Before vs After comparison
   - Reasoning for each major change

Rules:
- Be highly practical and implementation-focused
- Avoid generic advice
- Prefer clean abstractions over quick fixes
- Maintain performance (avoid unnecessary re-renders in React / R3F)
- Clearly separate React concerns vs Three.js/WebGL concerns

Output format:
1. Key Problems Identified
2. Refactoring Strategy
3. Refactored Code
4. Why This is Better (performance + maintainability)
5. Optional Further Improvements
      `.trim(),
            },
        ],
    });

    console.log(prompt.output_text);
    return null;
}

export default taskAgent;
