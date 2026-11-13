import { parseMessages, SYSTEM, type ChatMessage } from "@/lib/chat";

const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function getMistralKeys(): string[] {
  const multi = process.env.MISTRAL_API_KEYS;
  const single = process.env.MISTRAL_API_KEY;
  const raw = [multi, single].filter(Boolean).join(",");
  const keys = raw
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 5);
  return Array.from(new Set(keys));
}

async function callMistral(key: string, model: string, messages: ChatMessage[]): Promise<Response> {
  return fetch(MISTRAL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "User-Agent": "FieldShift/1.0",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 800,
      messages: [{ role: "system", content: SYSTEM }, ...messages],
    }),
  });
}

export async function POST(req: Request) {
  const messages = parseMessages(await req.json().catch(() => null));
  if (!messages) return Response.json({ error: "bad request" }, { status: 400 });

  const mistralKeys = getMistralKeys();
  const mistralModel = process.env.MISTRAL_MODEL || "codestral-latest";

  // Attempt Mistral with automatic key rotation
  if (mistralKeys.length > 0) {
    for (let i = 0; i < mistralKeys.length; i++) {
      const key = mistralKeys[i];
      try {
        const upstream = await callMistral(key, mistralModel, messages);
        if (upstream.ok) {
          const data = await upstream.json();
          const reply = data.choices?.[0]?.message?.content;
          if (typeof reply === "string" && reply.trim()) {
            return Response.json({ reply: reply.trim() });
          }
        } else if (upstream.status === 429) {
          // Rate limited on this key: rotate to the next key if provided
          console.warn(`Mistral key #${i + 1} rate limited (429), trying next key if available...`);
          continue;
        } else {
          console.warn(`Mistral key #${i + 1} returned status ${upstream.status}`);
        }
      } catch (err) {
        console.warn(`Mistral fetch error with key #${i + 1}:`, err);
      }
    }
  }

  // Fallback to secondary provider (Groq) if configured
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const upstream = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          max_tokens: 1024,
          messages: [{ role: "system", content: SYSTEM }, ...messages],
        }),
      });
      if (upstream.ok) {
        const data = await upstream.json();
        const reply = data.choices?.[0]?.message?.content;
        if (typeof reply === "string" && reply.trim()) {
          return Response.json({ reply: reply.trim() });
        }
      }
    } catch (err) {
      console.warn("Groq fallback error:", err);
    }
  }

  return Response.json({ error: "chat service temporarily busy" }, { status: 503 });
}
