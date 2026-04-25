import dotenv from 'dotenv';
import * as fs from 'fs';
import taskAgent from './src/taskAgent';


dotenv.config();

async function main() {
    const filePaths = [
        '/Users/devrajreddy/Commverse/commverse-studio-frontend/src/pages/virtual-store/components/ModelLoader.tsx',
    ];

    try {
        // Verify files exist
        for (const filePath of filePaths) {
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
        }

        // Run the agent-based refactoring task
        const analysis = await taskAgent(filePaths);
        console.log('\n--- Refactoring Complete ---');
        console.log(analysis);
    } catch (error: any) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
