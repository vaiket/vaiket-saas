import OpenAI from "openai";

export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string,
});

// CHAT COMPLETION
export async function vaiGenerateChat(
  messages: { role: "system" | "user" | "assistant"; content: string }[]
) {
  const response = await openaiClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: 600,
  });

  return response.choices[0].message.content || "";
}

// EMBEDDINGS
export async function vaiEmbed(text: string) {
  const res = await openaiClient.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return res.data[0].embedding;
}
