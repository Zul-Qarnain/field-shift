import { parseMessages, SYSTEM } from "@/lib/chat";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-20b";

export async function POST(req: Request) {
  const messages = parseMessages(await req.json().catch(() => null));
  if (!messages) return Response.json({ error: "bad request" }, { status: 400 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return Response.json({ error: "chat unavailable" }, { status: 503 });

  try {
    const upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: "system", content: SYSTEM }, ...messages],
      }),
    });

    if (!upstream.ok) {
      return Response.json({ error: "upstream" }, { status: upstream.status === 429 ? 429 : 502 });
    }
    const data = await upstream.json();
    const reply = data.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply) {
      return Response.json({ error: "upstream" }, { status: 502 });
    }
    return Response.json({ reply });
  } catch {
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
