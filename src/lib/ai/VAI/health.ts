import { openaiClient } from "./openai";
import { defaultVAIConfig } from "./config";

// Basic health check
export function vaiPing() {
  return {
    status: "alive",
    ai: defaultVAIConfig.botName,
    model: defaultVAIConfig.model,
    timestamp: new Date().toISOString(),
  };
}

// Deep OpenAI model health check
export async function vaiDeepHealthCheck() {
  try {
    const res = await openaiClient.chat.completions.create({
      model: defaultVAIConfig.model,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 5,
    });

    return {
      status: "alive",
      ai: defaultVAIConfig.botName,
      model: defaultVAIConfig.model,
      success: true,
      response: res.choices[0].message.content || "ok",
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      status: "error",
      ai: defaultVAIConfig.botName,
      model: defaultVAIConfig.model,
      success: false,
      error: error?.message || "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}
