// index.ts
export const placeholderIndex = `import { vaiGenerateChat, vaiEmbed } from "./openai";
import { defaultVAIConfig } from "./config";
import { buildEmailReplyPrompt } from "./prompts/email_reply";


// Generate a reply using V-AI
export async function generateReply({ subject, text, context, tenantName }: {
subject: string;
text: string;
context: string;
tenantName: string;
}) {
const prompt = buildEmailReplyPrompt({ subject, text, context, tenantName });


const messages = [
{ role: "system", content: defaultVAIConfig.systemPrompt },
{ role: "user", content: prompt },
];


return await vaiGenerateChat(messages);
}


// Get embeddings from V-AI
export async function embedText(text: string) {
return await vaiEmbed(text);
}


// Run any custom prompt
export async function runCustomPrompt(prompt: string) {
const messages = [
{ role: "system", content: defaultVAIConfig.systemPrompt },
{ role: "user", content: prompt },
];


return await vaiGenerateChat(messages);
}`;