// import OpenAI from "openai";
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { ChatOpenAI } from "@langchain/openai";
import dotenv from 'dotenv';

dotenv.config();

async function getReviewSystemPrompt() {
  const promptPath = join(process.cwd(), "Babylon_Prompt_review.md");
  return (await readFile(promptPath, "utf8")).trim();
}

const reviewer = new ChatOpenAI({
  model: 'gpt-5-mini',
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 1,
});

const evaluator = new ChatOpenAI({
  model: 'gpt-5-nano',
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 1,
});

const ReviewState = Annotation.Root({
  systemPrompt: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  filePaths: Annotation<string[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  fileContents: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  gpuReview: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  suggestionEvaluation: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  finalReport: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
});

async function loadFiles(filePaths: string[]) {
  const chunks = await Promise.all(
    filePaths.map(async (filePath) => {
      const content = await readFile(filePath, "utf8");
      return `FILE: ${basename(filePath)}\nPATH: ${filePath}\n\`\`\`\n${content}\n\`\`\``;
    })
  );

  return chunks.join("\n\n");
}

async function inspectCodebaseNode(state: typeof ReviewState.State) {
  const fileContents =
    state.fileContents || (await loadFiles(state.filePaths));
  const response = await reviewer.invoke([
    {
      role: "system",
      content: state.systemPrompt,
    },
    {
      role: 'user',
      content: `Phase 1 only.

  Review this codebase for Babylon.js GPU bottlenecks.
  Identify the highest-impact GPU issues first, then separate non-GPU findings.

  Codebase:${fileContents}`,
    },
  ]);

  return {
    gpuReview: response.text,
  };
}

async function evaluateSuggestionsNode(state: typeof ReviewState.State) {
  const response = await evaluator.invoke([
    {
      role: "system",
      content: state.systemPrompt,
    },
    {
      role: 'user',
      content: `Based on: ${state.gpuReview}
      
      Now evaluate whether the suggestions for improving the codebase actually address those bottlenecks.
      Be strict and technical:
      - mark each suggestion as effective, partially effective, ineffective, or unverified
      - explain why
      - estimate likely impact on FPS, frame time, VRAM, or load time
      - point out missing Babylon.js-specific fixes
      
      Codebase:
      ${state.fileContents}
      `.trim(),
    },
  ]);
  return {
    suggestionEvaluation: response.text,
  };
}

async function finalizeNode(state: typeof ReviewState.State) {
  return {
    finalReport: `
${state.gpuReview}

---

${state.suggestionEvaluation}
    `.trim(),
  };
}

const reviewGraph = new StateGraph(ReviewState)
  .addNode("inspectCodebase", inspectCodebaseNode)
  .addNode("evaluateSuggestions", evaluateSuggestionsNode)
  .addNode("finalize", finalizeNode)
  .addEdge(START, "inspectCodebase")
  .addEdge("inspectCodebase", "evaluateSuggestions")
  .addEdge("evaluateSuggestions", "finalize")
  .addEdge("finalize", END)
  .compile();

export async function reviewAgent(filePaths: string[]) {
  const systemPrompt = await getReviewSystemPrompt();

  const result = await reviewGraph.invoke({
    systemPrompt,
    filePaths,
  });

  console.log(result.finalReport);
  return result.finalReport;
}
