import { aiRouter } from "./router";
import { callDeepseek } from "./providers/deepseek";
import { callOpenAI } from "./providers/openai";
import { callGemini } from "./providers/gemini";
import { callClaude } from "./providers/anthropic";

const drivers = {
  deepseek: callDeepseek,
  openai: callOpenAI,
  gemini: callGemini,
  claude: callClaude
};

export async function aiEngine({ tenantId, prompt }) {
  
  const sequence = await aiRouter(tenantId);  // e.g. ["deepseek", "openai"]

  for (const provider of sequence) {

    const fn = drivers[provider];

    const result = await fn(prompt);

    // SAVE LOG
    await prisma.aiLogs.create({
      data: {
        tenantId,
        provider,
        prompt,
        success: result.success,
        tokens: result.tokens ?? 0,
        error: result.error || "",
      }
    });

    if (result.success) {
      return result; // STOP here
    }
  }

  return { success: false, error: "All providers failed" };
}
