export async function callDeepseek(prompt) {
  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.DEEPSEEK_KEY
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const json = await res.json();

    return {
      success: true,
      reply: json.choices[0].message.content,
      tokens: json.usage?.total_tokens || 0,
      provider: "deepseek"
    };
  }
  catch (err) {
    return { success: false, error: err.message };
  }
}
