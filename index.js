import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const response = await client.chat.completions.create({
    model: "gpt-5.2",
    messages: [
        { role: "system", content: "You are a helpful assistant" },
        { role: "user", content: "Explain AI in simple terms" }
    ],
});

console.log(response.choices[0].message.content);