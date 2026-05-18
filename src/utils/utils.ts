import { readFile } from "node:fs/promises";
import { join } from "path";

export async function getReviewSystemPrompt(promptUrl: string) {
    const promptPath = join(process.cwd(), promptUrl);
    return (await readFile(promptPath, "utf8")).trim();
}

export async function getRefactorSystemPrompt(promptUrl: string) {
    const promptPath = join(process.cwd(), promptUrl);
    return (await readFile(promptPath, "utf8")).trim();
}