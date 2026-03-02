// =====================================================
// AI EMAIL PROCESSOR WORKER (STABLE VERSION)
// =====================================================

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

console.log("🚀 AI Processor Worker Started...");

// =====================================================
// MAIN LOOP (RUNS FOREVER)

setInterval(() => { globalThis.ai_worker_alive = true; }, 5000);

// =====================================================

async function mainLoop() {
  try {
    console.log("⏳ Checking for pending emails...");

    const emails = await prisma.incomingEmail.findMany({
      where: { status: "pending" },
      include: { mailAccount: true },
      take: 1,
    });

    if (emails.length === 0) {
      console.log("📭 No pending emails.");
    } else {
      const email = emails[0];
      console.log("📨 Processing email:", email.id);

      await processEmail(email);
    }
  } catch (err) {
    console.error("❌ Worker error:", err);
  }

  // Run again after 10 seconds
  setTimeout(mainLoop, 10000);
}

// =====================================================
// PROCESS SINGLE EMAIL
// =====================================================

async function processEmail(email) {
  try {
    // Mark as "processing"
    await prisma.incomingEmail.update({
      where: { id: email.id },
      data: { status: "processing" }
    });

    // AI analysis
    const analysis = await analyzeEmail(email);

    // Save logs
    await prisma.mailLog.create({
      data: {
        mailAccountId: email.mailAccountId,
        incomingEmailId: email.id,
        action: analysis.action,
        response: analysis.generatedReply,
        provider: analysis.provider
      }
    });

    // Auto-reply if required
    if (analysis.action === "auto_reply") {
      console.log("📬 Sending AI auto-reply...");
      // TODO: sendEmail()
    }

    // Mark complete
    await prisma.incomingEmail.update({
      where: { id: email.id },
      data: { status: "done" }
    });

    console.log("✅ Email processed:", email.id);

  } catch (err) {
    console.error("❌ Error processing email:", err);

    // Mark failed
    await prisma.incomingEmail.update({
      where: { id: email.id },
      data: { status: "failed" }
    });
  }
}

// =====================================================
// AI ANALYSIS ENGINE
// =====================================================

async function analyzeEmail(email) {
  const prompt = `
Analyze the email and output JSON:
{
  "category": "",
  "urgency": "",
  "sentiment": "",
  "summary": "",
  "generatedReply": "",
  "action": "auto_reply|categorize|escalate|ignore"
}

EMAIL:
Subject: ${email.subject}
Body: ${email.body}
`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300
    })
  });

  const data = await res.json();
  let text = data.choices?.[0]?.message?.content || "{}";

  let parsed;
  try { parsed = JSON.parse(text); }
  catch {
    parsed = {
      category: "unknown",
      urgency: "low",
      sentiment: "neutral",
      summary: "",
      generatedReply: "",
      action: "categorize"
    };
  }

  parsed.provider = "openai";
  return parsed;
}

// Start worker
mainLoop();

const email = ... // incoming email

const chunks = await vectorSearch(email.subject + email.body);

const prompt = `
Customer wrote:

${email.body}

Relevant knowledge:
${chunks}

Your job is to reply professionally...
`;

const reply = await aiEngine({
  tenantId: email.tenantId,
  prompt
});
