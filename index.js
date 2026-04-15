import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import reviewAgent from "./src/reviewAgent";
import taskAgent from "./src/taskAgent";
dotenv.config();
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
    const filePaths = [
        // "/Users/devrajreddy/Commverse/commverse-studio-frontend/src/pages/virtual-store/components/CameraManager.tsx",
        "/Users/devrajreddy/Commverse/commverse-studio-frontend/src/pages/virtual-store/components/ModelLoader.tsx"
    ];

    try {
        let combinedCode = "";

        // 📥 Read files
        for (const filePath of filePaths) {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, "utf8");
                combinedCode += `\n--- FILE: ${filePath} ---\n${content}\n`;
            } else {
                console.error(`File not found: ${filePath}`);
            }
        }

        if (!combinedCode) {
            throw new Error("No code content found to review.");
        }
        taskAgent();
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main();
