import { vaiGenerateChat } from "./openai";
import { defaultVAIConfig } from "./config";

// Real-time model test for debugging and development
export async function vaiTestMessage(
  message: string = "Hello, V-AI. Are you alive?"
) {
  try {
    const reply = await vaiGenerateChat([
      { role: "system", content: defaultVAIConfig.systemPrompt },
      { role: "user", content: message },
    ]);

    return {
      ok: true,
      ai: defaultVAIConfig.botName,
      model: defaultVAIConfig.model,
      messageSent: message,
      reply,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      ok: false,
      ai: defaultVAIConfig.botName,
      model: defaultVAIConfig.model,
      error: error?.message || "Unexpected error",
      timestamp: new Date().toISOString(),
    };
  }
}

// Quick boolean test
export async function vaiIsAlive() {
  try {
    await vaiGenerateChat([{ role: "user", content: "ping" }]);
    return true;
  } catch {
    return false;
  }
}
