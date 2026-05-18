import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import refactorAgent from './refactorAgent.js'; // Your existing agent logic

const server = new Server({
    name: "refactor-agent",
    version: "1.0.0",
}, {
    capabilities: { tools: {} }
});

// Register the tool so Antigravity "sees" it
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [{
        name: "deep_refactor",
        description: "Architectural refactoring using parallel preprocessing and GPT-4 synthesis.",
        inputSchema: {
            type: "object",
            properties: {
                prompt: {
                    type: "string",
                    description: "Instructions describing the changes to make across the shared files"
                },
                filePaths: {
                    type: "array",
                    items: { type: "string" },
                    description: "Absolute paths to files to refactor"
                }
            },
            required: ["prompt", "filePaths"]
        }
    }] 
}));

// Execute the taskAgent logic when called
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "deep_refactor") {
        const { prompt, filePaths } = request.params.arguments as { prompt: string, filePaths: string[] };
        try {
            const result = await refactorAgent(prompt, filePaths);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
        } catch (error: any) {
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true
            };
        }
    }
    throw new Error("Tool not found");
});

const transport = new StdioServerTransport();
await server.connect(transport);
