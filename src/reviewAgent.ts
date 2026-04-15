import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function reviewAgent() {
  const prompt = await client.responses.create({
    model: "gpt-5.2-pro",
    input: [
      {
        role: "system",
        content: `
Your expertise includes:
- React Three Fiber (R3F) rendering lifecycle
- Three.js / WebGL performance constraints
- GPU vs CPU bottlenecks in browser rendering
- React reconciliation and re-render costs
- VRAM usage, textures, and memory management
- Draw calls, instancing, batching
- Shader/material performance
- Scene graph optimization

Your job:
- Review the camera focusOnMesh function and check for the improvements implemented

Rules:
- Be precise and technical
- Avoid generic advice
- Clearly distinguish React vs WebGL bottlenecks
- Focus on real-world performance impact (FPS, memory, load time)
- Prefer actionable fixes with code suggestions over theory
- Call out anti-patterns specific to React Three Fiber
      `.trim(),
      },
    ],
  });

  console.log(prompt.output_text);
  return null;
}

export default reviewAgent;
