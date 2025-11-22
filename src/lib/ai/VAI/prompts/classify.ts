// prompts/classify.ts
export const placeholderPromptClassify = `export interface ClassifyPromptInput {
subject: string;
text: string;
tenantName: string;
}


// Classification categories for email intent
// These are essential for auto-routing, safety, and escalation.
export const EMAIL_INTENT_CATEGORIES = [
"general_query",
"pricing",
"technical_issue",
"complaint",
"refund_request",
"billing_issue",
"account_access",
"order_status",
"spam",
"sales_lead",
"requires_human" // final fallback
];


export function buildClassifyPrompt({ subject, text, tenantName }: ClassifyPromptInput) {
return `You are V-AI, the intelligent classification engine for ${tenantName}.
Your job is to analyze the user's email and classify its intent into ONE category.


--- EMAIL DATA ---
Subject: ${subject}
${text}


--- CATEGORIES ---
${EMAIL_INTENT_CATEGORIES.join(", ")}


--- RULES ---
1. Return ONLY the category name, nothing else.
2. If the email contains sensitive requests (refunds, billing, OTP, password, account deletion) → return "requires_human".
3. If it contains promotions, ads, or looks automated → return "spam".
4. If unsure → choose the safest category.


--- NOW RETURN ONLY ONE CATEGORY BELOW ---`;
}`;