This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## WhatsApp Production Setup

Set these environment variables before enabling WhatsApp Cloud API in production:

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
APP_URL=https://your-domain.com

WHATSAPP_GRAPH_API_VERSION=v22.0
META_APP_ID=...
META_APP_SECRET=...
META_REDIRECT_URI=https://your-domain.com/api/whatsapp/connect/callback

WHATSAPP_WEBHOOK_VERIFY_TOKEN=optional-global-verify-token
WHATSAPP_WEBHOOK_APP_SECRET=optional-if-different-from-meta-app-secret
WHATSAPP_WEBHOOK_REQUIRE_SIGNATURE=true
WHATSAPP_WEBHOOK_MAX_BODY_BYTES=512000

WHATSAPP_META_TIMEOUT_MS=12000
WHATSAPP_META_MAX_RETRIES=2
```

Meta webhook callback URL:

```text
https://your-domain.com/api/whatsapp/webhook
```

Meta webhook subscription fields to enable:

- `messages`
