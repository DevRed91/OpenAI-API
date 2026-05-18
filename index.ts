import dotenv from 'dotenv';
import * as fs from 'fs';
import refactorAgent from './src/refactorAgent.js';
import { reviewAgent } from './src/reviewAgent.js';


dotenv.config();

async function main() {
    const filePaths = [
        'C:/Projects/Obeya_v1-experiement-office_template/Obeya_v1-experiement-office_template/src/3D/EditorLogic/SceneTransitionSystem.ts',
        'C:/Projects/Obeya_v1-experiement-office_template/Obeya_v1-experiement-office_template/src/3D/EditorLogic/editor.ts',

    ];

    try {
        // Verify files exist
        for (const filePath of filePaths) {
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
        }

        // Run the agent-based refactoring task
        const analysis = await reviewAgent(filePaths);
        console.log('\n--- Refactoring Complete ---');
        console.log(analysis);
    } catch (error: any) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
