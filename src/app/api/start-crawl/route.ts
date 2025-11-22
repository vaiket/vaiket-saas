export async function POST(req) {
  const body = await req.json();

  const { domain, tenantId } = body;
  if (!domain) return Response.json({ error: "Domain required" }, { status: 400 });

  await fetch("http://localhost:4000/crawl/website", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: domain,
      tenantId,
      maxPages: 200,
      maxDepth: 3
    })
  });

  return Response.json({ success: true, message: "Crawling started" });
}
